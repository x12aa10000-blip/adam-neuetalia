"""Security regression tests against the shop API (local mock of Supabase + real Postgres).
Run: python3 tests/security_api.py   (needs tests/mock-supabase.mjs running on :54321 and an owner 'Inhaber')"""
import json, os, random, subprocess, sys, urllib.request
API = os.environ.get('API', 'http://localhost:54321') + '/rest/v1/rpc/'
OWNER_PW = os.environ.get('OWNER_PW', 'TestPasswort123!')
R = []

def ip(): return '10.%d.%d.%d' % (random.randint(0, 255), random.randint(0, 255), random.randint(1, 254))
def call(fn, args=None, addr=None, key='sb_publishable_test'):
    req = urllib.request.Request(API + fn, data=json.dumps(args or {}).encode(), method='POST',
        headers={'Content-Type': 'application/json', 'apikey': key, 'x-test-ip': addr or ip()})
    try:
        with urllib.request.urlopen(req) as r: return 200, json.loads(r.read() or 'null')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or 'null')
        except Exception: return e.code, None
def err(res):
    if res[0] != 200 and isinstance(res[1], dict): return res[1].get('message')
    if res[0] == 200 and isinstance(res[1], dict): return res[1].get('error_code')
    return None
def check(name, sev, ok, info=''):
    R.append((name, sev, ok, info)); print(('PASS ' if ok else 'FAIL ') + f'[{sev}] {name}' + (f' – {info}' if info and not ok else ''))
def psql_anon(sql):
    p = subprocess.run(['su', 'postgres', '-c', f'psql -X -At -d shoptest -c "set role anon; {sql}"'], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr)

owner = call('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': OWNER_PW})[1]['token']
item = lambda **k: dict({'id': 'i1', 'pid': 'rosenbox-herz', 'D': {'f': {'name': 'X'}, 'opt': {}}, 'qty': 1, 'unit': 59.9, 'preview': ''}, **k)
import datetime
TODAY = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()
def order(**k):
    p = dict(name='Sec Test', email='sec@example.org', phone='0151 1111111', method='pickup', pay='vorkasse', bill={'name': 'S', 'street': 'A 1', 'zip': '20099', 'city': 'HH'},
             items=[item()], date=TODAY, lang='de', approval=False)
    p.update(k); return p

# --- database permissions ---------------------------------------------------
rc, out = psql_anon('select * from shop.admins')
check('Direct table access as API role is denied', 'Critical', 'permission denied' in out, out[:120])
rc, out = psql_anon("select shop.set_owner('x','yyyyyyyyyyyy')")
check('Internal function set_owner not callable by API role', 'Critical', 'permission denied' in out, out[:120])
rc, out = psql_anon('select * from shop.customers')
check('Customer table (password hashes) not readable', 'Critical', 'permission denied' in out, out[:120])
check('Unknown/internal RPC not exposed', 'High', call('err', {'code': 'x'})[0] == 404)
check('Request without API key rejected', 'Medium', call('shop_boot', key='')[0] == 401)

