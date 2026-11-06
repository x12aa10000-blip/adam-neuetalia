"""Browser flow: order with PayPal -> server-created PayPal order -> server capture -> order paid. (PayPal SDK replaced by a minimal stub button.)"""
import asyncio, json, random, urllib.request
from playwright.async_api import async_playwright
import os
WEB = os.environ.get('WEB', 'http://localhost:8780'); API = 'http://localhost:54321/rest/v1/rpc/'
def api(fn, a):
    r = urllib.request.Request(API + fn, data=json.dumps(a).encode(), method='POST', headers={'apikey': 'x', 'Content-Type': 'application/json', 'x-test-ip': '10.55.%d.%d' % (random.randint(0, 255), random.randint(1, 250))})
    with urllib.request.urlopen(r) as x: return json.loads(x.read() or 'null')
SDK = """window.paypal = { FUNDING: { CARD: 'card' }, Buttons(o) { return { render(el) { const b = document.createElement('button'); b.id = 'ppStub'; b.textContent = 'PayPal (Test)';
  b.onclick = async () => { const id = await o.createOrder(); window.__ppId = id; await o.onApprove({ orderID: id }); }; el.appendChild(b); } }; } };"""
R = []
def ok(n, c, i=''): R.append(c); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(i)[:200]))
async def main():
    owner = api('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': 'TestPasswort123!'})['token']
    s = api('shop_admin_pull', {'p_token': owner, 'p_since': 0})['kv']['settings']
    s['payments'].update({'paypal': True}); s['paypal'] = {'clientId': 'test-client'}
    api('shop_admin_push', {'p_token': owner, 'p_kv': {'settings': s}, 'p_items': []})
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
            c = await b.new_context(viewport={'width': 390, 'height': 844})
            await c.add_init_script("try{localStorage.setItem('an2:cookies', JSON.stringify('min'))}catch(e){}")
            await c.route('https://www.paypal.com/sdk/js**', lambda r: r.fulfill(status=200, content_type='text/javascript', body=SDK))
            await c.route('http://localhost:54321/functions/v1/**', lambda r: asyncio.ensure_future(fwd(r)))
            async def fwd(r):
                resp = await r.fetch(url=r.request.url.replace('54321', '54323')); await r.fulfill(response=resp)
            p = await c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
            for run in (1, 2):
                await p.goto(WEB + '/index.html#/p/rosenbox-herz'); await p.wait_for_timeout(1800)
                for f in await p.locator('input[data-field]').all():
                    if await f.is_visible(): await f.fill('Pay')
                await p.locator('[data-act=add]:visible').first.click(); await p.wait_for_timeout(1200)
                await p.goto(WEB + '/index.html#/kasse'); await p.wait_for_timeout(1500)
                await p.locator('[data-co=method][value=pickup]').first.check(force=True); await p.wait_for_timeout(300)
                email = f'paypal{random.randint(1, 10**8)}@example.org'
                for k, v in {'name': 'Paula Pay', 'email': email, 'phone': '0151 7654321', 'bill.name': 'Paula Pay', 'bill.street': 'Weg 1', 'bill.zip': '20099', 'bill.city': 'Hamburg'}.items():
                    el = p.locator(f'[data-co="{k}"]').first
                    if await el.count() and await el.is_visible(): await el.fill(v)
                await p.locator('[data-co=pay][value=paypal]').first.check(force=True)
                await p.locator('[data-co=agb]').first.check(force=True); await p.wait_for_timeout(300)
                await p.locator('[data-act=place]').first.click(); await p.wait_for_timeout(3000)
                no = p.url.split('/danke/')[-1] if '/danke/' in p.url else None
                ok(f'[{run}] order saved before payment (status unpaid)', no and api('shop_order_get', {'p_no': no, 'p_email': email})['pay']['status'] == 'offen', p.url)
                if run == 2:  # customer closes PayPal, pays later from tracking
                    await p.locator('.ov [data-act=close]').first.click(); await p.wait_for_timeout(500)
                    await p.goto(WEB + f'/index.html#/verfolgen/{no}?e={email}'); await p.wait_for_timeout(2000)
                    ok('[2] tracking page offers "pay now"', await p.locator('[data-pp-pay]').count() == 1)
                    await p.locator('[data-pp-pay]').first.click(); await p.wait_for_timeout(1500)
                await p.locator('#ppStub').click(); await p.wait_for_timeout(2500)
                st = api('shop_order_get', {'p_no': no, 'p_email': email})['pay']
                ok(f'[{run}] after PayPal approval the server verified and marked paid', st['status'] == 'bezahlt' and st.get('verified') == 'paypal-server', st)
                await p.wait_for_timeout(500)
                ok(f'[{run}] "pay now" disappears once paid', await p.locator('[data-pp-pay]').count() == 0)
            ok('no JavaScript errors', not errs, errs)
            await b.close()
    finally:
        s['payments'].update({'paypal': False}); s['paypal'] = {'clientId': ''}
        api('shop_admin_push', {'p_token': owner, 'p_kv': {'settings': s}, 'p_items': []})
    print(f"\n{sum(R)} PASS, {len(R) - sum(R)} FAIL")
asyncio.run(main())
