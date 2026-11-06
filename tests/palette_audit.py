"""Checks that the rendered UI only uses the Figma palette (#FE90BE, #6425FE, #01CAC9, #333333, #FFFFFF, plus transparency).
Product photos, canvases and product colour swatches (real product colours chosen by the customer) are excluded."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
WEB = os.environ.get('WEB', 'http://localhost:8780')
ROUTES = ['#/', '#/c/alle', '#/anlass', '#/p/rosenbox-herz', '#/p/kette-spotify', '#/box', '#/gutschein', '#/warenkorb', '#/kasse', '#/konto', '#/konto/registrieren',
          '#/verfolgen', '#/filialen', '#/hilfe', '#/wunschliste', '#/rechtliches/impressum', '#/rechtliches/widerruf']
JS = """() => {
  const OK = ['254,144,190', '100,37,254', '1,202,201', '51,51,51', '255,255,255', '0,0,0'];
  const bad = {};
  const skip = el => el.closest('img,canvas,video,iframe,[data-color],[data-bx-col],.sw,.swatch,.cswatch,.bx-rib,.bx-ribbon,.ribbon-sw,.color-dot,.cdot,.bx-sw,.paypal,[data-ppbtn],.pl,.soc-btn,.loc-map');
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el)) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'outlineColor', 'fill', 'stroke'];
    for (const p of props) {
      const v = cs[p]; if (!v || v === 'none' || /rgba\\([^)]*,\\s*0\\)$/.test(v) || v === 'transparent') continue;
      if ((p.startsWith('border') && parseFloat(cs[p.replace('Color', 'Width')]) === 0) || (p === 'outlineColor' && cs.outlineStyle === 'none')) continue;
      if ((p === 'fill' || p === 'stroke') && !(el instanceof SVGElement)) continue;
      if (p === 'color' && !el.childNodes.length) continue;
      let m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/.exec(v); let k;
      if (m) k = m[1] + ',' + m[2] + ',' + m[3];
      else { m = /color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)/.exec(v); if (!m) { bad['unparsed ' + v] = el.tagName; continue; } k = [m[1], m[2], m[3]].map(x => Math.round(x * 255)).join(','); }
      if (!OK.includes(k)) { const key = p + ' rgb(' + k + ')'; bad[key] = bad[key] || (el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).split(' ').slice(0, 2).join('.')); }
    }
    for (const g of [cs.backgroundImage]) if (g && g.includes('gradient')) for (const m of g.matchAll(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/g)) { const k = m[1] + ',' + m[2] + ',' + m[3]; if (!OK.includes(k)) bad['gradient rgb(' + k + ')'] = el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]; }
  }
  return bad;
}"""
async def main():
    found = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        for page_file, routes in [('index.html', ROUTES), ('admin.html', ['#/admin', '#/admin/bestellungen', '#/admin/produkte', '#/admin/einstellungen', '#/admin/rabatte', '#/admin/website'])]:
            for w in (390, 1366):
                c = await b.new_context(viewport={'width': w, 'height': 900})
                await c.add_init_script("try{localStorage.setItem('an2:cookies', JSON.stringify(null))}catch(e){}")
                p = await c.new_page()
                if page_file == 'admin.html':
                    await p.goto(WEB + '/admin.html#/admin'); await p.wait_for_selector('[name=user]')
                    await p.fill('[name=user]', 'Inhaber'); await p.fill('[name=pw]', 'TestPasswort123!'); await p.click('form button'); await p.wait_for_timeout(2000)
                for r in routes:
                    await p.goto(WEB + '/' + page_file + r); await p.wait_for_timeout(900)
                    for k, v in (await p.evaluate(JS)).items(): found.setdefault(k, set()).add(f'{r} {v}')
                await c.close()
        await b.close()
    for k in sorted(found): print(k, '|', '; '.join(sorted(found[k])[:3]))
    print('NON-PALETTE COLOURS:', len(found))
    json.dump({k: sorted(v) for k, v in found.items()}, open(os.path.join(os.path.dirname(__file__), 'palette_results.json'), 'w'), indent=1)
asyncio.run(main())
