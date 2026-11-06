"""Functional end-to-end flows through the real UI (customer + owner) against the local server stand-in."""
import asyncio, json, os, random, urllib.request, base64
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780'); API = 'http://localhost:54321/rest/v1/rpc/'
SH = '/home/claude/shots/flow'; os.makedirs(SH, exist_ok=True)
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

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        a = await admin_login(b)
        ok('Owner login', True)

        # ---- account: register, logout, login, wrong password, profile on second device
        p = await page(b); email = f'erika{random.randint(1, 10**8)}@example.org'
        await p.goto(WEB + '/index.html#/konto/registrieren'); await p.wait_for_timeout(1200)
        await p.fill('form[data-form=register] [name=name]', 'Erika Muster'); await p.fill('form[data-form=register] [name=email]', email)
        await p.fill('form[data-form=register] [name=pw]', 'kurz'); await p.click('form[data-form=register] button'); await p.wait_for_timeout(600)
        ok('Register: too short password refused', '#/konto/registrieren' in p.url)
        await p.fill('form[data-form=register] [name=pw]', 'GeheimesPasswort1'); await p.click('form[data-form=register] button'); await p.wait_for_timeout(1800)
        ok('Register works', await p.locator('.acc-head').count() > 0, p.url)
        await p.click('[data-act=logout]'); await p.wait_for_timeout(1200)
        ok('Logout works', await p.locator('form[data-form=login]').count() > 0)
        await p.fill('form[data-form=login] [name=email]', email); await p.fill('form[data-form=login] [name=pw]', 'falsch12345'); await p.click('form[data-form=login] button'); await p.wait_for_timeout(1200)
        ok('Login with wrong password refused', await p.locator('form[data-form=login]').count() > 0)
        p2 = await page(b)
        await p2.goto(WEB + '/index.html#/konto'); await p2.wait_for_timeout(1200)
        await p2.fill('form[data-form=login] [name=email]', email); await p2.fill('form[data-form=login] [name=pw]', 'GeheimesPasswort1'); await p2.click('form[data-form=login] button'); await p2.wait_for_timeout(2000)
        ok('Login on a second device', await p2.locator('.acc-head').count() > 0)
        await p2.goto(WEB + '/index.html#/konto/passwort'); await p2.wait_for_timeout(900)
        await p2.fill('#pwForm [name=email]', email); await p2.click('#pwForm button'); await p2.wait_for_timeout(1200)
        ok('Password-forgotten form answers', await p2.locator('#pwOut:not([hidden])').count() > 0)

        # ---- wishlist synced to account
        await p2.goto(WEB + '/index.html#/c/alle'); await p2.wait_for_timeout(1200)
        await p2.locator('[data-act=wish]').first.click(); await p2.wait_for_timeout(1500)
        me = await p2.evaluate("() => ST.me().wishlist.length")
        ok('Wishlist saved in account', me >= 1, me)

        # ---- photo product: upload photo, order, owner can open the photo on another device
        pid = await p2.evaluate("() => (ST.products().find(x => x.fields.some(f => f.type === 'photo' && !f.optional) && !(x.opts||[]).length) || {}).id")
        await p2.goto(WEB + f'/index.html#/p/{pid}'); await p2.wait_for_timeout(2000)
        img = base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=')
        fin = p2.locator('input[type=file][data-upload], input[type=file]').first
        await fin.set_input_files({'name': 'foto.jpg', 'mimeType': 'image/jpeg', 'buffer': open('/home/claude/adam-neuetalia/img/p/p01.jpg', 'rb').read()})
        await p2.wait_for_timeout(2500)
        crop = p2.locator('[data-crop=done], .crop-sheet .btn:last-child, [data-crop="ok"]')
        if await crop.count(): await crop.first.click(); await p2.wait_for_timeout(800)
        for f in await p2.locator('input[data-field]').all():
            if await f.is_visible() and not await f.input_value(): await f.fill('Erika')
        await p2.locator('[data-act=add]:visible').first.click(); await p2.wait_for_timeout(2000)
        cart = await p2.evaluate("() => ST.cart().length")
        ok(f'Photo product ({pid}) added to bag', cart >= 1, cart)
        await fill_checkout(p2, email)
        no = await place(p2)
        ok('Order with photo placed (logged-in customer)', no, await toast(p2))
        await p2.screenshot(path=SH + '/thanks.png', full_page=True)
        o = api('shop_order_get', {'p_no': no, 'p_email': email}) if no else {}
        ph = [v for v in json.dumps(o).split('"') if v.startswith('idb:ph')]
        ok('Photo id stored in order', ph, json.dumps(o)[:150])
        tok = api('shop_admin_login', {'p_user': 'Inhaber', 'p_pw': 'TestPasswort123!'}).get('token')
        g = api('shop_admin_photo_get', {'p_token': tok, 'p_id': ph[0]}) if ph else None
        ok('Owner can download the customer photo from the server', g and g.get('data') and len(g['data']) > 1000)
        await p2.goto(WEB + '/index.html#/konto/bestellungen'); await p2.wait_for_timeout(1500)
        ok('Order listed in customer account', no and await p2.locator(f'text={no}').count() > 0)

        # ---- owner changes status -> customer sees it
        await a.goto(WEB + f'/admin.html#/admin/o/{no}'); await a.wait_for_timeout(2000)
        await a.screenshot(path=SH + '/admin-order.png', full_page=True)
        btn = a.locator('[data-a=st][data-v=produktion], [data-a="st"][data-st="produktion"], button:has-text("Produktion")').first
        if await btn.count(): await btn.click(); await a.wait_for_timeout(2500)
        srv = api('shop_order_get', {'p_no': no, 'p_email': email})
        ok('Owner status change saved on server', srv.get('status') == 'produktion', srv.get('status'))
        await p2.goto(WEB + f'/index.html#/verfolgen/{no}?e={email}'); await p2.wait_for_timeout(1800)
        ok('Customer tracking shows new status', srv.get('status') == 'produktion' and await p2.locator('.progress .now').count() > 0)

        # ---- coupon created by owner works for customer
        code = 'TEST' + str(random.randint(100, 999))
        await a.goto(WEB + '/admin.html#/admin/rabatte'); await a.wait_for_timeout(1500)
        f = a.locator('form[data-aform=coupon]')
        await f.locator('[name=code]').fill(code); await f.locator('[name=value]').fill('10')
        if await f.locator('[name=type]').count(): await f.locator('[name=type]').select_option('pct')
        await f.locator('button').first.click(); await a.wait_for_timeout(2500)
        p3 = await page(b)
        await p3.goto(WEB + '/index.html#/p/rosenbox-herz'); await p3.wait_for_timeout(1800)
        for fl in await p3.locator('input[data-field]').all():
            if await fl.is_visible(): await fl.fill('Mia')
        await p3.locator('[data-act=add]:visible').first.click(); await p3.wait_for_timeout(1500)
        await fill_checkout(p3, 'mia@example.org')
        await p3.fill('#cpn', code); await p3.click('[data-act=cpn]'); await p3.wait_for_timeout(1500)
        disc = await p3.evaluate("() => document.querySelector('.tot') ? document.querySelector('.tot').innerText : ''")
        ok('Owner-created coupon accepted at checkout', '−' in disc or '-5,99' in disc, disc[:120])
        await p3.fill('#cpn', 'GIBTSNICHT'); await p3.click('[data-act=cpn]'); await p3.wait_for_timeout(1200)
        ok('Unknown coupon refused', await toast(p3) != '')
        await fill_checkout(p3, 'mia@example.org')
        await p3.fill('#cpn', code); await p3.click('[data-act=cpn]'); await p3.wait_for_timeout(1200)
        # ---- owner raises price while the customer is in checkout -> customer is told, nothing is charged wrong
        await a.goto(WEB + '/admin.html#/admin/produkte/rosenbox-herz'); await a.wait_for_timeout(1800)
        pf = a.locator('form[data-aform=product] [name=price]')
        if await pf.count():
            await pf.fill('64.9'); await a.locator('form[data-aform=product] button[type=submit], form[data-aform=product] .btn:not(.ghost)').first.click(); await a.wait_for_timeout(3500)
        await p3.locator('[data-act=place]').first.click(); await p3.wait_for_timeout(2500)
        t = await toast(p3)
        ok('Price changed by owner -> old cart price refused', '/danke/' not in p3.url and ('Preis' in t or 'price' in t.lower()), t)
        if await pf.count():
            await pf.fill('59.9'); await a.locator('form[data-aform=product] button[type=submit], form[data-aform=product] .btn:not(.ghost)').first.click(); await a.wait_for_timeout(3000)
        # customer reloads (new prices) and orders, then cancels within the time window
        tot = await p3.evaluate("() => document.querySelector('[data-act=place]').innerText")
        ok('Checkout re-shows the bag with the new price', '58,41' in tot, tot)
        await p3.goto(WEB + '/index.html#/'); await p3.reload(); await p3.wait_for_timeout(1500)
        ok('Bag updated to current price after reload', await p3.evaluate("() => ST.cart()[0].unit") == 59.9)
        await fill_checkout(p3, 'mia@example.org')
        no2 = await place(p3)
        ok('Order after price update works', no2, await toast(p3))
        await p3.goto(WEB + f'/index.html#/verfolgen/{no2}?e=mia@example.org'); await p3.wait_for_timeout(1500)
        p3.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p3.locator('[data-act=ocancel]').first.click(); await p3.wait_for_timeout(800)
        conf = p3.locator('.ov .btn:not(.ghost)').first
        if await conf.count(): await conf.click(); await p3.wait_for_timeout(2000)
        ok('Customer can cancel within the time window', api('shop_order_get', {'p_no': no2, 'p_email': 'mia@example.org'}).get('status') == 'storniert')

        # ---- review & question go to the owner, appear only after approval
        await p3.goto(WEB + '/index.html#/p/rosenbox-herz'); await p3.wait_for_timeout(1500)
        await p3.evaluate("() => document.querySelectorAll('details').forEach(d => d.open = true)")
        rf = p3.locator('form[data-form=review]')
        if await rf.count():
            await rf.locator('[name=name]').fill('Mia'); await rf.locator('[name=text]').fill('Wunderschön <b>xss</b>')
            await rf.locator('button').last.click(); await p3.wait_for_timeout(1500)
        await a.goto(WEB + '/admin.html#/admin/bewertungen'); await a.wait_for_timeout(16500)
        ok('Review arrives in owner area', await a.locator('text=Wunderschön').count() > 0)
        ok('Review not public before approval', not any('Wunderschön' in json.dumps(r) for r in api('shop_boot', {}).get('reviews', [])))

        # ---- owner team: staff login sees no products
        api('shop_admin_user_set', {'p_token': tok, 'p_user': 'Werkstatt', 'p_pw': 'Werkstatt-Pass-1', 'p_role': 'staff', 'p_delete': False})
        s = await page(b, 1280, 900)
        await s.goto(WEB + '/admin.html#/admin'); await s.wait_for_selector('[name=user]')
        await s.fill('[name=user]', 'Werkstatt'); await s.fill('[name=pw]', 'Werkstatt-Pass-1'); await s.click('form[data-aform=login] button'); await s.wait_for_timeout(2500)
        ok('Staff login works', await s.locator('.a-top').count() > 0)
        await s.goto(WEB + '/admin.html#/admin/produkte'); await s.wait_for_timeout(1200)
        ok('Staff cannot open products', await s.locator('form[data-aform=product], .prow').count() == 0)
        await s.click('[data-a=logout]'); await s.wait_for_timeout(1200)
        ok('Staff logout', await s.locator('[name=user]').count() > 0)

        errs = [x for pg in [a, p, p2, p3, s] for x in pg.errs]
        ok('No JavaScript errors during all flows', not errs, errs[:3])
        await b.close()
    print(f"\n{sum(1 for _, c in R if c)} PASS, {sum(1 for _, c in R if not c)} FAIL")
    json.dump([{'test': n, 'result': 'PASS' if c else 'FAIL'} for n, c in R], open(os.path.join(os.path.dirname(__file__), 'e2e_results.json'), 'w'), indent=1, ensure_ascii=False)
asyncio.run(main())
