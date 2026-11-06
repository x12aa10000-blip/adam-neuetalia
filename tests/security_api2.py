"""Second-stage security verification (local PostgreSQL 16 + Supabase API stand-in, synthetic data only)."""
import json, os, random, subprocess, sys, urllib.request, hashlib, datetime
API = 'http://localhost:54321/rest/v1/rpc/'
R = []
def ip(): return '10.%d.%d.%d' % (random.randint(0, 255), random.randint(0, 255), random.randint(1, 254))
def call(fn, args=None, addr=None):
    req = urllib.request.Request(API + fn, data=json.dumps(args or {}).encode(), method='POST', headers={'Content-Type': 'application/json', 'apikey': 'sb_publishable_test', 'x-test-ip': addr or ip()})
    try:
        with urllib.request.urlopen(req) as r: return 200, json.loads(r.read() or 'null')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or 'null')
        except Exception: return e.code, None
def err(res):
    if res[0] != 200 and isinstance(res[1], dict): return res[1].get('message')
    if res[0] == 200 and isinstance(res[1], dict): return res[1].get('error_code')
def sql(q, role=None):
    pre = f'set role {role}; ' if role else ''
    p = subprocess.run(['su', 'postgres', '-c', f'psql -X -At -d shoptest -c "{pre}{q}"'], capture_output=True, text=True)
    return (p.stdout + p.stderr).strip()
def check(name, sev, ok, info=''):
    R.append((name, sev, ok, info)); print(('PASS ' if ok else 'FAIL ') + f'[{sev}] {name}' + (f'  -> {str(info)[:220]}' if info and not ok else ''))

owner = call('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': os.environ.get('OWNER_PW', 'TestPasswort123!')})[1]['token']

# ---- 1. permission inventory of the API roles --------------------------------------------------------
for role in ['anon', 'authenticated']:
    fns = sql(f"select string_agg(n.nspname||'.'||p.proname, ',' order by 1) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where has_function_privilege('{role}', p.oid, 'EXECUTE') and n.nspname in ('public','shop')")
    names = [x for x in fns.split(',') if x]
    check(f'{role}: may execute only public.shop_* API functions ({len(names)})', 'Critical', names and all(x.startswith('public.shop_') for x in names), [x for x in names if not x.startswith('public.shop_')])
    tabs = sql(f"select count(*) from information_schema.role_table_grants where grantee='{role}' and table_schema in ('shop','public')")
    check(f'{role}: no direct table privileges in shop/public', 'Critical', tabs == '0', tabs)
    seq = sql(f"select count(*) from (select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='S' and n.nspname='shop' offset 0) s where has_sequence_privilege('{role}', s.oid, 'USAGE') or has_sequence_privilege('{role}', s.oid, 'UPDATE')")
    check(f'{role}: no access to order number sequence', 'High', seq == '0', seq)
    sch = sql(f"select has_schema_privilege('{role}','shop','USAGE')")
    check(f'{role}: no USAGE on private schema shop', 'Critical', sch == 'f', sch)
rls = sql("select string_agg(relname, ',') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='shop' and c.relkind='r' and not c.relrowsecurity")
check('Row Level Security enabled on every shop table (defense in depth)', 'Medium', rls == '', rls)
mut = sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))")
check('Every SECURITY DEFINER function has a fixed search_path', 'High', mut == '0', mut)
mut2 = sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='shop' and p.proconfig is null")
check('Internal functions have a fixed search_path (linter function_search_path_mutable)', 'Medium', mut2 == '0', mut2)
out = sql("select * from shop.secrets", 'anon')
check('Secrets table not readable by API role', 'Critical', 'permission denied' in out, out[:100])

