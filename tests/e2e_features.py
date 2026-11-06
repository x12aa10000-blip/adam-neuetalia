"""New features from the client's list: coupon usage limit, German address fields + postcode suggestions,
digital products without shipping, payment mail with invoice. Runs against the local server stand-in."""
import asyncio, json, os, random, subprocess, urllib.request
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780'); API = 'http://localhost:54321/rest/v1/rpc/'
R = []
def ok(name, cond, info=''): R.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(info)[:200]))
def api(fn, args):
    req = urllib.request.Request(API + fn, data=json.dumps(args).encode(), method='POST', headers={'apikey': 'x', 'Content-Type': 'application/json', 'x-test-ip': '10.9.%d.%d' % (random.randint(0, 255), random.randint(1, 250))})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or 'null')
    except urllib.error.HTTPError as e: return {'http': e.code, 'body': e.read().decode()[:200]}
async def page(b, w=390, h=844):
    c = await b.new_context(viewport={'width': w, 'height': h}, locale='de-DE')
    await c.add_init_script("try{localStorage.setItem('an2:cookies', JSON.stringify('min'))}catch(e){}")
    p = await c.new_page(); p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)[:200]))
    return p
async def toast(p):
    try: return await p.locator('.toast').last.inner_text(timeout=2500)
    except Exception: return ''
async def admin_login(b):
    a = await page(b, 1280, 900)
    await a.goto(WEB + '/admin.html#/admin'); await a.wait_for_selector('[name=user]')
    await a.fill('[name=user]', 'Inhaber'); await a.fill('[name=pw]', 'TestPasswort123!'); await a.click('form[data-aform=login] button')
    await a.wait_for_selector('.a-top', timeout=8000); await a.wait_for_timeout(1500); return a
async def fill_checkout(p, email, method='pickup', pay='vorkasse'):
    await p.goto(WEB + '/index.html#/kasse'); await p.wait_for_timeout(1500)
    await p.locator(f'[data-co=method][value={method}]').first.check(force=True); await p.wait_for_timeout(400)
    vals = {'name': 'Erika Muster', 'email': email, 'phone': '0151 2345678', 'bill.name': 'Erika Muster', 'bill.street': 'Teststr. 1', 'bill.zip': '20099', 'bill.city': 'Hamburg',
            'addr.name': 'Erika Muster', 'addr.street': 'Lange Reihe 5', 'addr.zip': '20099', 'addr.city': 'Hamburg'}
    for k, v in vals.items():
        el = p.locator(f'[data-co="{k}"]').first
        if await el.count() and await el.is_visible() and not await el.input_value(): await el.fill(v)
    await p.locator(f'[data-co=pay][value={pay}]').first.check(force=True)
    await p.locator('[data-co=agb]').first.check(force=True); await p.wait_for_timeout(300)
async def place(p):
    await p.locator('[data-act=place]').first.click(); await p.wait_for_timeout(3500)
    return p.url.split('/danke/')[-1] if '/danke/' in p.url else None

def sql(q):
    return subprocess.run(['su', 'postgres', '-c', f"psql -X -At -d shoptest -c \"{q}\""], capture_output=True, text=True).stdout.strip()

PLZ = {'Localities': [{'name': 'Hamburg', 'postalcode': '20099'}], 'Streets': [{'name': 'Lange Reihe', 'postalcode': '20099', 'locality': 'Hamburg'}, {'name': 'Langenfelder Straße', 'postalcode': '20099', 'locality': 'Hamburg'}]}

