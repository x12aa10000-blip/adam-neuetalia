"""Layout audit: finds text that is cut off, sticks out of its card, overlaps other text, or pushes the page sideways.
Every page × 9 screen widths × Arabic + German (+ admin pages). Run with tests/start.sh running.
Usage: python3 tests/layout_audit.py [shop|admin|all]"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780')
WIDTHS = [360, 390, 600, 768, 820, 980, 1024, 1280, 1440]
SHOP = ['#/', '#/c/alle', '#/c/rosen', '#/p/rosenbox-herz', '#/p/tasse-foto', '#/p/kette-handschrift', '#/warenkorb', '#/kasse', '#/konto', '#/suche/kette', '#/hilfe', '#/box',
        '#/gutschein', '#/verfolgen', '#/filialen', '#/anlass', '#/wunschliste', '#/rechtliches/impressum', '#/rechtliches/agb', '#/ueber-uns']
ADMIN = ['', '/bestellungen', '/produkte', '/produkte/rosenbox-herz', '/produktion', '/versand', '/rabatte', '/kunden', '/einstellungen', '/bewertungen', '/emails', '/website', '/aktivitaet', '/kategorien', '/umsatz']

PROBE = r"""() => {
  const W = innerWidth, out = [];
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (e.checkVisibility && !e.checkVisibility({contentVisibilityAuto:true,opacityProperty:true,visibilityProperty:true})) return false; if (e.closest('details:not([open])') && !e.closest('summary')) return false; for (let x = e; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < .05) return false; } return true; };
  const name = e => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const txt = e => (e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (document.documentElement.scrollWidth > W + 1) {
    const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return (r.right > W + 2 || r.left < -2) && vis(e) && !e.closest('[class*=rail],[class*=scroll],.chips,.s8-picks,.ov,.mm'); }).slice(0, 3).map(name);
    out.push(['page-sideways', document.documentElement.scrollWidth - W, wide.join(' ')]);
  }
  // nothing from the page body may slide over the footer
  const ft = [...document.querySelectorAll('footer,.ft')].filter(f => !f.closest('main') && vis(f)).pop(); if (ft) { const top = ft.getBoundingClientRect().top; const bad = [...document.querySelectorAll('main *')].filter(e => !e.closest('.ov,.mm,.toast,[class*=rail],.chips') && getComputedStyle(e).position !== 'fixed' && !e.closest('[style*=fixed]') && vis(e) && e.getBoundingClientRect().bottom > top + 4 && e.getBoundingClientRect().top < top); const top1 = bad.filter(e => !bad.includes(e.parentElement)).slice(0, 2); for (const e of top1) out.push(['over-footer', name(e), txt(e)]); }
  // leaf-ish text elements
  const leaves = [...document.querySelectorAll('body *')].filter(e => !e.closest('.ov,svg,canvas,script,style,.mm,.toast,#toast') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e));
  for (const e of leaves) {
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    // text cut inside its own box (no "…" on purpose)
    if ((e.scrollWidth > e.clientWidth + 2 && ['hidden', 'clip'].includes(c.overflowX) && c.textOverflow !== 'ellipsis' && e.clientWidth > 0) || (e.scrollHeight > e.clientHeight + 3 && ['hidden', 'clip'].includes(c.overflowY) && !c.webkitLineClamp.match(/\d/) && e.clientHeight > 0 && c.textOverflow !== 'ellipsis'))
      out.push(['text-cut', name(e), txt(e)]);
    // sticks out of the card / box it belongs to
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const boxy = pc.overflowX !== 'visible' || (pc.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(pc.borderTopLeftRadius) > 0) || pc.borderLeftStyle !== 'none';
      if (!boxy) continue;
      if (p.closest('[class*=rail],.chips,.s8-picks,.seg,.dates,.mopts')) break;
      const pr = p.getBoundingClientRect();
      if (pr.width < 40) break;
      if (r.left < pr.left - 2 || r.right > pr.right + 2) out.push(['sticks-out', name(e) + ' ⊄ ' + name(p), txt(e)]);
      break;
    }
    if (r.right > W + 2 || r.left < -2) if (!e.closest('[class*=rail],.chips,.s8-picks,.seg,[class*=scroll],.dates,.tabs2,.mopts,.co-steps')) out.push(['off-screen', name(e), txt(e)]);
  }
  // text drawn over other text
  const icons = [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,.wish')].filter(e => !e.closest('.ov,.mm,.toast') && !leaves.includes(e) && !leaves.some(l => e.contains(l)) && vis(e));
  const rs = leaves.concat(icons).filter(e => !e.closest('.sticky-buy,.tabbar,.hd,header,.cookie,.as-btn,#asBtn,.s8-tag')).map(e => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const [a, A] = rs[i], [b, B] = rs[j]; if (a.contains(b) || b.contains(a)) continue;
    const x = Math.min(A.right, B.right) - Math.max(A.left, B.left), y = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (x > 4 && y > 4 && x * y > .25 * Math.min(A.width * A.height, B.width * B.height)) out.push(['overlap', name(a) + ' × ' + name(b), txt(a) + ' × ' + txt(b)]);
  }
  return out;
}"""

async def run(which):
    found = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        for lang in ['ar', 'de']:
            for w in WIDTHS:
                c = await b.new_context(viewport={'width': w, 'height': 900}, locale='de-DE')
                await c.add_init_script(f"try{{localStorage.setItem('an2:cookies',JSON.stringify('min'));localStorage.setItem('an2:lang',JSON.stringify('{lang}'));localStorage.setItem('an2:adminLang',JSON.stringify('{lang}'))}}catch(e){{}}; document.addEventListener('DOMContentLoaded',()=>{{const s=document.createElement('style');s.textContent='.rv{{opacity:1!important;transform:none!important}}*{{transition:none!important;animation:none!important}}';document.head.appendChild(s)}})")
                p = await c.new_page()
                if which in ('shop', 'all'):
                    await p.goto(WEB + '/index.html#/p/rosenbox-herz'); await p.wait_for_timeout(1200)
                    try:
                        for f in await p.locator('input[data-field]:visible').all(): await f.fill('Lina')
                        await p.locator('[data-act=add]:visible').first.click(); await p.wait_for_timeout(1000); await p.evaluate('()=>C.closeAll()')
                    except Exception: pass
                    for r in SHOP:
                        await p.goto(WEB + '/index.html' + r); await p.wait_for_timeout(900)
                        for y in range(0, 20000, 800):
                            res = await p.evaluate(f"()=>{{scrollTo(0,{y});return document.documentElement.scrollHeight}}"); await p.wait_for_timeout(40)
                            if y > res: break
                        await p.evaluate('()=>scrollTo(0,0)')
                        for it in await p.evaluate(PROBE):
                            found.setdefault(tuple(it[:2]), []).append(f'{lang} {w} {r} | {it[2] if len(it) > 2 else ""}')
                if which in ('admin', 'all'):
                    a = await c.new_page()
                    await a.goto(WEB + '/admin.html#/admin'); await a.wait_for_selector('[name=user]')
                    await a.fill('[name=user]', 'Inhaber'); await a.fill('[name=pw]', 'TestPasswort123!'); await a.click('form[data-aform=login] button'); await a.wait_for_timeout(2500)
                    for r in ADMIN:
                        await a.goto(WEB + '/admin.html#/admin' + r); await a.wait_for_timeout(900)
                        for it in await a.evaluate(PROBE):
                            found.setdefault(tuple(it[:2]), []).append(f'{lang} {w} admin{r} | {it[2] if len(it) > 2 else ""}')
                await c.close()
        await b.close()
    rows = sorted(found.items(), key=lambda kv: -len(kv[1]))
    json.dump([[list(k), v] for k, v in rows], open(os.path.join(os.path.dirname(__file__), f'layout_{which}.json'), 'w'), ensure_ascii=False, indent=1)
    for k, v in rows: print(len(v), k[0], k[1], '::', v[0])
    print('\nLAYOUT PROBLEMS:', len(rows))

asyncio.run(run(sys.argv[1] if len(sys.argv) > 1 else 'shop'))
