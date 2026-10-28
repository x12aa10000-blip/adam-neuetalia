/* Visual website editor (owner only).
   The owner opens the shop in edit mode and can change literally every detail:
   click anything → change its text, colour, background, font size, bold, size (bigger/smaller),
   corner rounding, transparency, link; drag it to move it; hide/delete it; replace or delete pictures.
   Texts and pictures are stored "original → new" (so they follow the content everywhere),
   all other changes are stored per element (page by page; header & footer for every page)
   and written into one style sheet. Undo, list of changes and reset are built in. */
(function () {
  'use strict';
  const EM = {};
  window.EDITMODE = EM;
  const KEY = 'siteEdits';
  const get = () => { const e = ST.get(KEY, null) || {}; e.t = e.t || {}; e.img = e.img || {}; e.hide = e.hide || {}; e.el = e.el || {}; return e; };
  const undo = [];
  const save = (e, noUndo) => { if (!noUndo) { undo.push(JSON.stringify(get())); if (undo.length > 60) undo.shift(); } ST.set(KEY, JSON.parse(JSON.stringify(e))); };
  const lang = () => C.lang();
  const W = (de, ar) => lang() === 'ar' ? ar : de;
  const isAdmin = () => !!ST.get('adminSession', null);
  const on = () => isAdmin() && !!ST.get('editMode', false);
  const shopView = () => { const a = $('#app'); return a && !a.classList.contains('adm'); };
  const UI = '.em-bar,.em-ui,.em-panel,.em-sel,.ov.em-dlg';
  const SKIP = 'script,style,textarea,input,select,option,' + UI;
  const GLOBAL = /^(div\.topbar|header|footer|nav\.tabbar)/;

  /* ---------------- where an element lives (stable path through the page) ---------------- */
  function pathOf(el) {
    const app = $('#app'); if (!app || !app.contains(el) || el === app) return null;
    const parts = [];
    for (let n = el; n && n !== app; n = n.parentElement) {
      const tag = n.tagName.toLowerCase(); const cls = (n.classList[0] && !/^(on|rv|pre|shown|em-)/.test(n.classList[0])) ? '.' + CSS.escape(n.classList[0]) : '';
      const i = Array.prototype.indexOf.call(n.parentElement.children, n) + 1;
      parts.unshift(tag + cls + ':nth-child(' + i + ')');
    }
    return parts.join(' > ');
  }
  const pageKey = () => (C.path().split('?')[0] || '/').replace(/\/$/, '') || '/';
  const scopeOf = p => GLOBAL.test(p) ? '*' : pageKey();
  const sel = p => '#app > ' + p;

  /* ---------------- apply ---------------- */
  let styleEl = null;
  function css() {
    const e = get(); const out = [];
    for (const scope of ['*', pageKey()]) {
      const m = e.el[scope] || {};
      for (const p in m) {
        const o = m[p]; const r = [];
        if (o.color) r.push(`color:${o.color}`, `fill:currentColor`);
        if (o.bg) r.push(`background:${o.bg}`);
        if (o.fs) r.push(`font-size:${o.fs}px`);
        if (o.fw) r.push(`font-weight:${o.fw}`);
        if (o.scale && o.scale !== 1) r.push(`scale:${o.scale}`);
        if (o.x || o.y) r.push(`translate:${o.x || 0}px ${o.y || 0}px`, 'position:relative', 'z-index:2');
        if ((o.scale && o.scale !== 1) || o.x || o.y) { if (o.ib) r.push('display:inline-block'); }
        if (o.radius != null) r.push(`border-radius:${o.radius}px`);
        if (o.op != null) r.push(`opacity:${o.op / 100}`);
        if (o.ta) r.push(`text-align:${o.ta}`);
        if (r.length) out.push(`${sel(p)}{${r.map(x => x + ' !important').join(';')}}`);
        if (o.hide) out.push(`${sel(p)}{display:none !important}`, `body.em-on ${sel(p)}{display:revert !important;opacity:.3 !important;outline:2px dashed #999 !important}`);
      }
    }
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'em-css'; document.head.appendChild(styleEl); }
    const txt = out.join('\n'); if (styleEl.textContent !== txt) styleEl.textContent = txt;
  }
  function apply(root) {
    if (!shopView()) return;
    css();
    const e = get(); const T = e.t[lang()] || {}; const H = new Set(e.hide[lang()] || []);
    const tw = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; return !p || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    const list = []; while (tw.nextNode()) list.push(tw.currentNode);
    for (const n of list) {
      if (n._em === n.nodeValue) continue;
      const orig = n.nodeValue.trim(); if (!orig) continue;
      n._orig = orig;
      if (T[orig] != null) { const v = n.nodeValue.replace(orig, T[orig]); if (v !== n.nodeValue) n.nodeValue = v; }
      n._em = n.nodeValue;
      if (H.size && n.parentElement) n.parentElement.classList.toggle('em-hidden', H.has(orig));
    }
    const r = root && root.querySelectorAll ? root : document;
    r.querySelectorAll('img').forEach(im => {
      const o = im.dataset.emo || im.getAttribute('src'); if (!o || o.startsWith('data:image/gif')) return;
      const nw = e.img[o];
      if (nw) { if (!im.dataset.emo) im.dataset.emo = o; if (im.dataset.emset !== nw) { im.dataset.emset = nw; if (nw === 'none') im.style.visibility = 'hidden'; else if (nw.startsWith('idb:')) ST.photoUrl(nw).then(u => { if (u) im.src = u; }); else im.src = nw; } }
    });
    r.querySelectorAll('[placeholder]').forEach(el => { const o = el.dataset.emph || el.getAttribute('placeholder'); if (T[o] != null) { el.dataset.emph = o; el.setAttribute('placeholder', T[o]); } });
    for (const scope of ['*', pageKey()]) { const m = e.el[scope] || {}; for (const p in m) if (m[p].href) { const a = document.querySelector(sel(p)); if (a && a.tagName === 'A' && a.getAttribute('href') !== m[p].href) a.setAttribute('href', m[p].href); } }
  }
  let busy = false;
  const obs = new MutationObserver(() => { if (busy) return; busy = true; try { apply(document.body); bar(); place(); } finally { obs.takeRecords(); busy = false; } });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ---------------- top bar of the editor ---------------- */
  function bar() {
    const show = isAdmin() && shopView();
    let b = $('.em-bar');
    if (!show) { if (b) b.remove(); document.body.classList.remove('em-on'); closePanel(); return; }
    document.body.classList.toggle('em-on', on());
    if (!b) { b = document.createElement('div'); b.className = 'em-bar'; document.body.appendChild(b); }
    const html = on()
      ? `<span>${ic('edit')} ${W('Antippen = auswählen · Ziehen = verschieben', 'اكبس لتختار · اسحب لتحرّك')}</span><button type="button" data-em="undo"${undo.length ? '' : ' disabled'} title="${W('Rückgängig', 'تراجع')}">${ic('rotateL')}<i class="lbl">${W('Rückgängig', 'تراجع')}</i></button><button type="button" data-em="list">${ic('layers')}<i class="lbl">${W('Änderungen', 'التعديلات')}</i></button><button type="button" data-em="off" class="em-done">${ic('check')} ${W('Fertig', 'خلصت')}</button>`
      : `<button type="button" data-em="on" class="em-start" aria-label="${W('Website bearbeiten', 'عدّل الموقع')}">${ic('edit')}<i class="lbl">${W('Website bearbeiten', 'عدّل الموقع')}</i></button>`;
    if (b._h !== html) { b.innerHTML = html; b._h = html; }
  }

  /* ---------------- selection box ---------------- */
  let cur = null; // selected element
  function box() { let s = $('.em-sel'); if (!s) { s = document.createElement('div'); s.className = 'em-sel'; s.innerHTML = `<i class="em-mv" title="move">${ic('move')}</i><i class="em-rs" title="size"></i>`; document.body.appendChild(s); } return s; }
  function place() {
    const s = $('.em-sel');
    if (!cur || !document.body.contains(cur) || !on()) { if (s) s.hidden = true; if (cur && !document.body.contains(cur)) { cur = null; closePanel(); } return; }
    const r = cur.getBoundingClientRect(); const b = box(); b.hidden = false;
    b.style.cssText = `top:${r.top - 3}px;left:${r.left - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
  }
  window.addEventListener('scroll', () => place(), { passive: true });
  window.addEventListener('resize', () => place());
  let hov = null;
  document.addEventListener('mouseover', ev => { if (!on() || !shopView()) return; const t = ev.target.closest('#app *'); if (hov) hov.classList.remove('em-hov'); hov = t && !t.closest(UI) ? t : null; if (hov) hov.classList.add('em-hov'); });

  /* ---------------- element settings ---------------- */
  const elGet = p => { const e = get(); return ((e.el[scopeOf(p)] || {})[p]) || {}; };
  function elSet(p, patch) {
    const e = get(); const sc = scopeOf(p); e.el[sc] = e.el[sc] || {};
    const o = Object.assign({}, e.el[sc][p] || {}, patch);
    for (const k in o) if (o[k] === null || o[k] === '' || o[k] === undefined) delete o[k];
    if (Object.keys(o).length) e.el[sc][p] = o; else delete e.el[sc][p];
    save(e); css(); apply(document.body); place(); bar();
  }
  const firstText = el => { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = tw.nextNode())) { if (n.parentElement.closest(SKIP)) continue; if (n.nodeValue.trim()) { k++; if (k === 1) var f = n; } } return k && k <= 4 ? f : null; };
  const PAL = ['#fe90be', '#f066a0', '#ba2c67', '#ffe3ef', '#fef3f8', '#01cac9', '#6425fe', '#2d2930', '#6c6670', '#ffffff', '#000000', '#d4af37'];
  const rgb2hex = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || ''); if (!m || m[4] === '0') return ''; return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join(''); };
  function panel() {
    let pn = $('.em-panel'); if (!pn) { pn = document.createElement('aside'); pn.className = 'em-panel em-ui'; document.body.appendChild(pn); }
    return pn;
  }
  function closePanel() { const pn = $('.em-panel'); if (pn) pn.remove(); const s = $('.em-sel'); if (s) s.hidden = true; cur = null; }
  EM.select = function (el) {
    cur = el; const p = pathOf(el); if (!p) return;
    const o = elGet(p); const cs = getComputedStyle(el); const isImg = el.tagName === 'IMG'; const a = el.closest('a');
    const tn = isImg ? null : firstText(el);
    const T = get().t[lang()] || {}; const orig = tn ? (tn._orig || tn.nodeValue.trim()) : '';
    const fs = Math.round(parseFloat(cs.fontSize) || 16);
    const pn = panel(); place();
    const rad = o.radius != null ? o.radius : Math.min(80, Math.round(parseFloat(cs.borderTopLeftRadius) || 0));
    const sw = k => `<div class="em-sw">${PAL.map(c => `<button type="button" data-pk="${k}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-ck="${k}" value="${(k === 'color' ? o.color || rgb2hex(cs.color) : o.bg || rgb2hex(cs.backgroundColor)) || '#ffffff'}"><button type="button" class="em-x" data-pk="${k}" data-v="" title="reset">${ic('rotateL')}</button></div>`;
    pn.innerHTML = `<div class="em-hd"><b>${isImg ? W('Bild', 'صورة') : el.tagName === 'A' || el.tagName === 'BUTTON' ? W('Knopf / Link', 'زر / رابط') : W('Element', 'عنصر')}</b><span>${scopeOf(p) === '*' ? W('gilt auf allen Seiten', 'بيتطبق على كل الصفحات') : W('nur diese Seite', 'لهالصفحة بس')}</span><button type="button" class="ibtn" data-ea="close" aria-label="x">${ic('close')}</button></div>
      <div class="em-body">
        <div class="em-row"><button type="button" class="btn ghost sm" data-ea="parent">${ic('layers')} ${W('Größeren Bereich wählen', 'اختار الجزء الأكبر')}</button></div>
        ${isImg ? `<div class="em-row"><label class="btn sm up-btn">${ic('upload')} ${W('Bild ersetzen', 'غيّر الصورة')}<input type="file" accept="image/*" data-ef="img"></label><button type="button" class="btn ghost sm" data-ea="imgdel">${ic('trash')} ${W('Bild löschen', 'احذف الصورة')}</button>${get().img[el.dataset.emo || el.getAttribute('src')] ? `<button type="button" class="btn ghost sm" data-ea="imgreset">${ic('rotateL')} ${W('Original', 'الأصلية')}</button>` : ''}</div>` : ''}
        ${tn ? `<label class="em-f"><span>${W('Text', 'النص')} (${lang().toUpperCase()})</span><textarea class="in" rows="2" dir="auto" data-et="1">${esc(T[orig] != null ? T[orig] : orig)}</textarea></label>` : ''}
        ${a ? `<label class="em-f"><span>${W('Link (wohin führt der Klick)', 'الرابط (لوين بيودّي)')}</span><input class="in" dir="ltr" data-eh="1" value="${esc(o.href || a.getAttribute('href') || '')}"></label>` : ''}
        ${!isImg ? `<div class="em-f"><span>${W('Textfarbe', 'لون النص')}</span>${sw('color')}</div>` : ''}
        <div class="em-f"><span>${W('Hintergrund', 'لون الخلفية')}</span>${sw('bg')}</div>
        ${!isImg ? `<label class="em-f"><span>${W('Schriftgröße', 'حجم الخط')} <output>${o.fs || fs}px</output></span><input type="range" min="8" max="96" value="${o.fs || fs}" data-er="fs"></label>
        <div class="em-row"><button type="button" class="btn ghost sm${o.fw ? ' on' : ''}" data-ea="bold"><b>B</b> ${W('Fett', 'عريض')}</button>${['start', 'center', 'end'].map(x => `<button type="button" class="btn ghost sm${o.ta === x ? ' on' : ''}" data-ea="ta" data-v="${x}">${{ start: W('Anfang', 'بداية'), center: W('Mitte', 'وسط'), end: W('Ende', 'نهاية') }[x]}</button>`).join('')}</div>` : ''}
        <label class="em-f"><span>${W('Größe', 'الحجم')} <output>${Math.round((o.scale || 1) * 100)}%</output></span><input type="range" min="30" max="250" value="${Math.round((o.scale || 1) * 100)}" data-er="scale"></label>
        <label class="em-f"><span>${W('Runde Ecken', 'تدوير الزوايا')} <output>${rad}px</output></span><input type="range" min="0" max="80" value="${rad}" data-er="radius"></label>
        <label class="em-f"><span>${W('Sichtbarkeit', 'الشفافية')} <output>${o.op != null ? o.op : 100}%</output></span><input type="range" min="0" max="100" value="${o.op != null ? o.op : 100}" data-er="op"></label>
        <div class="em-f"><span>${W('Position', 'المكان')} <output>${o.x || 0}, ${o.y || 0}</output></span><div class="em-pad"><button type="button" data-mv="0,-1">↑</button><button type="button" data-mv="-1,0">←</button><button type="button" data-mv="1,0">→</button><button type="button" data-mv="0,1">↓</button><button type="button" data-ea="pos0">${W('zurück', 'رجّع')}</button></div><small class="muted">${W('Oder das Element direkt mit der Maus / dem Finger ziehen.', 'أو اسحب العنصر مباشرة بالماوس أو بإصبعك.')}</small></div>
        <div class="em-row em-end"><button type="button" class="btn ghost sm" data-ea="reset">${ic('rotateL')} ${W('Alles zurücksetzen', 'رجّع كل شي لهالعنصر')}</button><button type="button" class="btn sm em-del" data-ea="hide">${ic('trash')} ${o.hide ? W('Wieder zeigen', 'رجّع أظهره') : W('Löschen / ausblenden', 'احذف / أخفي')}</button></div>
      </div>`;
    pn.dataset.p = p;
    pn._ctx = { el, p, tn, orig, isImg };
  };

  /* ---------------- panel actions ---------------- */
  document.addEventListener('input', ev => {
    const pn = ev.target.closest('.em-panel'); if (!pn || !pn._ctx) return;
    const { p, orig } = pn._ctx; const el = ev.target;
    if (el.dataset.er) { const v = +el.value; const k = el.dataset.er; const out = el.closest('label').querySelector('output'); if (out) out.textContent = v + (k === 'fs' || k === 'radius' ? 'px' : '%'); const patch = k === 'scale' ? { scale: v / 100, ib: inl(pn._ctx.el) } : { [k]: v }; elSetSoon(p, patch); }
    if (el.dataset.ck) elSetSoon(p, { [el.dataset.ck]: el.value });
    if (el.dataset.et) { textSoon(orig, el.value); }
    if (el.dataset.eh) elSetSoon(p, { href: el.value.trim() || null });
  }, true);
  const inl = el => /inline$/.test(getComputedStyle(el).display) && getComputedStyle(el).display !== 'inline-block' && getComputedStyle(el).display !== 'inline-flex' ? true : null;
  let st = null; const elSetSoon = (p, patch) => { clearTimeout(st); pend = Object.assign(pend || {}, patch); st = setTimeout(() => { const x = pend; pend = null; elSet(p, x); }, 120); }; let pend = null;
  let tt = null; const textSoon = (orig, v) => { clearTimeout(tt); tt = setTimeout(() => { const e = get(); const T = e.t[lang()] = e.t[lang()] || {}; if (v.trim() && v !== orig) T[orig] = v; else delete T[orig]; save(e); $$('#app *').forEach(() => { }); refreshText(); }, 350); };
  function refreshText() { const tw = document.createTreeWalker($('#app'), NodeFilter.SHOW_TEXT); while (tw.nextNode()) { const n = tw.currentNode; if (n._orig) { const T = get().t[lang()] || {}; const want = T[n._orig] != null ? T[n._orig] : n._orig; if (n.nodeValue.trim() !== want) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), want); n._em = n.nodeValue; } } place(); }
  document.addEventListener('change', async ev => {
    const pn = ev.target.closest('.em-panel'); if (!pn || !pn._ctx || !ev.target.dataset.ef) return;
    const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
    const im = pn._ctx.el; const orig = im.dataset.emo || im.getAttribute('src');
    C.toast(W('Bild wird geladen …', 'عم تنحمل الصورة …'));
    try { const r = await ST.readImage(f, 1600, /png|webp|svg/.test(f.type)); const id = await ST.photoPut(r.blob); const e = get(); e.img[orig] = id; save(e); im.dataset.emo = orig; im.dataset.emset = ''; im.style.visibility = ''; apply(document.body); C.toast(W('Gespeichert ✓', 'تم الحفظ ✓')); bar(); }
    catch (er) { C.toast(W('Bild konnte nicht geladen werden', 'ما قدرنا نحمل الصورة'), 'err'); }
  }, true);
  document.addEventListener('click', ev => {
    const pn = ev.target.closest('.em-panel'); if (!pn || !pn._ctx) return;
    const b = ev.target.closest('[data-ea],[data-pk],[data-mv]'); if (!b) return;
    const { el, p } = pn._ctx; const o = elGet(p);
    if (b.dataset.pk) return elSet(p, { [b.dataset.pk]: b.dataset.v || null }), EM.select(el);
    if (b.dataset.mv) { const [dx, dy] = b.dataset.mv.split(',').map(Number); const k = ev.shiftKey ? 20 : 4; elSet(p, { x: (o.x || 0) + dx * k, y: (o.y || 0) + dy * k, ib: inl(el) }); return EM.select(el); }
    const a = b.dataset.ea;
    if (a === 'close') return closePanel();
    if (a === 'parent') { const up = el.parentElement; if (up && up !== $('#app') && $('#app').contains(up)) EM.select(up); return; }
    if (a === 'bold') elSet(p, { fw: o.fw ? null : 700 });
    if (a === 'ta') elSet(p, { ta: o.ta === b.dataset.v ? null : b.dataset.v });
    if (a === 'pos0') elSet(p, { x: null, y: null });
    if (a === 'hide') elSet(p, { hide: o.hide ? null : true });
    if (a === 'reset') { const e = get(); delete (e.el[scopeOf(p)] || {})[p]; save(e); css(); }
    if (a === 'imgdel' || a === 'imgreset') { const orig = el.dataset.emo || el.getAttribute('src'); const e = get(); if (a === 'imgdel') { e.img[orig] = 'none'; el.dataset.emo = orig; } else { delete e.img[orig]; el.style.visibility = ''; } save(e); if (a === 'imgreset') { location.reload(); return; } apply(document.body); }
    bar(); if (document.body.contains(el)) EM.select(el); else closePanel();
  });

  /* ---------------- clicking & dragging on the page ---------------- */
  let drag = null, justDragged = false;
  document.addEventListener('pointerdown', ev => {
    if (!on() || !shopView() || ev.button > 0) return;
    if (ev.target.closest('.em-rs') && cur) { const p = pathOf(cur); drag = { mode: 'rs', p, x0: ev.clientX, y0: ev.clientY, s0: elGet(p).scale || 1, w0: cur.getBoundingClientRect().width, moved: false }; ev.preventDefault(); return; }
    const t = ev.target.closest('.em-mv') ? cur : ev.target.closest('#app *');
    if (!t || t.closest(UI) || !cur || !(t === cur || cur.contains(t))) return;
    const p = pathOf(cur); const o = elGet(p);
    drag = { mode: 'mv', p, x0: ev.clientX, y0: ev.clientY, ox: o.x || 0, oy: o.y || 0, moved: false };
  }, true);
  document.addEventListener('pointermove', ev => {
    if (!drag) return; const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true; ev.preventDefault();
    if (drag.mode === 'mv') { cur.style.setProperty('translate', `${drag.ox + dx}px ${drag.oy + dy}px`, 'important'); cur.style.setProperty('position', 'relative'); if (inl(cur)) cur.style.display = 'inline-block'; }
    else { const s = Math.max(.3, Math.min(2.5, drag.s0 * (drag.w0 + dx * (document.documentElement.dir === 'rtl' ? -1 : 1)) / drag.w0)); cur.style.setProperty('scale', String(Math.round(s * 100) / 100), 'important'); }
    place();
  }, { passive: false });
  document.addEventListener('pointerup', ev => {
    if (!drag) return; const d = drag; drag = null; if (!d.moved) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 50);
    const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; const el = cur;
    el.style.removeProperty('translate'); el.style.removeProperty('scale'); el.style.removeProperty('position'); el.style.removeProperty('display');
    if (d.mode === 'mv') elSet(d.p, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy), ib: inl(el) });
    else elSet(d.p, { scale: Math.round(Math.max(.3, Math.min(2.5, d.s0 * (d.w0 + dx * (document.documentElement.dir === 'rtl' ? -1 : 1)) / d.w0)) * 100) / 100, ib: inl(el) });
    EM.select(el);
  });
  document.addEventListener('click', ev => {
    const c = ev.target.closest('[data-em]');
    if (c && c.closest('.em-bar')) {
      ev.preventDefault(); ev.stopPropagation(); const k = c.dataset.em;
      if (k === 'on') { ST.set('editMode', true); C.toast(W('Tippe auf irgendetwas, um es zu ändern', 'اكبس على أي شي لتعدّله')); }
      if (k === 'off') { ST.set('editMode', false); closePanel(); }
      if (k === 'list') EM.list();
      if (k === 'undo' && undo.length) { ST.set(KEY, JSON.parse(undo.pop())); css(); location.reload(); return; }
      bar(); apply(document.body); return;
    }
    if (!on() || !shopView()) return;
    if (ev.target.closest(UI + ',.cookie,#toast,.ov')) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    if (justDragged) return;
    const t = ev.target.closest('#app *'); if (!t) return;
    const target = t.closest('svg') ? (t.closest('svg').parentElement || t) : t;
    EM.select(target);
  }, true);
  ['submit', 'input', 'change', 'keydown'].forEach(tp => document.addEventListener(tp, ev => {
    if (!on() || !shopView() || ev.target.closest(UI + ',.ov')) return;
    if (tp === 'keydown') { if (!$('.em-panel') || !cur) return; const k = ev.key; const p = pathOf(cur); const o = elGet(p); const mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]; if (mv) { ev.preventDefault(); const s = ev.shiftKey ? 20 : 2; elSet(p, { x: (o.x || 0) + mv[0] * s, y: (o.y || 0) + mv[1] * s, ib: inl(cur) }); EM.select(cur); } if (k === 'Escape') closePanel(); if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); elSet(p, { hide: o.hide ? null : true }); EM.select(cur); } return; }
    if (tp === 'submit') ev.preventDefault(); ev.stopImmediatePropagation();
  }, true));

  /* ---------------- list of all changes ---------------- */
  EM.list = function () {
    const e = get(); const T = e.t[lang()] || {}; const H = e.hide[lang()] || [];
    const els = []; for (const sc in e.el) for (const p in e.el[sc]) els.push([sc, p, e.el[sc][p]]);
    const ov = C.sheet({ title: W('Alle Änderungen', 'كل التعديلات'), kind: 'modal' }); ov.classList.add('em-dlg');
    const lab = o => Object.keys(o).filter(k => k !== 'ib').map(k => ({ color: W('Farbe', 'لون'), bg: W('Hintergrund', 'خلفية'), fs: W('Schrift', 'خط'), fw: W('fett', 'عريض'), scale: W('Größe', 'حجم'), x: W('Position', 'مكان'), y: '', radius: W('Ecken', 'زوايا'), op: W('Sichtbarkeit', 'شفافية'), hide: W('gelöscht', 'محذوف'), href: 'Link', ta: W('Ausrichtung', 'محاذاة') }[k])).filter(Boolean).join(', ');
    const rows = Object.entries(T).map(([o, v]) => `<li><span><s>${esc(o.slice(0, 70))}</s><br><b>${esc(v.slice(0, 100))}</b></span><button class="ibtn" data-x="t" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('')
      + H.map(o => `<li><span>${W('Ausgeblendet', 'مخفي')}: <b>${esc(o.slice(0, 70))}</b></span><button class="ibtn" data-x="h" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('')
      + Object.keys(e.img).map(o => `<li><span>${W('Bild', 'صورة')}: ${esc(o.split('/').pop().slice(0, 40))}${e.img[o] === 'none' ? ' · ' + W('gelöscht', 'محذوفة') : ''}</span><button class="ibtn" data-x="i" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('')
      + els.map(([sc, p, o]) => `<li><span>${sc === '*' ? W('Alle Seiten', 'كل الصفحات') : esc(sc)} · <b>${esc(lab(o))}</b><br><small class="muted">${esc(p.split(' > ').slice(-2).join(' › ').replace(/:nth-child\(\d+\)/g, ''))}</small></span><button class="ibtn" data-x="e" data-s="${esc(sc)}" data-k="${esc(p)}" aria-label="x">${ic('trash')}</button></li>`).join('');
    ov.body.innerHTML = rows ? `<ul class="em-list">${rows}</ul>` : `<p class="muted">${W('Noch keine Änderungen.', 'لسا ما في تعديلات.')}</p>`;
    ov.foot.innerHTML = `${rows ? `<button class="btn ghost danger" data-x="all">${ic('trash')} ${W('Alles zurücksetzen', 'رجّع الموقع متل ما كان')}</button>` : ''}<button class="btn" data-act="close">${W('Schließen', 'إغلاق')}</button>`;
    ov.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-x]'); if (!b) return; const e2 = get(); const k = b.dataset.k;
      if (b.dataset.x === 'all') { if (!(await C.confirm(W('Wirklich alle Änderungen löschen?', 'أكيد بدك تمسح كل التعديلات؟'), W('Ja, löschen', 'إيه، امسح'), W('Abbrechen', 'إلغاء')))) return; save({ t: {}, img: {}, hide: {}, el: {} }); location.reload(); return; }
      if (b.dataset.x === 't') delete (e2.t[lang()] || {})[k];
      if (b.dataset.x === 'h') e2.hide[lang()] = (e2.hide[lang()] || []).filter(x => x !== k);
      if (b.dataset.x === 'i') delete e2.img[k];
      if (b.dataset.x === 'e') delete (e2.el[b.dataset.s] || {})[k];
      save(e2); location.reload();
    });
  };
  EM.apply = apply;
  window.addEventListener('hashchange', () => { closePanel(); setTimeout(() => { apply(document.body); bar(); }, 0); });
  setTimeout(() => { apply(document.body); bar(); }, 0);
})();