# --- price / payment tampering -----------------------------------------------
check('Changed unit price is rejected', 'Critical', err(call('shop_order_place', {'p': order(items=[item(unit=1)])})) == 'price_changed')
check('Changed expected total is rejected', 'Critical', err(call('shop_order_place', {'p': order(expectTotal=1)})) == 'price_changed')
check('Quantity 0 rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(qty=0)])})) == 'qty')
check('Negative quantity rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(qty=-3)])})) == 'qty')
check('Quantity 1000 rejected', 'Medium', err(call('shop_order_place', {'p': order(items=[item(qty=1000)])})) == 'qty')
check('Unknown product rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(pid='gibtsnicht')])})) == 'product_unavailable')
check('Gift card with 10 000 € rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(pid='gutschein', unit=10000)])})) == 'price')
check('Gift box with fake extra rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(pid='geschenkbox', unit=4.9, D={'box': {'box': 'kraft', 'size': 's', 'fill': 'shred', 'extras': {'gold': 1}}})])})) == 'price')
check('Gift box with negative extras rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(pid='geschenkbox', unit=1.4, D={'box': {'box': 'kraft', 'size': 's', 'fill': 'shred', 'extras': {'rose': -1}}})])})) == 'price')
check('Disabled payment method (Klarna) rejected', 'High', err(call('shop_order_place', {'p': order(pay='klarna')})) == 'pay')
check('Cash only allowed with pickup', 'Medium', err(call('shop_order_place', {'p': order(pay='cash', method='dhl', addr={'name': 'a', 'street': 'b 1', 'zip': '20099', 'city': 'c'})})) == 'pay')
check('Delivery date in the past rejected', 'Medium', err(call('shop_order_place', {'p': order(date='2020-01-01')})) == 'date')
check('Invalid e-mail rejected', 'Medium', err(call('shop_order_place', {'p': order(email='nope')})) == 'fields')
check('Fake preview (non-image data URL) rejected', 'High', err(call('shop_order_place', {'p': order(items=[item(preview='javascript:alert(1)')])})) == 'preview')
code, o = call('shop_order_place', {'p': order(pay='vorkasse')})
check('Valid order accepted', 'High', code == 200 and o and o['no'].startswith('AD-'), str(o)[:150])
check('Order is never marked paid by the browser', 'Critical', code == 200 and o['pay']['status'] == 'offen')
check('Server recalculated totals (59,90)', 'Critical', code == 200 and abs(o['totals']['total'] - 59.9) < 0.001)
NO = o['no'] if code == 200 else 'AD-0'

# --- injection / stored XSS --------------------------------------------------
sqli = "Robert'); drop table shop.items;--"
code, o2 = call('shop_order_place', {'p': order(name=sqli, note='<img src=x onerror=alert(1)>')})
check('SQL injection text stored literally, tables intact', 'Critical', code == 200 and o2['cust']['name'] == sqli and call('shop_order_get', {'p_no': o2['no'], 'p_email': 'sec@example.org'})[0] == 200)
check('Control characters removed from input', 'Low', code == 200 and '‮' not in call('shop_order_place', {'p': order(name='A‮B')})[1]['cust']['name'])

# --- access to other people's data (IDOR) -------------------------------------
check('Order not visible with wrong e-mail', 'Critical', call('shop_order_get', {'p_no': NO, 'p_email': 'attacker@example.org'})[1] is None)
check('Order visible with right e-mail', 'High', (call('shop_order_get', {'p_no': NO, 'p_email': 'SEC@example.org'})[1] or {}).get('no') == NO)
check('Internal notes never sent to customers', 'High', 'notes' not in (call('shop_order_get', {'p_no': NO, 'p_email': 'sec@example.org'})[1] or {'notes': 1}))
check('Order via approval link needs the real token', 'Critical', call('shop_order_by_token', {'p_no': NO, 'p_token': 'a' * 64})[1] is None)
check('Approve with wrong token fails', 'High', err(call('shop_order_approve', {'p_no': NO, 'p_token': 'b' * 64, 'p_idx': 0, 'p_ok': True, 'p_msg': ''})) == 'not_found')
check('Cancel someone else\'s order fails', 'High', err(call('shop_order_cancel', {'p_no': NO, 'p_email': 'x@example.org'})) == 'not_found')
check('Complaint on someone else\'s order fails', 'Medium', err(call('shop_order_complaint', {'p_no': NO, 'p_email': 'x@example.org', 'p_text': 'hi'})) == 'not_found')

# --- admin area ---------------------------------------------------------------
check('Admin data without token denied', 'Critical', err(call('shop_admin_pull', {'p_token': None, 'p_since': 0})) == 'auth')
check('Admin data with random token denied', 'Critical', err(call('shop_admin_pull', {'p_token': 'f' * 64, 'p_since': 0})) == 'auth')
c = call('shop_cust_register', {'p_name': 'Kunde', 'p_email': f'k{random.randint(1,10**9)}@example.org', 'p_phone': '', 'p_pw': 'KundePass99', 'p_marketing': False})
ctok = c[1]['token'] if c[0] == 200 else None
check('Customer token cannot open admin', 'Critical', ctok and err(call('shop_admin_pull', {'p_token': ctok, 'p_since': 0})) == 'auth')
check('Customer cannot push admin data', 'Critical', err(call('shop_admin_push', {'p_token': ctok, 'p_kv': {'settings': {}}, 'p_items': []})) == 'auth')
call('shop_admin_user_set', {'p_token': owner, 'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1', 'p_role': 'staff', 'p_delete': False})
staff = call('shop_admin_login', {'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1'})[1]['token']
check('Staff cannot change prices/settings', 'High', err(call('shop_admin_push', {'p_token': staff, 'p_kv': {'prices': {}}, 'p_items': []})) == 'forbidden')
check('Staff cannot create gift cards', 'High', err(call('shop_admin_push', {'p_token': staff, 'p_kv': {}, 'p_items': [{'kind': 'giftcard', 'id': 'GS-X', 'data': {'balance': 999}}]})) == 'forbidden')
check('Staff cannot see customers list', 'Medium', call('shop_admin_pull', {'p_token': staff, 'p_since': 0})[1]['customers'] == [])
check('Staff cannot manage team', 'High', err(call('shop_admin_users', {'p_token': staff})) == 'forbidden')
check('Unknown data type cannot be written', 'High', err(call('shop_admin_push', {'p_token': owner, 'p_kv': {'evil': 1}, 'p_items': []})) == 'forbidden')
check('Short admin password refused', 'Medium', err(call('shop_admin_user_set', {'p_token': owner, 'p_user': 'neu', 'p_pw': '123', 'p_role': 'staff', 'p_delete': False})) == 'pw_short')
check('Admin pull never contains password hashes', 'Critical', 'pw_hash' not in json.dumps(call('shop_admin_pull', {'p_token': owner, 'p_since': 0})[1]) and '$2a$' not in json.dumps(call('shop_admin_pull', {'p_token': owner, 'p_since': 0})[1]))
check('Admin mail only to e-mails of that order (no spam relay)', 'High', err(call('shop_admin_mail', {'p_token': owner, 'p_no': NO, 'p_to': 'victim@example.org', 'p_subject': 's', 'p_html': 'h', 'p_kind': 'x'})) == 'forbidden')
lo = call('shop_admin_login', {'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1'})[1]['token']
call('shop_admin_logout', {'p_token': lo})
check('Logged-out admin token no longer works', 'High', err(call('shop_admin_pull', {'p_token': lo, 'p_since': 0})) == 'auth')
call('shop_admin_user_set', {'p_token': owner, 'p_user': 'Werkstatt', 'p_pw': None, 'p_role': 'staff', 'p_delete': True})
check('Removed team member\'s session ends immediately', 'High', err(call('shop_admin_pull', {'p_token': staff, 'p_since': 0})) == 'auth')

# --- brute force / rate limits --------------------------------------------------
a = ip(); codes = [err(call('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': 'x%d' % i}, a)) for i in range(12)]
check('Admin password guessing blocked after 10 tries', 'Critical', 'rate_limited' in codes, str(codes[-3:]))
codes = [err(call('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': 'y%d' % i})) for i in range(10)]
check('Guessing from many IPs still blocked per account', 'High', 'rate_limited' in codes, str(codes[-3:]))
a = ip(); codes = [err(call('shop_coupon_check', {'p_code': 'TRY%d' % i, 'p_sub': 100}, a)) for i in range(15)]
check('Coupon code guessing limited', 'Medium', 'rate_limited' in codes)
a = ip(); codes = [err(call('shop_order_get', {'p_no': 'AD-%d' % (10000 + i), 'p_email': 'x@y.de'}, a)) for i in range(25)]
check('Order number scanning limited', 'Medium', 'rate_limited' in codes)

# --- customer accounts -----------------------------------------------------------
a = ip(); codes = [err(call('shop_cust_login', {'p_email': 'sec@example.org', 'p_pw': 'z%d' % i}, a)) for i in range(12)]
check('Customer password guessing blocked', 'High', 'rate_limited' in codes, str(codes[-3:]))
a = ip(); codes = [err(call('shop_order_cancel', {'p_no': NO, 'p_email': 'g%d@x.de' % i}, a)) for i in range(12)]
check('E-mail guessing via cancel limited', 'Medium', 'rate_limited' in codes, str(codes[-3:]))
check('Customer password < 8 chars refused', 'Medium', err(call('shop_cust_register', {'p_name': 'a', 'p_email': 'short@example.org', 'p_phone': '', 'p_pw': '1234567', 'p_marketing': False})) == 'pw_short')
me = call('shop_cust_update', {'p_token': ctok, 'p_patch': {'email': 'boss@example.org', 'id': 'c0', 'pw': 'x', 'name': 'Neu'}})[1]
check('Customer cannot change own e-mail/id/password via profile update', 'High', me and me['email'] != 'boss@example.org' and me['id'] != 'c0' and me['name'] == 'Neu')
check('Account deletion requires valid session', 'High', err(call('shop_cust_delete', {'p_token': 'e' * 64, 'p_pw': None})) == 'auth')

# --- uploads -----------------------------------------------------------------------
check('Photo upload with guessable id refused', 'High', err(call('shop_photo_put', {'p_id': 'idb:ph1', 'p_mime': 'image/jpeg', 'p_data': 'AAAA'})) == 'bad_id')
check('Photo upload of non-image type refused', 'High', err(call('shop_photo_put', {'p_id': 'idb:ph' + 'a' * 30, 'p_mime': 'text/html', 'p_data': 'AAAA'})) == 'bad_type')
check('Photo upload with non-base64 data refused', 'High', err(call('shop_photo_put', {'p_id': 'idb:ph' + 'b' * 30, 'p_mime': 'image/png', 'p_data': '<script>'})) == 'too_big')
check('Path-like photo id refused', 'Medium', err(call('shop_photo_put', {'p_id': 'idb:ph../../etc/passwd', 'p_mime': 'image/png', 'p_data': 'AAAA'})) == 'bad_id')
call('shop_admin_photo_put', {'p_token': owner, 'p_id': 'idb:priv1', 'p_mime': 'image/png', 'p_data': 'AAAA'})
check('Public shop image readable', 'Low', call('shop_photo_get', {'p_id': 'idb:priv1'})[1] is not None)

# --- public data -----------------------------------------------------------------------
boot = call('shop_boot')[1]
check('Public start data has no staff, secrets or e-mails', 'High', 'staff' not in boot['settings'] and 'mail' not in boot['settings'] and '@example' not in json.dumps(boot['reviews'] + boot['questions']))

fails = [r for r in R if not r[2]]
print(f"\n{len(R) - len(fails)} PASS, {len(fails)} FAIL")
json.dump([{'test': n, 'severity': s, 'result': 'PASS' if ok else 'FAIL'} for n, s, ok, _ in R], open(os.path.join(os.path.dirname(__file__), 'security_results.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(1 if fails else 0)