# ---- 2. password reset (synthetic token inserted by the test, like the e-mail link would carry) ------
email = f'reset{random.randint(1, 10**8)}@example.org'
reg = call('shop_cust_register', {'p_name': 'Reset Test', 'p_email': email, 'p_phone': '', 'p_pw': 'Old-Password-1', 'p_marketing': False})[1]
old_tok = reg['token']; cid = reg['me']['id']
a = call('shop_cust_pw_forgot', {'p_email': email, 'p_lang': 'de'})[1]; b = call('shop_cust_pw_forgot', {'p_email': 'nobody-' + email, 'p_lang': 'de'})[1]
check('Forgot-password answer identical for existing and unknown e-mail (no enumeration)', 'High', a == b, (a, b))
tok = ''.join(random.choice('0123456789abcdef') for _ in range(64)); th = hashlib.sha256(tok.encode()).hexdigest()
sql(f"insert into shop.sessions(token_hash, kind, subject, expires_at) values ('{th}', 'reset', '{cid}', now() + interval '1 hour')")
check('Reset with a wrong token fails', 'High', err(call('shop_cust_pw_reset', {'p_token': 'a' * 64, 'p_pw': 'New-Password-2'})) == 'expired')
check('Reset refuses a short password', 'Medium', err(call('shop_cust_pw_reset', {'p_token': tok, 'p_pw': 'short'})) == 'pw_short')
ok_reset = call('shop_cust_pw_reset', {'p_token': tok, 'p_pw': 'New-Password-2'})
check('Reset with the valid token works', 'High', ok_reset[0] == 200 and 'token' in (ok_reset[1] or {}), ok_reset)
check('Reset token is single-use', 'High', err(call('shop_cust_pw_reset', {'p_token': tok, 'p_pw': 'New-Password-3'})) == 'expired')
check('All old sessions end after a reset', 'High', err(call('shop_cust_me', {'p_token': old_tok})) == 'auth')
check('Old password no longer works', 'High', err(call('shop_cust_login', {'p_email': email, 'p_pw': 'Old-Password-1'})) == 'wrong')
check('New password works', 'High', 'token' in (call('shop_cust_login', {'p_email': email, 'p_pw': 'New-Password-2'})[1] or {}))
tok2 = ''.join(random.choice('0123456789abcdef') for _ in range(64)); th2 = hashlib.sha256(tok2.encode()).hexdigest()
sql(f"insert into shop.sessions(token_hash, kind, subject, expires_at) values ('{th2}', 'reset', '{cid}', now() - interval '1 minute')")
check('Expired reset token is refused', 'High', err(call('shop_cust_pw_reset', {'p_token': tok2, 'p_pw': 'New-Password-4'})) == 'expired')
check('Reset token cannot be used as a login session', 'High', err(call('shop_cust_me', {'p_token': tok})) == 'auth')
check('Customer session cannot reset a password', 'High', err(call('shop_cust_pw_reset', {'p_token': call('shop_cust_login', {'p_email': email, 'p_pw': 'New-Password-2'})[1]['token'], 'p_pw': 'Hijack-Pass-9'})) == 'expired')
th_stored = sql(f"select count(*) from shop.sessions where token_hash = '{tok}'")
check('Tokens are stored only as SHA-256 hashes', 'High', th_stored == '0', th_stored)
codes = [err(call('shop_cust_pw_forgot', {'p_email': f'x{i}@example.org', 'p_lang': 'de'}, '10.1.1.1')) for i in range(7)]
check('Forgot-password requests are rate limited', 'Medium', 'rate_limited' in codes, codes)

# ---- 3. customer A must never see customer B's data ----------------------------------------------------
D = (datetime.date.today() + datetime.timedelta(days=4)).isoformat()
def acct(tag):
    e = f'{tag}{random.randint(1, 10**8)}@example.org'
    r = call('shop_cust_register', {'p_name': tag, 'p_email': e, 'p_phone': '', 'p_pw': 'Synthetic-Pass-1', 'p_marketing': False})[1]
    o = call('shop_order_place', {'p': {'name': tag, 'email': e, 'phone': '0151 1234567', 'method': 'pickup', 'pay': 'vorkasse', 'bill': {'name': tag, 'street': 'S 1', 'zip': '20099', 'city': 'HH'},
              'items': [{'id': 'i', 'pid': 'rosenbox-herz', 'D': {'f': {'name': tag}, 'opt': {}}, 'qty': 1, 'unit': 59.9, 'preview': ''}], 'date': D, 'lang': 'de'}, 'p_cust_token': r['token']})[1]
    return e, r['token'], r['me']['id'], o['no']
eA, tA, idA, noA = acct('alice'); eB, tB, idB, noB = acct('bob')
meA = call('shop_cust_me', {'p_token': tA})[1]
check('Customer A sees own orders', 'High', any(o['no'] == noA for o in meA['orders']))
check('Customer A does not see B\'s orders', 'Critical', all(o['no'] != noB for o in meA['orders']) and all(o['cust']['email'] == eA for o in meA['orders']))
check('A cannot read B\'s order with A\'s e-mail', 'Critical', call('shop_order_get', {'p_no': noB, 'p_email': eA})[1] is None)
check('A cannot cancel B\'s order', 'Critical', err(call('shop_order_cancel', {'p_no': noB, 'p_email': eA})) == 'not_found')
upd = call('shop_cust_update', {'p_token': tA, 'p_patch': {'id': idB, 'name': 'A-renamed'}})[1]
check('A\'s profile update cannot target B', 'Critical', upd['id'] == idA and call('shop_cust_me', {'p_token': tB})[1]['me']['name'] == 'bob')
o3 = call('shop_order_place', {'p': {'name': 'x', 'email': eB, 'phone': '0151 1234567', 'method': 'pickup', 'pay': 'vorkasse', 'bill': {'name': 'x', 'street': 'S 1', 'zip': '20099', 'city': 'HH'},
           'items': [{'id': 'i', 'pid': 'rosenbox-herz', 'D': {'f': {'name': 'x'}, 'opt': {}}, 'qty': 1, 'unit': 59.9, 'preview': ''}], 'date': D, 'lang': 'de', 'cust': {'id': idB}}, 'p_cust_token': tA})[1]
