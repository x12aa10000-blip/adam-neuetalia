"""Clickjacking test: the shop and the admin served with _headers must refuse to be embedded by another site."""
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome'); p = await b.new_page(); msgs = []
        p.on('console', lambda m: msgs.append(m.text))
        await p.goto('http://localhost:8791/index.html'); await p.wait_for_timeout(2500)
        frames = [f for f in p.frames if f != p.main_frame]
        loaded = []
        for f in frames:
            try: loaded.append(await f.evaluate("() => !!document.querySelector('#app')"))
            except Exception: loaded.append(False)
        refused = [m for m in msgs if 'frame-ancestors' in m or 'X-Frame-Options' in m or 'Refused to display' in m]
        ok = len(frames) == 2 and not any(loaded)
        print('frames:', len(frames), '| shop/admin rendered inside attacker page:', loaded, '| browser refusals:', len(refused))
        print('PASS clickjacking protection (shop + admin)' if ok else 'FAIL clickjacking protection')
        await b.close()
asyncio.run(main())
