"""End-to-end: owner login -> customer order (pickup, bank transfer) -> owner sees it -> tracking in a fresh browser."""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780')
OUT = os.environ.get('SHOTS', '/home/claude/shots')
async def ctx(b, w=390, h=844):
    c = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, locale='de-DE')
    p = await c.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    p.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type == 'error' else None)
    return c, p, errs
async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        # 1 owner login
        ac, ap, aerr = await ctx(b, 1280, 900)
        await ap.goto(WEB + '/admin.html#/admin'); await ap.wait_for_selector('[name=user]', timeout=8000)
        await ap.fill('[name=user]', 'Inhaber'); await ap.fill('[name=pw]', 'falsch-passwort')
        await ap.click('form[data-aform=login] button'); await ap.wait_for_timeout(800)
        res['wrong_pw_rejected'] = await ap.locator('[name=pw]').count() == 1
        await ap.fill('[name=pw]', 'TestPasswort123!'); await ap.click('form[data-aform=login] button')
        await ap.wait_for_selector('.a-top', timeout=8000); await ap.wait_for_timeout(2500)
        res['owner_logged_in'] = True
        await ap.screenshot(path=OUT + '/t-admin-dash.png')
        # 2 customer orders
        cc, cp, cerr = await ctx(b)
        await cp.goto(WEB + '/index.html#/p/rosenbox-herz'); await cp.wait_for_timeout(2500)
        await cp.screenshot(path=OUT + '/t-pdp.png')
        name_in = cp.locator('input[data-field]').first
        if await name_in.count(): await name_in.fill('Lina')
        await cp.wait_for_timeout(500)
        add = cp.locator("[data-act=add]:visible").first
        await add.click(); await cp.wait_for_timeout(1500)
        await cp.goto(WEB + '/index.html#/kasse'); await cp.wait_for_timeout(1500)
        await cp.screenshot(path=OUT + '/t-checkout.png', full_page=True)
        # fill checkout: pickup + bank transfer
        await cp.locator('[data-co=method][value=pickup]').first.check(force=True); await cp.wait_for_timeout(400)
        for k, v in [('name','Test Kundin'),('email','kundin@example.org'),('phone','0151 2345678'),('bill.name','Test Kundin'),('bill.street','Teststr. 1'),('bill.zip','20099'),('bill.city','Hamburg')]:
            el = cp.locator(f'[data-co="{k}"]').first
            if await el.count(): await el.fill(v)
        pv = cp.locator('[data-co=pay][value=vorkasse]').first
        if await pv.count(): await pv.check(force=True)
        await cp.locator('[data-co=agb]').first.check(force=True)
        await cp.wait_for_timeout(300)
        await cp.locator('[data-act=place]').first.click(); await cp.wait_for_timeout(4000)
        res['thanks_url'] = cp.url
        await cp.screenshot(path=OUT + '/t-thanks.png', full_page=True)
        no = cp.url.split('/danke/')[-1] if '/danke/' in cp.url else None
        res['order_no'] = no
        # 3 owner sees it
        await ap.goto(WEB + '/admin.html#/admin/bestellungen'); await ap.wait_for_timeout(2500)
        res['owner_sees_order'] = bool(no) and await ap.locator(f'text={no}').count() > 0
        await ap.screenshot(path=OUT + '/t-admin-orders.png')
        # 4 tracking from another device
        tc, tp, terr = await ctx(b)
        await tp.goto(WEB + f'/index.html#/verfolgen/{no}?e=kundin@example.org'); await tp.wait_for_timeout(2500)
        res['tracking_other_device'] = await tp.locator('.track-d').count() > 0
        await tp.goto(WEB + f'/index.html#/verfolgen/{no}?e=fremd@example.org'); await tp.wait_for_timeout(2000)
        res['tracking_wrong_email_blocked'] = await tp.locator('.track-d').count() == 0
        print(json.dumps(res, indent=1)); print('ADMIN ERR', aerr[:10]); print('CUST ERR', cerr[:10])
        await b.close()
asyncio.run(main())
