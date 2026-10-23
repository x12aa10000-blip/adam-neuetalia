/* Live preview engine: renders a customer's design directly onto the original product photo.
   Text and photos are laid out flat, then warped (perspective / cylinder / bow) into the zone of the photo,
   and composited with the material effect (engraving, foil, embroidery, glow ...). */
(function () {
  'use strict';
  const ENG = {};
  window.ENG = ENG;

  /* ---------------- fonts ---------------- */
  const META = () => window.FONTMETA || {};
  const fam = id => 'pf_' + id;
  const fState = {}, fBuf = {};
  // Latin fonts without Turkish/extended glyphs fall back to a close relative that has them
  const TRFALL = { monsieur: 'msmadi', mrssaint: 'msmadi', satisfy: 'dancingm', cookie: 'damion', homemade: 'caveat', reenie: 'caveat', herrvon: 'msmadi', lobsteri: 'kaushan', arvo: 'robotoslab' };
  const ARFALL = { script: 'ruqaa', hand: 'ruqaa', serif: 'amiri', sans: 'plexar', slab: 'plexar', arabic: null };
  ENG.fam = fam;
  ENG.loadFont = function (id) {
    if (!META()[id]) id = 'times';
    if (fState[id]) return fState[id];
    fState[id] = fetch('fonts/' + id + '.ttf').then(r => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); })
      .then(buf => { fBuf[id] = buf; const ff = new FontFace(fam(id), buf.slice(0)); return ff.load(); })
      .then(ff => { document.fonts.add(ff); return true; })
      .catch(() => false);
    return fState[id];
  };
  ENG.fontBuffer = id => fBuf[id];
  ENG.fontReady = id => !!fBuf[id];
  const isAr = s => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s || '');
  ENG.isAr = isAr;
  function familyList(id, txt) {
    const m = META()[id] || { kind: 'serif' };
    const list = [];
    if (isAr(txt) && !m.ar) list.push(ENG.arFont(id));
    list.push(id);
    if (TRFALL[id]) list.push(TRFALL[id]);
    return list.filter(Boolean);
  }
  ENG.arFont = function (id) { const m = META()[id] || { kind: 'serif' }; return m.ar ? id : (ARFALL[m.kind] || 'amiri'); };
  ENG.fontsFor = function (id, txt) { return familyList(id, txt); };
  function cssFont(id, px, txt) { return `${px}px ${familyList(id, txt).map(f => '"' + fam(f) + '"').join(', ')}, serif`; }
  ENG.cssFont = cssFont;

  /* ---------------- images ---------------- */
  const IMG = new Map();
  ENG.img = function (src) {
    if (!src) return Promise.resolve(null);
    if (IMG.has(src)) return IMG.get(src);
    const p = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    IMG.set(src, p);
    return p;
  };

  /* ---------------- geometry ---------------- */
  function boxQuad(b) {
    const [cx, cy, w, h, r] = b; const a = (r || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const P = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
    return [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];
  }
  ENG.boxQuad = boxQuad;
  function sq2quad(q) {
    const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    let g = 0, h = 0;
    if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1; g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den; }
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
    return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
  }
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  function quadOf(z) { return z.q || boxQuad(z.b); }
  ENG.quadOf = quadOf;
  function flatSize(z) {
    const q = quadOf(z);
    let w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
    if (z.cyl) w *= z.cyl / Math.sin(z.cyl);
    return [w, h];
  }
  ENG.flatSize = flatSize;
  function zoneMap(z) {
    const H = sq2quad(quadOf(z));
    const cyl = z.cyl || 0;
    const bow = z.bow == null ? null : (Array.isArray(z.bow) ? z.bow : [z.bow, z.bow]);
    return (u, v) => {
      let uu = u;
      if (cyl) uu = (Math.sin((2 * u - 1) * cyl) / Math.sin(cyl) + 1) / 2;
      const p = H(uu, v);
      if (bow) { const t = 2 * uu - 1; p[1] += (bow[0] * (1 - v) + bow[1] * v) * (1 - t * t); }
      return p;
    };
  }
  ENG.zoneMap = zoneMap;

  function affine(s, d) { // maps src triangle s -> dst triangle d, returns [a,b,c,d,e,f]
    const [x0, y0] = s[0], [x1, y1] = s[1], [x2, y2] = s[2];
    const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
    if (Math.abs(den) < 1e-9) return null;
    const solve = (u0, u1, u2) => [
      (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den,
      (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den,
      (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den];
    const U = solve(d[0][0], d[1][0], d[2][0]), V = solve(d[0][1], d[1][1], d[2][1]);
    return [U[0], V[0], U[1], V[1], U[2], V[2]];
  }
  function tri(ctx, img, s, d, sc) {
    const m = affine(s, d); if (!m) return;
    const cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3;
    ctx.save();
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const dx = d[i][0] - cx, dy = d[i][1] - cy, l = Math.hypot(dx, dy) || 1, e = 0.9 / sc;
      const x = d[i][0] + dx / l * e, y = d[i][1] + dy / l * e;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.clip();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  // draw flat canvas `src` (covering u in [-pu,1+pu], v in [-pv,1+pv]) into ctx through map
  function warp(ctx, src, map, pu, pv, sc, quality) {
    const W = src.width, H = src.height;
    const nx = Math.max(3, Math.min(quality || 22, Math.round(W / 26)));
    const ny = Math.max(2, Math.min(quality || 22, Math.round(H / 26)));
    const U = i => -pu + (1 + 2 * pu) * i / nx, V = j => -pv + (1 + 2 * pv) * j / ny;
    const D = [];
    for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) row.push(map(U(i), V(j))); D.push(row); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const s00 = [W * i / nx, H * j / ny], s10 = [W * (i + 1) / nx, H * j / ny], s01 = [W * i / nx, H * (j + 1) / ny], s11 = [W * (i + 1) / nx, H * (j + 1) / ny];
      tri(ctx, src, [s00, s10, s11], [D[j][i], D[j][i + 1], D[j + 1][i + 1]], sc);
      tri(ctx, src, [s00, s11, s01], [D[j][i], D[j + 1][i + 1], D[j + 1][i]], sc);
    }
  }
  ENG.warp = warp;

  /* ---------------- canvas helpers ---------------- */
  function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  ENG.canvas = cv;
  function blurCanvas(src, r) { // cheap blur by scaling (works on every browser)
    if (!r || r < 0.4) return src;
    const k = 1 / (1 + r * 0.9);
    const a = cv(src.width * k, src.height * k), ac = a.getContext('2d');
    ac.imageSmoothingQuality = 'high'; ac.drawImage(src, 0, 0, a.width, a.height);
    const b = cv(src.width, src.height), bc = b.getContext('2d');
    bc.imageSmoothingQuality = 'high'; bc.drawImage(a, 0, 0, b.width, b.height);
    return b;
  }
  ENG.blurCanvas = blurCanvas;
  function tint(src, fill) { const c = cv(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); return c; }
  function hex2rgb(h) { h = (h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  ENG.hex2rgb = hex2rgb;
  function heartPath(c, x, y, w, h) { // top-left box
    const cx = x + w / 2;
    c.moveTo(cx, y + h * .28);
    c.bezierCurveTo(cx, y + h * .1, cx - w * .14, y, cx - w * .28, y);
    c.bezierCurveTo(cx - w * .46, y, cx - w * .5, y + h * .17, cx - w * .5, y + h * .3);
    c.bezierCurveTo(cx - w * .5, y + h * .56, cx - w * .2, y + h * .76, cx, y + h);
    c.bezierCurveTo(cx + w * .2, y + h * .76, cx + w * .5, y + h * .56, cx + w * .5, y + h * .3);
    c.bezierCurveTo(cx + w * .5, y + h * .17, cx + w * .46, y, cx + w * .28, y);
    c.bezierCurveTo(cx + w * .14, y, cx, y + h * .1, cx, y + h * .28);
    c.closePath();
  }
  ENG.heartPath = heartPath;

  /* ---------------- symbols inside text ---------------- */
  const SYM = { '♥': 'heart', '♡': 'heartO', '∞': 'inf', '★': 'star', '✦': 'spark', '✝': 'cross', '☾': 'moon', '✿': 'flower' };
  ENG.SYMBOLS = Object.keys(SYM);
  function symW(k, fs) { return ({ heart: .78, heartO: .78, inf: 1.1, star: .82, spark: .7, cross: .55, moon: .7, flower: .8 })[k] * fs * .62; }
  function drawSym(c, k, x, base, fs, stroke) {
    const w = symW(k, fs), h = fs * .5, y = base - fs * .52;
    c.save(); c.beginPath();
    if (k === 'heart' || k === 'heartO') { heartPath(c, x, y, w, h * 1.02); if (k === 'heartO') { c.lineWidth = Math.max(1, fs * .045); c.stroke(); } else c.fill(); }
    else if (k === 'inf') { const cx = x + w / 2, cy = y + h / 2, a = w / 2, b = h * .42; c.lineWidth = Math.max(1, fs * .05); c.moveTo(cx, cy); c.bezierCurveTo(cx + a * .4, cy - b * 1.3, cx + a, cy - b * 1.3, cx + a, cy); c.bezierCurveTo(cx + a, cy + b * 1.3, cx + a * .4, cy + b * 1.3, cx, cy); c.bezierCurveTo(cx - a * .4, cy - b * 1.3, cx - a, cy - b * 1.3, cx - a, cy); c.bezierCurveTo(cx - a, cy + b * 1.3, cx - a * .4, cy + b * 1.3, cx, cy); c.stroke(); }
    else if (k === 'star' || k === 'spark') { const cx = x + w / 2, cy = y + h / 2, R = w / 2, r = R * (k === 'star' ? .45 : .22), n = k === 'star' ? 5 : 4; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; i ? c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : c.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } c.closePath(); c.fill(); }
    else if (k === 'cross') { const t = w * .26; c.rect(x + w / 2 - t / 2, y - h * .1, t, h * 1.2); c.rect(x, y + h * .2, w, t); c.fill(); }
    else if (k === 'moon') { const cx = x + w / 2, cy = y + h / 2, R = h * .55; c.arc(cx, cy, R, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(cx + R * .45, cy - R * .2, R * .85, 0, Math.PI * 2); c.fill(); }
    else if (k === 'flower') { const cx = x + w / 2, cy = y + h / 2, R = h * .3; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.moveTo(cx + Math.cos(a) * R * 1.4 + R * .8, cy + Math.sin(a) * R * 1.4); c.arc(cx + Math.cos(a) * R * 1.4, cy + Math.sin(a) * R * 1.4, R * .8, 0, Math.PI * 2); } c.fill(); }
    c.restore();
  }
  function runs(txt) { const out = []; let cur = ''; for (const ch of Array.from(txt)) { if (SYM[ch]) { if (cur) out.push({ t: cur }); out.push({ s: SYM[ch] }); cur = ''; } else cur += ch; } if (cur) out.push({ t: cur }); return out; }

  /* ---------------- text formatting ---------------- */
  const MONTHS = {
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  };
  ENG.MONTHS = MONTHS;
  function roman(n) { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; }
  function parseDate(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  ENG.parseDate = parseDate;
  const p2 = n => String(n).padStart(2, '0');
  function fmt(val, f, lang) {
    if (val == null) return '';
    if (!f) return String(val);
    const d = parseDate(val);
    switch (f) {
      case 'upper': return String(val).toLocaleUpperCase('de-DE');
      case 'c0': case 'c1': case 'c2': { const a = Array.from(String(val).replace(/\s+/g, '')); return a[+f[1]] || ''; }
      case 'dmy': return d ? `${p2(d.d)}.${p2(d.m)}.${d.y}` : val;
      case 'dmyDash': return d ? `${p2(d.d)}-${p2(d.m)}-${d.y}` : val;
      case 'dmyDot': return d ? `${p2(d.d)}·${p2(d.m)}·${d.y}` : val;
      case 'dmyShort': return d ? `${p2(d.d)}.${p2(d.m)}.${String(d.y).slice(2)}` : val;
      case 'dm': return d ? `${d.d}/${d.m}` : val;
      case 'mdyDot': return d ? `${p2(d.m)}·${p2(d.d)}·${d.y}` : val;
      case 'roman': return d ? `${roman(d.d)}.${roman(d.m)}.${roman(d.y)}` : val;
      case 'year': return d ? String(d.y) : val;
      case 'monthYear': return d ? `${(MONTHS[lang] || MONTHS.de)[d.m - 1]} ${d.y}` : val;
      case 'month': return d ? (MONTHS[lang] || MONTHS.de)[d.m - 1] : val;
      default: return String(val);
    }
  }
  ENG.fmt = fmt;
  function textOf(z, P, D) {
    const lang = (D.opt && D.opt.callang) || P.callang || 'de';
    const get = (id, f) => fmt(D.f[id] != null ? D.f[id] : defOf(P, id), f, lang);
    let s;
    if (z.tpl) s = z.tpl.replace(/\{(\w+)(?::(\w+))?\}/g, (_, id, f) => get(id, f));
    else s = get(z.f, z.fmt);
    s = String(s || '');
    if (z.upper) s = s.toLocaleUpperCase('de-DE');
    if (z.tpl) s = s.replace(/\s+([♥♡&+∞])\s*$/, '').replace(/^\s*([♥♡&+∞])\s+/, '').trim();
    return s;
  }
  ENG.textOf = textOf;
  function fieldById(P, id) { return (P.fields || []).find(f => f.id === id); }
  ENG.fieldById = fieldById;
  function defOf(P, id) { const f = fieldById(P, id); return f ? (f.def != null ? f.def : '') : ''; }
  ENG.defOf = defOf;
  function styleField(z) { if (z.sf) return z.sf; if (z.f) return z.f; const m = /\{(\w+)/.exec(z.tpl || ''); return m ? m[1] : null; }
  ENG.styleField = styleField;

  /* ---------------- text layer (flat space) ---------------- */
  function measureRun(c, r, fs) { return r.s ? symW(r.s, fs) + fs * .12 : c.measureText(r.t).width; }
  function lineWidth(c, line, fs, ls) {
    let w = 0; const rs = runs(line);
    for (const r of rs) w += measureRun(c, r, fs) + (r.t && ls ? ls * fs * Array.from(r.t).length : 0);
    return w;
  }
  function drawLine(c, line, x, base, fs, ls, rtl, stroke) {
    const rs = runs(line);
    const widths = rs.map(r => measureRun(c, r, fs) + (r.t && ls ? ls * fs * Array.from(r.t).length : 0));
    let cx = x;
    const order = rtl ? rs.map((r, i) => i).reverse() : rs.map((r, i) => i);
    for (const i of order) {
      const r = rs[i];
      if (r.s) { drawSym(c, r.s, cx + fs * .06, base, fs, stroke); }
      else if (ls && !isAr(r.t)) { let px = cx; for (const ch of Array.from(r.t)) { c.fillText(ch, px, base); if (stroke) c.strokeText(ch, px, base); px += c.measureText(ch).width + ls * fs; } }
      else { c.fillText(r.t, cx, base); if (stroke) c.strokeText(r.t, cx, base); }
      cx += widths[i];
    }
  }
  function inkBox(c, lines, fs, lh) {
    let top = Infinity, bot = -Infinity;
    lines.forEach((ln, i) => {
      const m = c.measureText(ln.replace(/[♥♡∞★✦✝☾✿]/g, 'o') || 'o');
      const b = i * fs * lh;
      top = Math.min(top, b - (m.actualBoundingBoxAscent || fs * .7));
      bot = Math.max(bot, b + (m.actualBoundingBoxDescent || fs * .2));
    });
    return [top, bot];
  }
  /** returns {mask, pu, pv, W, H, fsUsed} — white glyph mask in flat space with padding */
  function textMask(z, txt, fontId, sizeK, k) {
    const [fw, fh] = flatSize(z);
    const cond = z.cond || 1;
    const W = fw * k / cond, H = fh * k;
    const lh = z.lh || 1.15;
    let fs = (z.fs || fh * .8) * k * (sizeK || 1);
    const ls = z.ls || 0;
    const pad = Math.max(fs, 20 * k) * 1.1;
    const c0 = cv(W + 2 * pad, H + 2 * pad), c = c0.getContext('2d');
    const lines = String(txt).split('\n').slice(0, z.lines || 6);
    const rtl = isAr(txt);
    c.font = cssFont(fontId, fs, txt);
    // fit width
    const fitW = W * (z.fit || 1);
    let mw = Math.max(...lines.map(l => lineWidth(c, l, fs, ls)), 1);
    if (mw > fitW) { fs *= fitW / mw; c.font = cssFont(fontId, fs, txt); mw = fitW; }
    // fit height (multi-line)
    let [t, b] = inkBox(c, lines, fs, lh);
    const maxH = H * (z.fitH || (lines.length > 1 ? 1 : 3));
    if (b - t > maxH) { const s = maxH / (b - t); fs *= s; c.font = cssFont(fontId, fs, txt); [t, b] = inkBox(c, lines, fs, lh); }
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.textBaseline = 'alphabetic'; c.direction = 'ltr';
    // vertical: center ink box in zone, or baseline at z.base (fraction of h)
    let base0;
    if (z.base != null) base0 = pad + H * z.base - (lines.length - 1) * fs * lh / 2;
    else base0 = pad + H / 2 - (t + b) / 2;
    const stroke = z.weight ? (c.lineWidth = z.weight * fs, true) : false;
    if (z.rules) { const g = fs * .32, th = Math.max(1, fs * .07); const top = base0 + t - g, bot = base0 + (lines.length - 1) * fs * lh + b + g; c.fillRect(pad - fs * .2, top - th, W + fs * .4, th); c.fillRect(pad - fs * .2, bot, W + fs * .4, th); }
    lines.forEach((ln, i) => {
      const lw = lineWidth(c, ln, fs, ls);
      const al = z.align || 'center';
      let x = al === 'left' ? pad : al === 'right' ? pad + W - lw : pad + (W - lw) / 2;
      if (rtl && al === 'left') x = pad + W - lw;
      const base = base0 + i * fs * lh;
      if (z.bend && !rtl && !/[♥♡∞★✦✝☾✿]/.test(ln)) drawArc(c, ln, pad + W / 2, base, fs, ls, z.bend * k, stroke);
      else drawLine(c, ln, x, base, fs, ls, rtl, stroke);
    });
    let out = c0;
    if (z.italic) { // synthetic slant for fonts without italic
      const s = cv(c0.width, c0.height), sc = s.getContext('2d'); sc.setTransform(1, 0, -z.italic, 1, z.italic * c0.height / 2, 0); sc.drawImage(c0, 0, 0); out = s;
    }
    if (cond !== 1) { const s = cv(out.width * cond, out.height); s.getContext('2d').drawImage(out, 0, 0, s.width, s.height); out = s; }
    return { mask: out, pu: pad * cond / (W * cond), pv: pad / H, W: W * cond, H, fs };
  }
  function drawArc(c, line, cx, base, fs, ls, bend, stroke) {
    // bend > 0 : arc bulges up (smile = negative)
    const chars = Array.from(line);
    const ws = chars.map(ch => c.measureText(ch).width + ls * fs);
    const total = ws.reduce((a, b) => a + b, 0);
    const R = Math.abs(bend) < 1e-3 ? 1e9 : (total * total) / (8 * Math.abs(bend)) + Math.abs(bend) / 2;
    const dir = bend > 0 ? 1 : -1;
    const ccy = base + dir * R;
    let acc = -total / 2;
    chars.forEach((ch, i) => {
      const mid = acc + ws[i] / 2; const a = mid / R;
      c.save(); c.translate(cx + Math.sin(a) * R, ccy - dir * Math.cos(a) * R); c.rotate(dir * a);
      c.fillText(ch, -ws[i] / 2 + ls * fs / 2, 0); if (stroke) c.strokeText(ch, -ws[i] / 2, 0);
      c.restore(); acc += ws[i];
    });
  }

  /* ---------------- material effects ---------------- */
  const FOIL = {
    gold: ['#7d5a12', '#f7e39a', '#c79a2e', '#fff3c4', '#9c7420'],
    silver: ['#6e7378', '#f4f6f8', '#a9afb5', '#ffffff', '#80868c'],
    rose: ['#8a5244', '#f6d1c1', '#c98a73', '#ffe9df', '#9c5f4f'],
    copper: ['#6b3416', '#e9a36f', '#b0602e', '#f7c9a2', '#7a3d1b'],
    softgold: ['#8e7330', '#e6d293', '#b59646', '#f0e2ad', '#9a7d36'],
    brass: ['#6e5420', '#d9bf78', '#a8873e', '#e8d39a', '#7d6128']
  };
  ENG.FOIL = FOIL;
  function foilFill(c, W, H, pal) { const g = c.createLinearGradient(0, H * .2, W * .08, H * .85); pal.forEach((col, i) => g.addColorStop(i / (pal.length - 1), col)); return g; }
  function stitch(mask, color) {
    const c = tint(mask, color), x = c.getContext('2d');
    const p = cv(6, 6), pc = p.getContext('2d');
    pc.strokeStyle = 'rgba(0,0,0,.28)'; pc.lineWidth = 1.1; pc.beginPath(); pc.moveTo(0, 6); pc.lineTo(6, 0); pc.stroke();
    pc.strokeStyle = 'rgba(255,255,255,.22)'; pc.beginPath(); pc.moveTo(-1, 3); pc.lineTo(3, -1); pc.stroke();
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = x.createPattern(p, 'repeat'); x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function offsetLayer(src, dx, dy, color, blur) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.drawImage(blur ? blurCanvas(src, blur) : src, dx, dy);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function noise(c, amt) { const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height); const a = d.data; for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const n = (Math.random() - .5) * amt; a[i] = Math.max(0, Math.min(255, a[i] + n)); a[i + 1] = Math.max(0, Math.min(255, a[i + 1] + n)); a[i + 2] = Math.max(0, Math.min(255, a[i + 2] + n * .6)); } x.putImageData(d, 0, 0); return c; }
  /** builds [{cv, blend, alpha}] layers in flat space for a text zone */
  function textLayers(z, m, colorChoice, k) {
    const fx = Object.assign({ k: 'print' }, z.fx || {});
    const col = (colorChoice && colorChoice.hex) || fx.color || '#111';
    const kind = (colorChoice && colorChoice.fx) || fx.k;
    const L = [];
    const mask = fx.blur ? blurCanvas(m.mask, fx.blur * k) : m.mask;
    const fsk = m.fs / 60; // scale effects with type size
    switch (kind) {
      case 'engrave': {
        if (fx.hi !== 0) L.push({ cv: offsetLayer(mask, 0, Math.max(1, 1.4 * fsk), fx.hiColor || '#fff', 0), blend: 'screen', alpha: fx.hi || .22 });
        L.push({ cv: tint(mask, col), blend: fx.blend || 'multiply', alpha: fx.alpha || .9 });
        if (fx.deep) L.push({ cv: offsetLayer(mask, 0, -Math.max(.8, fsk), fx.deep, 0), blend: 'multiply', alpha: .35 });
        break;
      }
      case 'foil': {
        const pal = (colorChoice && colorChoice.pal) || FOIL[fx.pal || 'gold'] || FOIL.gold;
        if (fx.shadow !== 0) L.push({ cv: offsetLayer(mask, .8 * fsk, 1.4 * fsk, 'rgba(0,0,0,.55)', 1.2 * fsk), blend: 'multiply', alpha: fx.shadow || .5 });
        const c = cv(mask.width, mask.height), x = c.getContext('2d'); x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = foilFill(x, c.width, c.height, pal); x.fillRect(0, 0, c.width, c.height);
        if (fx.glitter) noise(c, fx.glitter);
        L.push({ cv: c, blend: 'source-over', alpha: fx.alpha || 1 });
        break;
      }
      case 'emb': {
        L.push({ cv: offsetLayer(mask, .6 * fsk, 1.2 * fsk, 'rgba(0,0,0,.6)', .9 * fsk), blend: 'multiply', alpha: .55 });
        L.push({ cv: noise(stitch(mask, col), 34), blend: 'source-over', alpha: fx.alpha || 1 });
        break;
      }
      case 'glow': {
        const g = blurCanvas(tint(mask, fx.glow || col), (fx.glowR || 4) * fsk);
        L.push({ cv: g, blend: 'screen', alpha: fx.glowA || .8 });
        L.push({ cv: tint(mask, col), blend: 'source-over', alpha: fx.alpha || .96 });
        break;
      }
      case 'raised': {
        L.push({ cv: offsetLayer(mask, (fx.sx || 2) * fsk, (fx.sy || 3.5) * fsk, fx.shadowColor || 'rgba(0,0,0,.7)', (fx.sb || 2.5) * fsk), blend: 'multiply', alpha: fx.shadowA || .6 });
        L.push({ cv: tint(mask, col), blend: 'source-over', alpha: fx.alpha || 1 });
        if (fx.edge) L.push({ cv: offsetLayer(mask, 0, -.9 * fsk, fx.edge, 0), blend: 'source-atop', alpha: .5 });
        break;
      }
      case 'gold3d': {
        const pal = (colorChoice && colorChoice.pal) || FOIL[fx.pal || 'gold'];
        L.push({ cv: offsetLayer(mask, 3 * fsk, 6 * fsk, 'rgba(0,0,0,.85)', 5 * fsk), blend: 'multiply', alpha: .8 });
        L.push({ cv: offsetLayer(mask, 1.2 * fsk, 2.2 * fsk, pal[0], 0), blend: 'source-over', alpha: 1 });
        const c = cv(mask.width, mask.height), x = c.getContext('2d'); x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = foilFill(x, c.width, c.height, pal); x.fillRect(0, 0, c.width, c.height);
        L.push({ cv: c, blend: 'source-over', alpha: 1 });
        break;
      }
      default: {
        if (fx.shadow) L.push({ cv: offsetLayer(mask, .7 * fsk, 1.2 * fsk, 'rgba(0,0,0,.6)', 1 * fsk), blend: 'multiply', alpha: fx.shadow });
        L.push({ cv: tint(mask, col), blend: fx.blend || 'source-over', alpha: fx.alpha || 1 });
      }
    }
    return L;
  }

  /* ---------------- photo layer ---------------- */
  function clipFlat(c, W, H, clip) {
    if (!clip || clip === 'rect') { c.rect(0, 0, W, H); return; }
    if (clip === 'circle' || clip === 'ellipse') { c.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2); return; }
    if (clip === 'heart') { heartPath(c, 0, 0, W, H); return; }
    if (clip.round != null) { const r = Math.min(W, H) * clip.round; c.roundRect ? c.roundRect(0, 0, W, H, r) : c.rect(0, 0, W, H); return; }
    if (clip.poly) { clip.poly.forEach((p, i) => i ? c.lineTo(p[0] * W, p[1] * H) : c.moveTo(p[0] * W, p[1] * H)); c.closePath(); return; }
    c.rect(0, 0, W, H);
  }
  function photoFx(c, fx, opt) {
    if (!fx || fx === 'none') return c;
    const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height); const a = d.data;
    const duo = (lo, hi) => { const A = hex2rgb(lo), B = hex2rgb(hi); return v => [A[0] + (B[0] - A[0]) * v, A[1] + (B[1] - A[1]) * v, A[2] + (B[2] - A[2]) * v]; };
    let map = null;
    if (fx === 'sepia') map = duo('#2b1a0e', '#f5e6c8');
    if (fx === 'duo' || fx === 'litho') map = duo((opt && opt.lo) || '#4a2306', (opt && opt.hi) || '#ffe2a6');
    if (fx === 'engrave') map = duo((opt && opt.lo) || '#2b1d12', '#ffffff');
    const con = (opt && opt.contrast) || (fx === 'litho' ? 1.15 : fx === 'engrave' ? 1.35 : 1);
    for (let i = 0; i < a.length; i += 4) {
      let v = (.299 * a[i] + .587 * a[i + 1] + .114 * a[i + 2]) / 255;
      v = Math.max(0, Math.min(1, (v - .5) * con + .5 + ((opt && opt.lift) || 0)));
      if (fx === 'bw') { a[i] = a[i + 1] = a[i + 2] = v * 255; continue; }
      if (fx === 'ink') { const t = v < ((opt && opt.th) || .55) ? 1 : 0; const C = hex2rgb((opt && opt.ink) || '#222'); a[i] = C[0]; a[i + 1] = C[1]; a[i + 2] = C[2]; a[i + 3] = a[i + 3] * t; continue; }
      const m = map(v); a[i] = m[0]; a[i + 1] = m[1]; a[i + 2] = m[2];
    }
    x.putImageData(d, 0, 0); return c;
  }
  ENG.photoFx = photoFx;
  /** draw the customer's photo into the zone frame (flat). crop = {x,y,s,r} : center offset in frame units, scale, rotation deg */
  function photoFlat(z, img, crop, fx, k, fxOpt) {
    const [fw, fh] = flatSize(z);
    const ar = z.ar || fw / fh;
    let W = fw * k, H = fw * k / ar;
    if (z.ar) H = fh * k; // frame flat size follows zone geometry
    const pad = 2;
    const c0 = cv(W + 2 * pad, H + 2 * pad), c = c0.getContext('2d');
    c.translate(pad, pad);
    c.save(); c.beginPath(); clipFlat(c, W, H, z.clip); c.clip();
    if (z.under) { c.fillStyle = z.under; c.fillRect(0, 0, W, H); }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const cr = crop || { x: 0, y: 0, s: 1, r: 0 };
    const rot = (cr.r || 0) * Math.PI / 180;
    const rw = Math.abs(iw * Math.cos(rot)) + Math.abs(ih * Math.sin(rot)), rh = Math.abs(iw * Math.sin(rot)) + Math.abs(ih * Math.cos(rot));
    const cover = Math.max(W / rw, H / rh) * (cr.s || 1);
    c.translate(W / 2 + (cr.x || 0) * W, H / 2 + (cr.y || 0) * H); c.rotate(rot); c.scale(cover, cover);
    c.drawImage(img, -iw / 2, -ih / 2);
    c.restore();
    photoFx(c0, fx, Object.assign({}, z.fxo || {}, fxOpt || {}));
    if (z.feather) { // soften edges
      const m = cv(c0.width, c0.height), mc = m.getContext('2d'); mc.translate(pad, pad); mc.fillStyle = '#fff';
      const f = z.feather * Math.min(W, H);
      mc.beginPath(); if (z.clip === 'circle' || z.clip === 'ellipse') mc.ellipse(W / 2, H / 2, W / 2 - f, H / 2 - f, 0, 0, Math.PI * 2); else mc.rect(f, f, W - 2 * f, H - 2 * f); mc.fill();
      const bm = blurCanvas(m, f * .9);
      const x = c0.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(bm, 0, 0);
    }
    return { cv: c0, pu: pad / W, pv: pad / H, W, H };
  }
  ENG.photoFlat = photoFlat;

  /* ---------------- calendar ---------------- */
  function calFlat(z, dateStr, fontId, color, k) {
    const [fw, fh] = flatSize(z); const W = fw * k, H = fh * k;
    const d = parseDate(dateStr) || { y: 2026, m: 2, d: 14 };
    const pad = 4;
    const c0 = cv(W + 2 * pad, H + 2 * pad), c = c0.getContext('2d'); c.translate(pad, pad);
    const first = new Date(d.y, d.m - 1, 1).getDay(); const start = z.start == null ? 1 : z.start;
    const off = (first - start + 7) % 7; const days = new Date(d.y, d.m, 0).getDate();
    const rows = z.rows || Math.ceil((off + days) / 7);
    const cw = W / 7, rh = H / Math.max(rows, z.minRows || 5);
    const fs = (z.fs || rh * .62) * k;
    c.font = cssFont(fontId, fs, '0'); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= days; i++) {
      const p = off + i - 1, col = z.noOffset ? (i - 1) % 7 : p % 7, row = z.noOffset ? Math.floor((i - 1) / 7) : Math.floor(p / 7);
      const x = cw * (col + .5), y = rh * (row + .5);
      const label = z.pad ? String(i).padStart(2, '0') : String(i);
      if (i === d.d) {
        const hw = cw * (z.heartW || .95), hh = rh * (z.heartH || 1.15);
        c.save(); c.beginPath(); heartPath(c, x - hw / 2, y - hh * .48, hw, hh);
        if (z.heart === 'outline') { c.strokeStyle = z.heartColor || '#c4142a'; c.lineWidth = fs * .09; c.stroke(); c.fillStyle = color; c.fillText(label, x, y + fs * .02); }
        else { c.fillStyle = z.heartColor || color; c.fill(); c.fillStyle = z.heartText || '#fff'; c.fillText(label, x, y + fs * .02); }
        c.restore();
      } else { c.fillStyle = color; c.fillText(label, x, y); }
    }
    return { cv: c0, pu: pad / W, pv: pad / H, W, H };
  }

  /* ---------------- stone recolor ---------------- */
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
  function hsl2rgb(h, s, l) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
  function recolor(ctx, sc, circ, hex) {
    const [cx, cy, r] = circ; const x0 = Math.floor((cx - r) * sc), y0 = Math.floor((cy - r) * sc), w = Math.ceil(2 * r * sc), h = w;
    const im = ctx.getImageData(x0, y0, w, h); const a = im.data; const T = hex2rgb(hex); const [th, ts, tl] = rgb2hsl(T[0], T[1], T[2]);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i + .5) / sc - r + (x0 / sc - (cx - r)), dy = (j + .5) / sc - r + (y0 / sc - (cy - r));
      const dd = Math.hypot(dx, dy) / r; if (dd > 1) continue;
      const q = (j * w + i) * 4; const [hh, ss, ll] = rgb2hsl(a[q], a[q + 1], a[q + 2]);
      if (ss < .18 && ll > .7) continue; // keep sparkle highlights
      const nl = Math.max(0, Math.min(1, ll * .55 + tl * .45 + (ll - .5) * .3));
      const o = hsl2rgb(th, Math.min(1, ts * (.6 + ss * .6)), nl); const e = dd > .85 ? (1 - dd) / .15 : 1;
      a[q] = a[q] * (1 - e) + o[0] * e; a[q + 1] = a[q + 1] * (1 - e) + o[1] * e; a[q + 2] = a[q + 2] * (1 - e) + o[2] * e;
    }
    ctx.putImageData(im, x0, y0);
  }

  /* ---------------- composite helpers ---------------- */
  let TMP = null;
  function tmpFor(W, H) { if (!TMP || TMP.width !== W || TMP.height !== H) TMP = cv(W, H); const x = TMP.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H); return TMP; }
  function pathImg(c, pts, sc) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] * sc, p[1] * sc) : c.moveTo(p[0] * sc, p[1] * sc)); c.closePath(); }
  function putLayer(ctx, layer, z, map, pu, pv, sc, clipImg, feather) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const T = tmpFor(W, H), tx = T.getContext('2d');
    warp(tx, layer.cv, map, pu, pv, sc);
    if (z.cutImg) { tx.globalCompositeOperation = 'destination-out'; tx.fillStyle = '#000'; pathImg(tx, z.cutImg, sc); tx.fill(); tx.globalCompositeOperation = 'source-over'; }
    if (clipImg) {
      const m = cv(W, H), mc = m.getContext('2d'); mc.fillStyle = '#fff'; pathImg(mc, clipImg, sc); mc.fill();
      const mm = feather ? blurCanvas(m, feather * sc) : m;
      tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mm, 0, 0); tx.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = layer.blend || 'source-over'; ctx.globalAlpha = layer.alpha == null ? 1 : layer.alpha;
    ctx.drawImage(T, 0, 0);
    ctx.restore();
  }

  /* ---------------- design state ---------------- */
  ENG.blankDesign = function (P) { return { f: {}, font: {}, color: {}, size: {}, ph: {}, opt: {} }; };
  ENG.isDefault = function (P, D) {
    if (!D) return true;
    for (const k in D.f) if (D.f[k] != null && D.f[k] !== defOf(P, k)) return false;
    for (const k in D.font) { const f = fieldById(P, k); if (D.font[k] && f && D.font[k] !== (f.font || (f.fonts && f.fonts[0]))) return false; }
    for (const k in D.color) { const f = fieldById(P, k); if (D.color[k] && f && f.colors && D.color[k] !== f.colors[0].id) return false; }
    for (const k in D.size) if (D.size[k] && Math.abs(D.size[k] - 1) > .001) return false;
    for (const k in D.ph) if (D.ph[k] && D.ph[k].src) return false;
    return true;
  };
  function zoneVisible(z, P, D) {
    if (!z.show) return true;
    const s = z.show;
    if (s.f) { const ph = D.ph && D.ph[s.f]; const has = !!(ph && ph.src); return s.empty ? !has : has; } const v = (D.opt && D.opt[s.opt]) != null ? D.opt[s.opt] : ((P.opts || []).find(o => o.id === s.opt) || {}).def;
    if (s.gte != null) return +v >= s.gte;
    if (s.eq != null) return v === s.eq;
    if (s.in) return s.in.includes(v);
    return true;
  }
  ENG.zoneVisible = zoneVisible;
  function fontFor(P, z, D) { const sf = styleField(z); const f = sf && fieldById(P, sf); return (D.font && sf && D.font[sf]) || z.font || (f && (f.font || (f.fonts && f.fonts[0]))) || 'times'; }
  ENG.fontFor = fontFor;
  function colorFor(P, z, D) { const sf = styleField(z); const f = sf && fieldById(P, sf); if (!f || !f.colors) return null; const id = (D.color && D.color[sf]) || f.colors[0].id; const c = f.colors.find(x => x.id === id) || f.colors[0]; if (c && c.pal == null && c.foil) c.pal = FOIL[c.foil]; return c; }
  ENG.colorFor = colorFor;
  ENG.neededFonts = function (P, D) {
    const s = new Set();
    for (const v of P.views) for (const z of v.zones) if (z.t === 'text' || z.t === 'cal') { const id = fontFor(P, z, D); familyList(id, textOf(z, P, D)).forEach(x => s.add(x)); }
    return [...s];
  };

  /** main render. opts: {orig:bool, maxW:number, quality} */
  ENG.render = async function (canvas, P, vi, D, opts) {
    opts = opts || {};
    vi = ENG.viewFor(P, D, vi);
    const V = P.views[vi || 0]; if (!V) return;
    const token = (canvas._tok = (canvas._tok || 0) + 1);
    const showOrig = opts.orig || (!opts.force && !V.noorig && ENG.isDefault(P, D));
    const base = await ENG.img(showOrig ? V.img : (V.clean || V.img));
    const origImg = (!showOrig && V.clean) ? await ENG.img(V.img) : null;
    if (!showOrig) await Promise.all(ENG.neededFonts(P, D).map(ENG.loadFont));
    const photos = {};
    if (!showOrig) for (const z of V.zones) if (z.t === 'photo') { const ph = D.ph && D.ph[z.f]; if (ph && ph.src) photos[z.f] = await ENG.img(ph.src); }
    const over = (!showOrig && V.over) ? await ENG.img(V.over) : null; // e.g. clock hands / puzzle lines on top of the design
    if (token !== canvas._tok || !base) return;
    const maxW = opts.maxW || V.w;
    const sc = Math.min(1, maxW / V.w);
    const W = Math.round(V.w * sc), H = Math.round(V.h * sc);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(base, 0, 0, W, H);
    if (showOrig) return;
    const k = Math.max(.5, Math.min(2, sc * (opts.k || 1.5)));
    for (const z of V.zones) {
      if (!zoneVisible(z, P, D)) continue;
      try {
        if (z.t === 'text') {
          const txt = textOf(z, P, D); if (!txt.trim()) continue;
          const sf = styleField(z);
          const m = textMask(z, txt, fontFor(P, z, D), (D.size && D.size[sf]) || 1, k);
          const layers = textLayers(z, m, colorFor(P, z, D), k);
          const map = zoneMap(z);
          for (const L of layers) putLayer(ctx, L, z, map, m.pu, m.pv, sc, z.clipImg, z.feather);
        } else if (z.t === 'photo') {
          const img = photos[z.f];
          if (!img) {
            if (z.restore && origImg) { ctx.save(); ctx.beginPath(); pathImg(ctx, z.clipImg || quadOf(z), sc); ctx.clip(); ctx.drawImage(origImg, 0, 0, W, H); ctx.restore(); }
            continue;
          }
          const ph = D.ph[z.f];
          const fxs = ph.fx || z.fx || 'none';
          const m = photoFlat(z, img, ph.crop, fxs, k);
          const map = zoneMap(z);
          if (z.base) { const b = tint(m.cv, z.base); putLayer(ctx, { cv: b, blend: 'source-over', alpha: z.baseA || 1 }, z, map, m.pu, m.pv, sc, z.clipImg, z.feather); }
          putLayer(ctx, { cv: m.cv, blend: z.blend || 'source-over', alpha: z.alpha == null ? 1 : z.alpha }, z, map, m.pu, m.pv, sc, z.clipImg, z.cfeather);
          if (z.gloss) putLayer(ctx, { cv: tint(m.cv, 'rgba(255,255,255,1)'), blend: 'soft-light', alpha: z.gloss }, z, map, m.pu, m.pv, sc, z.clipImg, z.cfeather);
        } else if (z.t === 'cal') {
          const dv = (D.f[z.f] != null ? D.f[z.f] : defOf(P, z.f));
          const col = (colorFor(P, z, D) || {}).hex || z.color || '#111';
          const m = calFlat(z, dv, fontFor(P, z, D), col, k);
          const fx = Object.assign({}, z.fx || {});
          putLayer(ctx, { cv: fx.blur ? blurCanvas(m.cv, fx.blur * k) : m.cv, blend: fx.blend || 'source-over', alpha: fx.alpha || 1 }, z, zoneMap(z), m.pu, m.pv, sc, z.clipImg, z.feather);
        } else if (z.t === 'stone') {
          const v = D.f[z.f] != null ? D.f[z.f] : defOf(P, z.f);
          const f = fieldById(P, z.f); const ch = f && f.choices && f.choices.find(c => c.id === v);
          if (ch && v !== z.orig) recolor(ctx, sc, z.c, ch.hex);
        }
      } catch (e) { console.warn('zone', z, e); }
    }
    if (over) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(over, 0, 0, W, H); ctx.restore(); }
  };
  /** views can depend on a product option (e.g. mug colour): returns the view index to show */
  ENG.viewFor = function (P, D, vi) {
    const V = P.views[vi || 0];
    if (!V || !V.when) return vi || 0;
    const v = (D && D.opt && D.opt[V.when.opt]) || ((P.opts || []).find(o => o.id === V.when.opt) || {}).def;
    const k = P.views.findIndex(x => x.when && x.when.opt === V.when.opt && x.when.eq === v);
    return k >= 0 ? k : (vi || 0);
  };

  /* ---------------- flat production output ---------------- */
  /** returns a canvas with the zone's content flat (no product photo), at `dpmm` dots per mm (zone.mm = width in mm) */
  ENG.flatZone = async function (P, z, D, dpmm, opts) {
    opts = opts || {};
    const [fw, fh] = flatSize(z);
    const mmW = z.mm || 60, px = Math.min(4800, mmW * (dpmm || 11.811));
    const k = px / fw;
    if (z.t === 'text') {
      const txt = textOf(z, P, D); if (!txt.trim()) return null;
      const fid = fontFor(P, z, D);
      await Promise.all(familyList(fid, txt).map(ENG.loadFont));
      const sf = styleField(z);
      const m = textMask(z, txt, fid, (D.size && D.size[sf]) || 1, k);
      const col = opts.black ? '#000' : ((colorFor(P, z, D) || {}).hex || (z.fx && z.fx.color) || '#000');
      return trim(tint(m.mask, col));
    }
    if (z.t === 'cal') {
      const fid = fontFor(P, z, D); await ENG.loadFont(fid);
      const dv = (D.f[z.f] != null ? D.f[z.f] : defOf(P, z.f));
      return calFlat(z, dv, fid, opts.black ? '#000' : '#000', k).cv;
    }
    if (z.t === 'photo') {
      const ph = D.ph && D.ph[z.f]; if (!ph || !ph.src) return null;
      const img = await ENG.img(ph.src);
      const m = photoFlat(z, img, ph.crop, ph.fx || z.fx || 'none', k);
      return m.cv;
    }
    return null;
  };
  function trim(c) {
    const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    const p = 6; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(c.width - 1, x1 + p); y1 = Math.min(c.height - 1, y1 + p);
    const o = cv(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, -x0, -y0); return o;
  }
  ENG.trim = trim;
})();
