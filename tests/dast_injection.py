"""DAST (local only, synthetic data): stored HTML/script injection.
Every customer-controllable field gets a payload with a unique marker. Then every owner and customer view is rendered
and checked for (a) marker elements that became real DOM nodes, (b) executed script (window.__xss), (c) CSP violations."""
import asyncio, json, os, random, urllib.request, datetime
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780'); API = 'http://localhost:54321/rest/v1/rpc/'
def api(fn, args):
    req = urllib.request.Request(API + fn, data=json.dumps(args).encode(), method='POST', headers={'apikey': 'x', 'Content-Type': 'application/json', 'x-test-ip': '10.77.%d.%d' % (random.randint(0, 255), random.randint(1, 250))})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or 'null')
    except urllib.error.HTTPError as e: return {'http': e.code, 'body': e.read().decode()[:300]}
def P(tag):  # payload: breaks out of attributes and text, creates a marker element and tries to run script
    return f'"\'><b data-xp="{tag}">X</b><img src=x data-xp="{tag}" onerror="window.__xss=\'{tag}\'"><svg/onload=window.__xss=1>'
D = (datetime.date.today() + datetime.timedelta(days=4)).isoformat()
EMAIL = f'xss{random.randint(1, 10**7)}@example.org'
owner = api('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': os.environ.get('OWNER_PW', 'TestPasswort123!')})['token']
fields = {}
# 1) order with payloads in every free-text field (+ approval requested)
pid = 'rosenbox-herz'
item = {'id': 'i1', 'pid': pid, 'D': {'f': {'name': P('design-text')}, 'opt': {}, 'font': {}, 'color': {}, 'size': {}, 'ph': {}}, 'qty': 1, 'unit': 59.9, 'preview': '', 'needsApproval': True}
gift = {'id': 'i2', 'pid': 'gutschein', 'D': {'f': {'to': P('gc-to'), 'toEmail': 'friend@example.org', 'from': P('gc-from'), 'msg': P('gc-msg')}, 'font': {}, 'color': {}, 'size': {}, 'ph': {}, 'opt': {}}, 'qty': 1, 'unit': 25, 'preview': ''}
order = {'name': P('cust-name'), 'email': EMAIL, 'phone': '0151 123456 ' + P('phone')[:60], 'method': 'local', 'pay': 'vorkasse',
         'addr': {'name': P('addr-name'), 'street': P('street'), 'zip': '20099', 'city': P('city')}, 'bill': {'name': P('bill-name'), 'street': P('bill-street'), 'zip': '20099', 'city': 'HH'},
         'date': D, 'window': P('window'), 'recipient': P('recipient'), 'isGift': True, 'card': P('greeting-card'), 'wrap': True, 'note': P('order-note'),
         'approval': True, 'lang': 'de', 'items': [item, gift], 'store': {'name': P('store')}}
o = api('shop_order_place', {'p': order})
print('order placed:', o.get('no') if isinstance(o, dict) else o)
NO = o['no']; tok = next(i['approval']['token'] for i in o['items'] if i.get('approval'))
api('shop_order_approve', {'p_no': NO, 'p_token': tok, 'p_idx': 0, 'p_ok': False, 'p_msg': P('approval-comment')})
api('shop_order_complaint', {'p_no': NO, 'p_email': EMAIL, 'p_text': P('complaint')})
api('shop_review_add', {'p_pid': pid, 'p_stars': 5, 'p_name': P('review-name'), 'p_text': P('review-text')})
api('shop_question_add', {'p_pid': pid, 'p_text': P('question'), 'p_email': '', 'p_lang': 'de'})
reg = api('shop_cust_register', {'p_name': P('account-name'), 'p_email': 'acc' + EMAIL, 'p_phone': P('acc-phone')[:40], 'p_pw': 'Synthetic-Pass-77', 'p_marketing': False})
ctok = reg.get('token')
api('shop_cust_update', {'p_token': ctok, 'p_patch': {'addresses': [{'name': P('saved-addr'), 'street': P('saved-street'), 'zip': '1', 'city': 'x'}]}})
# owner approves the review and answers the question so they become public
pull = api('shop_admin_pull', {'p_token': owner, 'p_since': 0})
items = []
for it in pull['items']:
    if it['kind'] == 'review' and 'review-text' in json.dumps(it['data']): d = dict(it['data'], ok=True); items.append({'kind': 'review', 'id': it['id'], 'data': d})
    if it['kind'] == 'question' and 'data-xp' in json.dumps(it['data']): d = dict(it['data'], answer='Antwort'); items.append({'kind': 'question', 'id': it['id'], 'data': d})