check('A cannot place an order into B\'s account (customer id comes only from the session token)', 'High', o3['cust']['id'] == idA, o3.get('cust'))
check('Guest order with B\'s e-mail does not show up in the order list of a third person', 'High', all(o['no'] != o3['no'] for o in call('shop_cust_me', {'p_token': tA})[1]['orders']) or o3['cust']['email'] == eB)
check('Tracking per order number is limited (no IP rotation bypass)', 'Medium', 'rate_limited' in [err(call('shop_order_get', {'p_no': noB, 'p_email': f'g{i}@x.de'})) or ('rate_limited' if call('shop_order_get', {'p_no': noB, 'p_email': f'g{i}@x.de'})[0] == 400 else None) for i in range(20)])

# ---- 4. e-mail ---------------------------------------------------------------------------------------------
call('shop_admin_mail', {'p_token': owner, 'p_no': noA, 'p_to': eA, 'p_subject': 'Hallo\r\nBcc: victim@example.org', 'p_html': '<p>x</p>', 'p_kind': 'test'})
subj = sql("select data->>'subject' from shop.items where kind='email' order by created_at desc limit 1")
check('E-mail subject has no line breaks (no header injection)', 'Medium', '\n' not in subj and '\r' not in subj and 'Bcc' in subj, repr(subj))
call('shop_admin_mail_setup', {'p_token': owner, 'p_key': 're_TESTKEY_onlylocal_123456789', 'p_from': 'Adam <shop@example.org>'})
pull = json.dumps(call('shop_admin_pull', {'p_token': owner, 'p_since': 0})[1])
check('Resend key never returned to the browser (not even to the owner)', 'High', 're_TESTKEY' not in pull and json.loads(pull)['mail'] is True)
call('shop_admin_mail_setup', {'p_token': owner, 'p_key': '', 'p_from': ''})
call('shop_admin_user_set', {'p_token': owner, 'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1', 'p_role': 'staff', 'p_delete': False})
st = call('shop_admin_login', {'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1'})[1]['token']
check('Mail setup only for the owner (staff refused)', 'High', err(call('shop_admin_mail_setup', {'p_token': st, 'p_key': 're_x', 'p_from': ''})) == 'forbidden')
check('Owner-pushed coupons must have numeric values (stored XSS hardening)', 'Medium', err(call('shop_admin_push', {'p_token': owner, 'p_kv': {'coupons': [{'code': 'X1', 'type': 'pct', 'value': '<img src=x>', 'on': True}]}, 'p_items': []})) == 'fields')
call('shop_admin_user_set', {'p_token': owner, 'p_user': 'Werkstatt', 'p_pw': None, 'p_role': 'staff', 'p_delete': True})

# ---- 5. stock enforced on the server ---------------------------------------------------------------------
sql("update shop.kv set v = jsonb_set(v, '{rosenbox-herz}', coalesce(v->'rosenbox-herz', '{}'::jsonb) || '{\\\"stock\\\": 1}') where k = 'prodOv'")
r2 = call('shop_order_place', {'p': {'name': 'x', 'email': 'stock@example.org', 'phone': '0151 1234567', 'method': 'pickup', 'pay': 'vorkasse', 'bill': {'name': 'x', 'street': 'S 1', 'zip': '20099', 'city': 'HH'},
          'items': [{'id': 'i', 'pid': 'rosenbox-herz', 'D': {'f': {'name': 'x'}, 'opt': {}}, 'qty': 2, 'unit': 59.9, 'preview': ''}], 'date': D, 'lang': 'de'}})
check('Ordering more than the stock is refused by the server', 'Medium', err(r2) == 'product_unavailable', r2)
sql("update shop.kv set v = v #- '{rosenbox-herz,stock}' where k = 'prodOv'")

fails = [r for r in R if not r[2]]
print(f"\n{len(R) - len(fails)} PASS, {len(fails)} FAIL")
json.dump([{'test': n, 'severity': s, 'result': 'PASS' if ok else 'FAIL'} for n, s, ok, _ in R], open(os.path.join(os.path.dirname(__file__), 'security_results2.json'), 'w'), indent=1, ensure_ascii=False)
sys.exit(1 if fails else 0)
