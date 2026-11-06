"""WCAG contrast check for visible text (AA: 4.5:1 normal text, 3:1 large text). Background = first opaque ancestor colour (blended)."""
import asyncio, json, os
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780')
ROUTES = ['#/', '#/c/alle', '#/p/rosenbox-herz', '#/box', '#/gutschein', '#/warenkorb', '#/kasse', '#/konto', '#/verfolgen', '#/filialen', '#/hilfe', '#/rechtliches/impressum']
JS = """() => {
  const P = s => { let m = /rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?/.exec(s); if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = /color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.e-]+))?\\)/.exec(s); return m ? [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]] : null; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const blend = (top, bot) => [0, 1, 2].map(i => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
  function bgOf(el) { const stack = []; let e = el; while (e && e.nodeType === 1) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('gradient')) return null; const c = P(cs.backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } e = e.parentElement; }
    let b = [255, 255, 255, 1]; for (let i = stack.length - 1; i >= 0; i--) b = blend(stack[i], b); return b; }
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('img,canvas,svg,video,iframe,[aria-hidden=true],.sr-only,.pimg,.hero-img,.occ2,.s8-occ,.m-cat,.bx-prev')) continue;
    const txt = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(''); if (!txt) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const fg = P(cs.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const f = blend(fg, bg); const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const large = size >= 24 || (bold && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) out.push({ t: txt.slice(0, 30), r: Math.round(ratio * 100) / 100, c: cs.color, bg: 'rgb(' + bg.slice(0, 3).map(Math.round) + ')', el: el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] });
  }
  return out;
}"""
async def main():
    found = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        for w in (390, 1366):
            c = await b.new_context(viewport={'width': w, 'height': 900}); await c.add_init_script("try{localStorage.setItem('an2:cookies', JSON.stringify('min'))}catch(e){}")
            p = await c.new_page()
            for r in ROUTES:
                await p.goto(WEB + '/index.html' + r); await p.wait_for_timeout(900)
                await p.evaluate("() => document.querySelectorAll('.rv,.pre').forEach(e => { e.classList.add('shown'); e.classList.remove('pre'); e.style.opacity = 1; })")
                await p.wait_for_timeout(300)
                for x in await p.evaluate(JS): found.append(dict(x, route=r, w=w))
            await c.close()
        await b.close()
    uniq = {}
    for x in found: uniq.setdefault((x['c'], x['bg'], x['el']), x)
    for x in list(uniq.values())[:60]: print(json.dumps(x, ensure_ascii=False))
    print('LOW-CONTRAST TEXT GROUPS:', len(uniq))
asyncio.run(main())