async def mock_plz(p):
    async def h(route):
        u = route.request.url
        body = PLZ['Localities'] if '/Localities' in u else PLZ['Streets'] if '/Streets' in u else []
        await route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(body))
    await p.context.route('https://openplzapi.org/**', h)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')

        # 1) coupon usage limit from the admin (remove the code a previous run left behind)
        sql("update shop.kv set v = coalesce((select jsonb_agg(value) from jsonb_array_elements(v) where value->>'code' <> 'NURZWEI'), '[]'::jsonb) where k='coupons'")
        a = await admin_login(b)
        await a.goto(WEB + '/admin.html#/admin/rabatte'); await a.wait_for_timeout(1200)
        f = a.locator('form[data-aform=coupon]')
        await f.locator('[name=code]').fill('NURZWEI'); await f.locator('[name=value]').fill('5'); await f.locator('[name=max]').fill('2')
        await f.locator('button').click(); await a.wait_for_timeout(2500)
        c = await a.evaluate("()=>ST.coupons().find(c=>c.code==='NURZWEI')")
        ok('admin: coupon created with max uses 2', c and c.get('max') == 2, c)
        inp = a.locator('[data-cp=max]').last
        await inp.fill('1'); await inp.dispatch_event('change'); await a.wait_for_timeout(3000)
        c = await a.evaluate("()=>ST.coupons().find(c=>c.code==='NURZWEI')")
        ok('admin: max uses edited inline to 1', c and c.get('max') == 1, c)
        srv = sql("select v from shop.kv where k='coupons'")
        ok('server stores the limit', '"NURZWEI"' in srv and '"max": 1' in srv, srv[:300])
        sql("update shop.kv set v = (select jsonb_agg(case when value->>'code'='NURZWEI' then value || jsonb_build_object('uses', 1) else value end) from jsonb_array_elements(v)) where k='coupons'")
        r = api('shop_coupon_check', {'p_code': 'NURZWEI', 'p_sub': 50})
        ok('server refuses the code once the limit is used up', isinstance(r, dict) and r.get('err') == 'used', r)

        # 2) German address fields at checkout
        p = await page(b); await mock_plz(p)
        await p.goto(WEB + '/index.html#/p/rosenbox-herz'); await p.wait_for_timeout(1500)
        for el in await p.locator('input[data-field]:visible').all(): await el.fill('Lina')
        await p.locator('[data-act=add]:visible').first.click(); await p.wait_for_timeout(1500); await p.evaluate("()=>C.closeAll()")
        await p.goto(WEB + '/index.html#/kasse'); await p.wait_for_timeout(1500)
        await p.locator('[data-co=method][value=dhl]').first.check(force=True); await p.wait_for_timeout(500)
        z = p.locator('[data-co="addr.zip"]')
        await z.fill(''); await z.type('20099abc77', delay=20); await p.wait_for_timeout(1200)
        ok('zip keeps only 5 digits', await z.input_value() == '20099', await z.input_value())
        ok('zip suggestion fills the city', await p.locator('[data-co="addr.city"]').input_value() == 'Hamburg', await p.locator('[data-co="addr.city"]').input_value())
        st = p.locator('[data-co="addr.street"]'); await st.fill(''); await st.type('Lang', delay=30); await p.wait_for_timeout(1200)
        opts = await p.evaluate("()=>[...document.querySelectorAll('#dl-addr-street option')].map(o=>o.value)")
        ok('street suggestions offered', 'Lange Reihe' in opts, opts)
        cty = p.locator('.co-sec input[readonly]').first
        ok('country shown for Germany', await cty.count() and 'Deutschland' in await cty.input_value())
        same = p.locator('[data-co=sameBill]'); await same.uncheck(force=True); await p.wait_for_timeout(600)
        ok('billing address can be another country', await p.locator('select[data-co="bill.country"] option').count() >= 10)

        # 3) digital-only bag: no shipping, no address, server accepts
        q = await page(b)
        await q.goto(WEB + '/index.html#/gutschein'); await q.wait_for_timeout(1500)
        for sel in ['[data-gc=to]', 'input[name=to]', 'input[data-gcf=to]']:
            if await q.locator(sel).count(): await q.locator(sel).first.fill('Mona')
        em = q.locator('input[type=email]:visible')
        if await em.count(): await em.first.fill('mona@example.org')
        await q.locator('[data-act=add]:visible, [data-act=gcadd]:visible, form .btn:visible').first.click(); await q.wait_for_timeout(1500); await q.evaluate("()=>C.closeAll()")
        n = await q.evaluate("()=>ST.cart().length"); dg = await q.evaluate("()=>ST.cartDigital(ST.cart())")
        ok('gift card in bag counts as digital', n >= 1 and dg, (n, dg))
        await q.goto(WEB + '/index.html#/kasse'); await q.wait_for_timeout(1500)
        ok('digital: no shipping choices', await q.locator('.mopts:visible [data-co=method]').count() == 0)
        ok('digital: no delivery address', await q.locator('[data-co="addr.street"]').count() == 0)
        ok('digital: e-mail note shown', await q.locator('.pickbox.dig').count() == 1)
        vals = {'name': 'Mona Muster', 'email': 'mona@example.org', 'phone': '0151 2345678', 'bill.name': 'Mona Muster', 'bill.street': 'Teststr. 1', 'bill.zip': '20099', 'bill.city': 'Hamburg'}
        for k, v in vals.items():
            el = q.locator(f'[data-co="{k}"]').first
            if await el.count() and await el.is_visible(): await el.fill(v)
        await q.locator('[data-co=pay][value=vorkasse]').first.check(force=True)
        await q.locator('[data-co=agb]').first.check(force=True); await q.wait_for_timeout(300)
        no = await place(q)
        ok('digital order placed', bool(no), q.url)
        if no:
            m = sql(f"select data#>>'{{ship,method}}' from shop.items where kind='order' and id='{no}'")
            ok('server saved method digital', m == 'digital', m)
        # the server refuses "digital" for a physical product
        bad = api('shop_order_place', {'p': {'name': 'X Y', 'email': 'x@example.org', 'phone': '01511234567', 'method': 'digital', 'pay': 'vorkasse', 'date': sql("select current_date"),
                  'items': [{'pid': 'rosenbox-herz', 'qty': 1, 'unit': 59.9, 'D': {}}], 'bill': {'name': 'X', 'street': 'a 1', 'zip': '20099', 'city': 'Hamburg'}}, 'p_dry': True})
        ok('server refuses digital shipping for a physical product', 'method' in json.dumps(bad), bad)

        # 4) payment mail: owner marks paid → mail with invoice link
        if no:
            await a.goto(WEB + f'/admin.html#/admin/o/{no}'); await a.wait_for_timeout(1500)
            await a.locator('[data-a=paid]').first.click(); await a.wait_for_timeout(3000)
            mails = sql(f"select count(*) from shop.items where kind='email' and data->>'no'='{no}' and data->>'tpl'='paid'")
            ok('owner marks paid → payment mail sent', mails == '1', mails)
        # owner marks a product as digital → the server price table knows it
        await a.goto(WEB + '/admin.html#/admin/produkte/song-plakette'); await a.wait_for_timeout(1500)
        cb = a.locator('input[name=digital]')
        ok('product editor has the digital switch', await cb.count() == 1)
        if await cb.count():
            await cb.check(); await a.locator('input[name=digital]').evaluate("e=>e.form.requestSubmit()"); await a.wait_for_timeout(3500)
            ok('product saved as digital', await a.evaluate("()=>!!ST.product('song-plakette').digital"))
            ok('server price table marks it digital', sql("select v#>>'{song-plakette,digital}' from shop.kv where k='prices'") == 'true', sql("select v#>>'{song-plakette,digital}' from shop.kv where k='prices'"))
            await cb.uncheck(); await a.locator('input[name=digital]').evaluate("e=>e.form.requestSubmit()"); await a.wait_for_timeout(2500)
        # server path (PayPal confirmation) also mails
        pp = sql("select id from shop.items where kind='order' and data#>>'{pay,status}' <> 'bezahlt' and data->>'status' <> 'storniert' order by created_at desc limit 1")
        tot = sql(f"select data#>>'{{totals,total}}' from shop.items where kind='order' and id='{pp}'")
        sql(f"select public.shop_srv_paypal_result('{pp}', null, 'CAP123', 'COMPLETED', {tot}, 'EUR', 'test')")
        mails = sql(f"select count(*) from shop.items where kind='email' and data->>'no'='{pp}' and data->>'tpl'='paid'")
        ok('PayPal confirmation → payment mail', mails == '1', (pp, mails))

        errs = (a.errs or []) + (p.errs or []) + (q.errs or [])
        ok('no page errors', not errs, errs)
        await b.close()
    print(f"\n{sum(1 for _, x in R if x)} PASS, {sum(1 for _, x in R if not x)} FAIL")

asyncio.run(main())
