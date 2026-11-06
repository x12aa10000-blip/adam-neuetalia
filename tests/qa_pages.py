"""QA sweep: every route and every product page in DE/EN/AR on mobile, tablet and desktop.
Checks: JS errors, console errors, horizontal overflow, broken images, dead internal links, missing translations."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780')
SHOTS = os.environ.get('SHOTS', '/home/claude/shots/qa')
os.makedirs(SHOTS, exist_ok=True)
ROUTES = ['#/', '#/c/alle', '#/anlass', '#/box', '#/gutschein', '#/warenkorb', '#/kasse', '#/konto', '#/konto/registrieren', '#/konto/passwort',
          '#/verfolgen', '#/filialen', '#/hilfe', '#/wunschliste', '#/suche/rose', '#/rechtliches/impressum', '#/rechtliches/datenschutz',
          '#/rechtliches/agb', '#/rechtliches/widerruf', '#/rechtliches/versand']
VIEWS = {'mobile': (390, 844), 'tablet': (820, 1180), 'desktop': (1366, 900)}
CHECK = """() => {
  const out = {};
  out.overflow = document.documentElement.scrollWidth - innerWidth;
  out.wide = out.overflow > 2 ? Array.from(document.querySelectorAll('body *')).filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*=carou],[class*=scroll],.chips,.rail,.hscroll,.strip,.cats,nav') }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 40)) : [];
  out.brokenImg = Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && !i.getAttribute('src').startsWith('data:')).map(i => i.getAttribute('src')).slice(0, 5);
  out.keys = (document.body.innerText.match(/\\b[a-z0-9]+_[a-z0-9_]{2,}\\b/g) || []).filter(k => !/@|\\.|^https?/.test(k)).slice(0, 5);
  out.undef = (document.body.innerText.match(/undefined|NaN|\\[object Object\\]|null €/g) || []).slice(0, 3);
  out.links = Array.from(document.querySelectorAll('a[href^="#/"]')).map(a => a.getAttribute('href'));
  out.h1 = (document.querySelector('h1') || {}).textContent || '';
  return out;
}"""
async def main():
    only = sys.argv[1:] or list(VIEWS)
    problems = []; links = set(); count = 0
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        for vname in only:
            w, h = VIEWS[vname]
            for lang in ['de', 'en', 'ar']:
                c = await b.new_context(viewport={'width': w, 'height': h})
                await c.add_init_script(f"try{{localStorage.setItem('an2:lang', JSON.stringify('{lang}'));localStorage.setItem('an2:cookies', JSON.stringify('min'))}}catch(e){{}}")
                p = await c.new_page(); errs = []
                p.on('pageerror', lambda e: errs.append('JS: ' + str(e)[:200]))
                p.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' and 'favicon' not in m.text else None)
                await p.goto(WEB + '/index.html#/'); await p.wait_for_timeout(1500)
                pids = await p.evaluate("() => ST.products().map(x => x.id)") if vname == 'mobile' and lang == 'de' else (await p.evaluate("() => ST.products().slice(0, 6).map(x => x.id)"))
                routes = ROUTES + ['#/p/' + x for x in pids]
                for r in routes:
                    errs.clear()
                    await p.goto(WEB + '/index.html' + r); await p.wait_for_timeout(700)
                    res = await p.evaluate(CHECK); count += 1
                    links.update(res['links'])
                    issue = {k: v for k, v in {'errors': errs[:3], 'overflow': res['overflow'] if res['overflow'] > 2 else 0, 'wide': res['wide'], 'brokenImg': res['brokenImg'], 'keys': res['keys'], 'undef': res['undef'], 'noH1': not res['h1'].strip() and r != '#/'}.items() if v}
                    if issue: problems.append({'view': vname, 'lang': lang, 'route': r, **issue})
                    if r in ['#/', '#/c/alle', '#/p/rosenbox-herz', '#/kasse', '#/box'] and lang != 'en':
                        await p.screenshot(path=f'{SHOTS}/{vname}-{lang}-{r.strip("#/").replace("/", "_") or "home"}.png')
                await c.close()
        # dead internal links
        c = await b.new_context(); p = await c.new_page(); dead = []
        await p.goto(WEB + '/index.html#/'); await p.wait_for_timeout(1200)
        for l in sorted(links):
            await p.goto(WEB + '/index.html' + l); await p.wait_for_timeout(350)
            final = await p.evaluate("() => location.hash")
            txt = await p.evaluate("() => document.body.innerText.slice(0, 4000)")
            if any(s in txt for s in ['Nicht gefunden', 'not found', 'غير موجود']) or (final in ('#/', '') and l not in ('#/', '#/c/alle')):
                dead.append({'link': l, 'ended': final})
        await b.close()
    json.dump({'pages_checked': count, 'problems': problems, 'dead_links': dead}, open(os.path.join(os.path.dirname(__file__), 'qa_results.json'), 'w'), indent=1, ensure_ascii=False)
    print('pages checked:', count, '| pages with problems:', len(problems), '| dead links:', len(dead))
    for x in problems[:40]: print(json.dumps(x, ensure_ascii=False)[:300])
    for d in dead[:20]: print('DEAD', d)
asyncio.run(main())