api('shop_admin_push', {'p_token': owner, 'p_kv': {}, 'p_items': items})

CHECK = """() => ({ shown: (document.body.innerText.match(/data-xp="([a-z-]+)"/g) || []).length, tags: [...new Set((document.body.innerText.match(/data-xp="([a-z-]+)"/g) || []).map(x => x.slice(9, -1)))], nodes: Array.from(document.querySelectorAll('[data-xp]')).map(e => e.getAttribute('data-xp') + ':' + e.tagName), xss: window.__xss || null })"""
async def main():
    found = []; csp = []; pages = 0; shown = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        async def visit(p, url, label):
            nonlocal pages
            await p.goto(url); await p.wait_for_timeout(1300)
            if '/konto' in url: await p.reload(); await p.wait_for_timeout(1500)
            for d in await p.query_selector_all('details'): await d.evaluate('e => e.open = true')
            await p.wait_for_timeout(300); pages += 1
            r = await p.evaluate(CHECK)
            shown.append((label, r['shown'], r['tags']))
            if r['nodes'] or r['xss']: found.append({'page': label, **r})
        # owner views
        a = await (await b.new_context(viewport={'width': 1280, 'height': 900})).new_page()
        a.on('console', lambda m: csp.append(m.text[:120]) if 'Content Security Policy' in m.text else None)
        await a.goto(WEB + '/admin.html#/admin'); await a.wait_for_selector('[name=user]')
        await a.fill('[name=user]', 'Inhaber'); await a.fill('[name=pw]', os.environ.get('OWNER_PW', 'TestPasswort123!')); await a.click('form button'); await a.wait_for_timeout(2500)
        cid = reg['me']['id'] if reg.get('me') else ''
        for r in ['', '/bestellungen', f'/o/{NO}', '/produktion', '/versand', '/kunden', f'/kunden/{cid}', '/bewertungen', '/emails', '/aktivitaet', '/rabatte']:
            await visit(a, WEB + '/admin.html#/admin' + r, 'admin' + (r or '/'))
        # customer views (fresh device)
        c = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        c.on('console', lambda m: csp.append(m.text[:120]) if 'Content Security Policy' in m.text else None)
        for url, label in [(f'/index.html#/verfolgen/{NO}?e={EMAIL}', 'tracking'), (f'/index.html#/freigabe/{NO}/{tok}', 'approval page'), (f'/index.html#/p/{pid}', 'product page (reviews/questions)')]:
            await visit(c, WEB + url, label)
        await c.evaluate("(t) => { localStorage.setItem('an2:session', JSON.stringify({ token: t, at: Date.now() })); }", ctok)
        await c.goto(WEB + '/index.html#/konto'); await c.reload(); await c.wait_for_timeout(1500)
        for r in ['/konto/bestellungen', '/konto/adressen', '/konto/profil', '/kasse']:
            await visit(c, WEB + '/index.html#' + r, 'account' + r)
        await b.close()
    for l, n, tg in shown: print(f'  {l:34} payloads shown as text: {n:3}  {", ".join(tg)[:110]}')
    allt = set(t for _, _, tg in shown for t in tg); print('  distinct payload fields seen escaped:', len(allt), sorted(allt))
    print(json.dumps({'pages_checked': pages, 'injections_rendered_as_html': found, 'csp_blocks': csp[:5]}, indent=1, ensure_ascii=False))
    print('RESULT:', 'FAIL' if found else 'PASS')
asyncio.run(main())
