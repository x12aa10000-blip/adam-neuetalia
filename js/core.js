/* Core helpers: i18n, formatting, router, overlays, downloads, PDF writer. */
(function () {
  'use strict';
  const C = {};
  window.C = C;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Object.assign(C, { $, $$, esc });
  window.$ = $; window.$$ = $$; window.esc = esc;

  /* ---------------- language ---------------- */
  let LANG = ST.get('lang', null);
  if (!LANG) { const n = (navigator.language || 'de').slice(0, 2); LANG = n === 'ar' ? 'ar' : 'de'; }
  C.lang = () => LANG;
  C.setLang = function (l) { if (!['de', 'en', 'ar'].includes(l)) return; LANG = l; ST.set('lang', l); C.applyLang(); };
  C.applyLang = function () { document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr'; };
  const t = function (k, v, lang) {
    const D = window.I18N || {}; const l = lang || LANG;
    let s = (D[l] && D[l][k] != null) ? D[l][k] : (D.de && D.de[k] != null ? D.de[k] : k);
    if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  };
  const L = (o, lang) => o == null ? '' : (typeof o === 'string' ? o : (o[lang || LANG] != null && o[lang || LANG] !== '' ? o[lang || LANG] : (o.de != null ? o.de : (o.en || ''))));
  window.t = t; window.L = L; C.t = t; C.L = L;
  const LOC = { de: 'de-DE', en: 'en-GB', ar: 'ar-u-nu-latn' };
  C.loc = () => LOC[LANG];
  const eur = (n, lang) => Number(n || 0).toLocaleString(LOC[lang || LANG], { style: 'currency', currency: 'EUR' });
  window.eur = eur; C.eur = eur;
  C.date = function (d, opt, lang) { if (!d) return ''; if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, dd] = d.split('-').map(Number); d = new Date(y, m - 1, dd, 12); } else d = new Date(d); return d.toLocaleDateString(LOC[lang || LANG], opt || { weekday: 'short', day: 'numeric', month: 'long' }); };
  C.dt = function (d, lang) { d = new Date(d); return d.toLocaleDateString(LOC[lang || LANG], { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString(LOC[lang || LANG], { hour: '2-digit', minute: '2-digit' }); };
  C.ago = function (ts) { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return t('just_now'); if (m < 60) return t('min_ago', { n: m }); const h = Math.round(m / 60); if (h < 24) return t('h_ago', { n: h }); return C.date(ts, { day: 'numeric', month: 'short' }); };

  /* ---------------- icons (stroke, 24px) ---------------- */
  const P = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', back: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    camera: '<path d="M4 8.5h3.2L8.8 6h6.4l1.6 2.5H20v10.5H4z"/><circle cx="12" cy="13.3" r="3.4"/>',
    truck: '<path d="M3 6.5h11v9H3zM14 10h3.5l3 3v2.5H14z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
    store: '<path d="M4 9.5 5.5 4.5h13L20 9.5M4.5 9.5V20h15V9.5"/><path d="M4 9.5c0 1.5 1.2 2.5 2.7 2.5S9.3 11 9.3 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.6 2.5S20 11 20 9.5"/><path d="M10 20v-4.5h4V20"/>',
    bike: '<circle cx="6" cy="16.5" r="3"/><circle cx="18" cy="16.5" r="3"/><path d="M6 16.5 9.5 9h5l3.5 7.5M9.5 9 12 16.5h-6M13.5 6.5h2.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-1.5-3.5-5.5-3.5-5.5-1.2S10 7 12 7zm0 0c1.5-3.5 5.5-3.5 5.5-1.2S14 7 12 7z"/>',
    pin: '<path d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.9 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4.5 18.5 5.6 15A7.5 7.5 0 1 1 9 18.4z"/>',
    mail: '<path d="M3.5 6h17v12h-17z"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18h7.3a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6h7.3"/>',
    upload: '<path d="M12 16V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v4.5h15V15"/>',
    rotate: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.5 4.5V8h-3.5"/>',
    rotateL: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M4.5 4.5V8H8"/>',
    zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8v6M8 11h6"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/>',
    edit: '<path d="M4.5 19.5 5.5 15 15.5 5a2.1 2.1 0 0 1 3 3l-10 10z"/>',
    share: '<circle cx="6.5" cy="12" r="2.3"/><circle cx="17.5" cy="6" r="2.3"/><circle cx="17.5" cy="18" r="2.3"/><path d="m8.5 11 7-4M8.5 13l7 4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 4.5V16M7.5 11.5 12 16l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    print: '<path d="M7 9V4h10v5M7 17H4.5V9.5h15V17H17"/><path d="M7 14h10v6H7z"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    box: '<path d="m12 3.5 8 4v9l-8 4-8-4v-9z"/><path d="m4 7.5 8 4 8-4M12 11.5v9"/>',
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    tag: '<path d="M3.5 12V4h8l9 9-8 8z"/><circle cx="8" cy="8.5" r="1.4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3 3.2-4.5 6-4.5s5.1 1.5 6 4.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.3.1 4 1.5 4.8 4"/>',
    inbox: '<path d="M3.5 13 6 5h12l2.5 8v6.5h-17z"/><path d="M3.5 13H9l1 2.5h4l1-2.5h5.5"/>',
    alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.5"/>',
    home: '<path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5"/>',
    logout: '<path d="M14 4.5H5v15h9M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5"/>',
    wand: '<path d="m4 20 11-11M14 4v3M18.5 6.5l-2 2M20 11h-3M15 9l1 1"/>',
    copy: '<path d="M8 8h11v11H8z"/><path d="M5 15.5V5h10.5"/>',
    calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3.5V7M16 3.5V7"/>',
    text: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
    image: '<path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
    move: '<path d="M12 3.5v17M3.5 12h17M9.5 6 12 3.5 14.5 6M9.5 18l2.5 2.5 2.5-2.5M6 9.5 3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    cards: '<path d="M3.5 6.5h17v11h-17zM3.5 10h17"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    sparkle: '<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5zM18.5 15.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z"/>',
    card: '<path d="M4 5.5h16v13H4z"/><path d="m4 6 8 6.5L20 6"/><path d="M9 15.5h6"/>',
    ribbon: '<path d="M12 9c-2-4-6.5-4.5-6.5-2S9 9 12 9zm0 0c2-4 6.5-4.5 6.5-2S15 9 12 9z"/><path d="M12 9l-3.5 11 3.5-3 3.5 3z"/>'
  };
  C.ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  window.ic = C.ic;

  /* ---------------- router ---------------- */
  const routes = [];
  C.route = (re, fn) => routes.push([re, fn]);
  C.go = function (h, opts) { opts = opts || {}; if (location.hash === h) { C.dispatch(opts); return; } C._nextOpts = opts; location.hash = h; };
  C.path = () => (location.hash || '#/').replace(/^#/, '') || '/';
  C.dispatch = function (opts) {
    opts = opts || C._nextOpts || {}; C._nextOpts = null;
    const p = C.path();
    C.closeAll();
    for (const [re, fn] of routes) { const m = p.match(re); if (m) { fn(...m.slice(1).map(x => x && decodeURIComponent(x)), opts); if (!opts.keepScroll) window.scrollTo(0, opts.y || 0); return; } }
    C.go('#/');
  };
  window.addEventListener('hashchange', () => C.dispatch());

  /* ---------------- overlays ---------------- */
  let toastT;
  C.toast = function (msg, kind) {
    let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.className = 'toast ' + (kind || ''); el.textContent = msg; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.hidden = true, 250); }, 3200);
  };
  C.closeAll = function () { $$('.ov').forEach(e => e.remove()); document.body.classList.remove('noscroll'); };
  /** side sheet (start|end) or centered modal; returns element with .body/.foot */
  C.sheet = function (opt) {
    C.closeAll();
    const ov = document.createElement('div'); ov.className = 'ov ' + (opt.kind || 'side');
    ov.innerHTML = `<div class="ov-bg" data-act="close"></div><section class="ov-panel${opt.wide ? ' wide' : ''}${opt.start ? ' start' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opt.title || '')}">
      <header class="ov-head"><h2>${esc(opt.title || '')}</h2><button class="ibtn" data-act="close" aria-label="${esc(t('close'))}">${ic('close')}</button></header>
      <div class="ov-body"></div>${opt.foot === false ? '' : '<footer class="ov-foot"></footer>'}</section>`;
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    requestAnimationFrame(() => ov.classList.add('in'));
    ov.body = $('.ov-body', ov); ov.foot = $('.ov-foot', ov); ov.panel = $('.ov-panel', ov);
    const f = $('button,input,select,textarea,a[href]', ov.panel); if (f && !opt.noFocus) setTimeout(() => f.focus({ preventScroll: true }), 60);
    return ov;
  };
  C.confirm = function (msg, yes, no) {
    return new Promise(res => {
      const ov = C.sheet({ title: msg, kind: 'modal' });
      ov.body.remove(); ov.foot.innerHTML = `<button class="btn ghost" data-r="0">${esc(no || t('cancel'))}</button><button class="btn" data-r="1">${esc(yes || t('ok'))}</button>`;
      ov.addEventListener('click', e => { const b = e.target.closest('[data-r],[data-act=close]'); if (!b) return; const r = b.dataset.r === '1'; C.closeAll(); res(r); });
    });
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.ov')) { C.closeAll(); if (C.onClose) C.onClose(); } });

  /* ---------------- downloads ---------------- */
  let DL = null; async function getDL() { return null; }
  C.save = async function (filename, data) {
    const dl = await getDL();
    if (dl) {
      try { await dl.save({ filename, data }); return true; }
      catch (e) { if (e && e.code === 'declined') return false; if (e && e.code === 'rate_limited') { C.toast(t('dl_wait')); return false; } }
    }
    try {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return true;
    } catch (e) { C.toast(t('dl_fail'), 'err'); return false; }
  };
  C.canvasBlob = (c, type, q) => new Promise(r => c.toBlob(b => r(b), type || 'image/png', q || .92));
  /** add pHYs DPI chunk to PNG */
  C.pngDPI = async function (blob, dpi) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const ppm = Math.round(dpi / 0.0254);
    const ch = new Uint8Array(21); const dv = new DataView(ch.buffer);
    dv.setUint32(0, 9); ch.set([112, 72, 89, 115], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1; dv.setUint32(17, crc32(ch.subarray(4, 17)));
    const out = new Uint8Array(buf.length + 21); out.set(buf.subarray(0, 33), 0); out.set(ch, 33); out.set(buf.subarray(33), 54);
    return new Blob([out], { type: 'image/png' });
  };
  const CRC = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /* ---------------- minimal PDF writer (JPEG pages / images) ---------------- */
  /** pages: [{w,h (mm), images:[{jpeg:Uint8Array, pw,ph (px), x,y,w,h (mm)}]}] */
  C.pdf = function (pages, meta) {
    const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0;
    const push = s => { const b = typeof s === 'string' ? enc.encode(s) : s; parts.push(b); len += b.length; };
    const objs = []; const add = (body) => { objs.push(body); return objs.length; };
    const mm = v => (v * 72 / 25.4).toFixed(2);
    const pageIds = []; const kidsRef = [];
    const catalogId = 1, pagesId = 2; objs.push(null, null);
    for (const pg of pages) {
      const xo = []; let content = '';
      pg.images.forEach((im, i) => {
        const id = add({ stream: im.jpeg, dict: `/Type /XObject /Subtype /Image /Width ${im.pw} /Height ${im.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode` });
        xo.push(`/Im${i} ${id} 0 R`);
        content += `q ${mm(im.w)} 0 0 ${mm(im.h)} ${mm(im.x)} ${mm(pg.h - im.y - im.h)} cm /Im${i} Do Q\n`;
      });
      const cid = add({ stream: enc.encode(content), dict: '' });
      const pid = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${mm(pg.w)} ${mm(pg.h)}] /Resources << /XObject << ${xo.join(' ')} >> >> /Contents ${cid} 0 R >>`);
      pageIds.push(pid); kidsRef.push(`${pid} 0 R`);
    }
    objs[0] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[1] = `<< /Type /Pages /Kids [${kidsRef.join(' ')}] /Count ${pageIds.length} >>`;
    const info = add(`<< /Title (${(meta && meta.title || 'Dokument').replace(/[()\\]/g, '')}) /Producer (Adam & Neuetalia Shop) >>`);
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    objs.forEach((o, i) => {
      offs[i] = len;
      push(`${i + 1} 0 obj\n`);
      if (typeof o === 'string') push(o + '\n');
      else { push(`<< ${o.dict} /Length ${o.stream.length} >>\nstream\n`); push(o.stream); push('\nendstream\n'); }
      push('endobj\n');
    });
    const xref = len;
    let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offs.forEach(o => { x += String(o).padStart(10, '0') + ' 00000 n \n'; });
    push(x + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  };
  C.jpegBytes = async function (canvas, q) { const b = await C.canvasBlob(canvas, 'image/jpeg', q || .9); return new Uint8Array(await b.arrayBuffer()); };

  /* ---------------- canvas document drawing (A4 pages rendered with our fonts) ---------------- */
  C.Doc = function (wmm, hmm, dpi) {
    const k = (dpi || 150) / 25.4; const c = ENG.canvas(wmm * k, hmm * k); const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.textBaseline = 'alphabetic';
    const D = {
      c, x, k, w: wmm, h: hmm,
      font(size, weight, fam) { x.font = `${weight || 400} ${size * k * 0.3528}px ${fam || '"ui-sans", "ui-ar"'}`; return D; },
      text(s, X, Y, o) { o = o || {}; x.fillStyle = o.color || '#1c1819'; x.textAlign = o.align || 'left'; x.direction = /[؀-ۿ]/.test(s) ? 'rtl' : 'ltr'; if (x.direction === 'rtl') x.textAlign = o.align === 'right' ? 'left' : o.align === 'left' ? 'right' : (o.align || 'right'); if (o.max) { let str = String(s); while (x.measureText(str).width > o.max * k && str.length > 2) str = str.slice(0, -2) + '…'; s = str; } x.fillText(String(s), X * k, Y * k); x.direction = 'ltr'; return D; },
      wrap(s, X, Y, maxW, lh) { const words = String(s || '').split(/\s+/); let line = '', yy = Y; for (const w of words) { const tr = line ? line + ' ' + w : w; if (x.measureText(tr).width > maxW * k && line) { D.text(line, X, yy); line = w; yy += lh; } else line = tr; } if (line) D.text(line, X, yy); return yy; },
      rect(X, Y, W, H, fill) { x.fillStyle = fill; x.fillRect(X * k, Y * k, W * k, H * k); return D; },
      line(x1, y1, x2, y2, col, wd) { x.strokeStyle = col || '#1c1819'; x.lineWidth = (wd || .3) * k; x.beginPath(); x.moveTo(x1 * k, y1 * k); x.lineTo(x2 * k, y2 * k); x.stroke(); return D; },
      img(im, X, Y, W, H) { if (im) x.drawImage(im, X * k, Y * k, W * k, H * k); return D; },
      measure(s) { return x.measureText(s).width / k; }
    };
    return D;
  };
  C.docsToPdf = async function (docs, title) {
    const pages = [];
    for (const d of docs) pages.push({ w: d.w, h: d.h, images: [{ jpeg: await C.jpegBytes(d.c, .92), pw: d.c.width, ph: d.c.height, x: 0, y: 0, w: d.w, h: d.h }] });
    return C.pdf(pages, { title });
  };
  C.loadImg = src => ENG.img(src);

  /* load JSZip lazily */
  let zipP = null;
  C.zip = function () { if (window.JSZip) return Promise.resolve(window.JSZip); if (zipP) return zipP; zipP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/jszip.min.js'; s.onload = () => res(window.JSZip); s.onerror = rej; document.head.appendChild(s); }); return zipP; };

  /* misc */
  C.debounce = (fn, ms) => { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; };
  C.reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  C.lev = function (a, b) { if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n; let prev = Array.from({ length: n + 1 }, (_, i) => i); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
  C.norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
})();
