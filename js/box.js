/* Gift box builder (like BLUME2000 "Create your Strauß"): pick a box & wrapping, collect several
   personalised products, add extras and a greeting card in one of several designs, see it live, add to cart.
   The box itself is one cart line; every personalised product inside stays its own cart line (D.boxOf = box id),
   so preview, approval and print files for the products keep working exactly as before. */
(function () {
  'use strict';
  const B = {};
  window.BOX = B;

  /* ---------------- options ---------------- */
  const L3 = (de, en, ar) => ({ de, en, ar });
  const BOXES = [
    { id: 'kraft', price: 4.9, c: '#c89b6d', c2: '#a97b4f', l: L3('Kraftkarton', 'Kraft box', 'كرتون طبيعي') },
    { id: 'rosa', price: 6.9, c: '#f7a9c9', c2: '#ef86b2', l: L3('Rosa Box', 'Pink box', 'بوكس زهري') },
    { id: 'zebra', price: 7.9, c: '#ffffff', c2: '#FE90BE', pattern: 'swirl', l: L3('Neuetalia-Box', 'Neuetalia box', 'بوكس نيوتاليا') },
    { id: 'schwarz', price: 9.9, c: '#262326', c2: '#111', gold: 1, l: L3('Schwarz & Gold', 'Black & gold', 'أسود وذهبي') },
    { id: 'samt', price: 12.9, c: '#8f1730', c2: '#6c0f22', velvet: 1, l: L3('Samtbox Rot', 'Red velvet box', 'بوكس مخمل أحمر') }
  ];
  const SIZES = [
    { id: 's', cap: 3, add: 0, l: L3('Klein', 'Small', 'صغير'), d: L3('bis 3 Geschenke', 'up to 3 gifts', 'حتى 3 هدايا') },
    { id: 'm', cap: 5, add: 3, l: L3('Mittel', 'Medium', 'وسط'), d: L3('bis 5 Geschenke', 'up to 5 gifts', 'حتى 5 هدايا') },
    { id: 'l', cap: 8, add: 6, l: L3('Groß', 'Large', 'كبير'), d: L3('bis 8 Geschenke', 'up to 8 gifts', 'حتى 8 هدايا') }
  ];
  const FILLS = [
    { id: 'shred', add: 0, l: L3('Papierwolle', 'Paper shred', 'قش ورقي') },
    { id: 'satin', add: 2, l: L3('Satin', 'Satin', 'ساتان') },
    { id: 'petals', add: 4, l: L3('Rosenblätter', 'Rose petals', 'أوراق ورد') }
  ];
  const RIBBONS = [
    { id: 'rosa', hex: '#FE90BE', l: L3('Rosa', 'Pink', 'زهري') }, { id: 'rot', hex: '#c8102e', l: L3('Rot', 'Red', 'أحمر') },
    { id: 'gold', hex: '#d4af37', l: L3('Gold', 'Gold', 'ذهبي') }, { id: 'weiss', hex: '#f7f5f2', l: L3('Weiß', 'White', 'أبيض') },
    { id: 'tuerkis', hex: '#01CAC9', l: L3('Türkis', 'Turquoise', 'فيروزي') }, { id: 'lila', hex: '#6425FE', l: L3('Lila', 'Purple', 'بنفسجي') }
  ];
  const EXTRAS = [
    { id: 'rose', e: '🌹', price: 3.5, l: L3('Einzelne Rose', 'Single rose', 'وردة') },
    { id: 'choco', e: '🍫', price: 8.9, l: L3('Pralinen', 'Chocolates', 'شوكولاتة') },
    { id: 'candle', e: '🕯️', price: 4.9, l: L3('Duftkerze', 'Scented candle', 'شمعة معطرة') },
    { id: 'teddy', e: '🧸', price: 7.9, l: L3('Mini-Teddy', 'Mini teddy', 'دبدوب صغير') },
    { id: 'balloon', e: '🎈', price: 3.9, l: L3('Herzballon', 'Heart balloon', 'بالون قلب') },
    { id: 'perfume', e: '🌸', price: 9.9, l: L3('Duftspray', 'Room spray', 'معطر') }
  ];
  const CARDS = [
    { id: 'roses', l: L3('Rosen', 'Roses', 'ورود') }, { id: 'love', l: L3('Liebe', 'Love', 'حب') },
    { id: 'birthday', l: L3('Geburtstag', 'Birthday', 'عيد ميلاد') }, { id: 'eid', l: L3('Eid & Ramadan', 'Eid & Ramadan', 'عيد ورمضان') },
    { id: 'baby', l: L3('Baby & Familie', 'Baby & family', 'مولود وعائلة') }, { id: 'thanks', l: L3('Danke', 'Thank you', 'شكراً') },
    { id: 'neuetalia', l: L3('Neuetalia', 'Neuetalia', 'نيوتاليا') }, { id: 'minimal', l: L3('Schlicht', 'Simple', 'بسيط') }
  ];
  const CARD_FONTS = ['greatvibes', 'dancing', 'playfair', 'montserrat', 'caveat', 'ruqaa', 'amiri', 'marhey'];
  B.opts = { BOXES, SIZES, FILLS, RIBBONS, EXTRAS, CARDS };

  const NOBOX = ['aermel-stick', 'rosenbox-xxl', 'familienschild', 'cocktail-set'];
  const needsPhoto = p => p.fields.some(f => f.type === 'photo' && !f.optional);
  /* virtual product so cart, checkout, emails and admin know the box */
  const GBOX = { id: 'geschenkbox', virtual: 1, hidden: 1, cat: 'deko', occ: [], price: 0, tax: 19, prod: 1, sd: 0, stock: 9999, active: true,
    name: L3('Geschenkbox, selbst gestaltet', 'Gift box, designed by you', 'بوكس هدايا من تصميمك'), desc: L3('', '', ''), mat: L3('', '', ''), size: L3('', '', ''), fields: [],
    views: [{ img: 'img/o/box-hero.jpg', thumb: 'img/o/box-hero.jpg', w: 900, h: 900, zones: [] }] };
  const origProducts = ST.products, origProduct = ST.product;
  ST.products = function (all) { const l = origProducts(all); if (all && !l.some(p => p.id === 'geschenkbox')) l.push(GBOX); return l; };
  ST.product = id => id === 'geschenkbox' ? GBOX : origProduct(id);

  /* ---------------- state ---------------- */
  const fresh = () => ({ step: 1, box: 'zebra', size: 'm', fill: 'shred', ribbon: 'rosa', items: [], extras: {}, card: { on: true, design: 'roses', text: '', from: '', font: 'greatvibes' }, editId: null });
  let S = null;
  const save = () => { try { const x = JSON.parse(JSON.stringify(S)); ST.set('boxDraft', x); } catch (e) { } };
  const byId = (list, id) => list.find(x => x.id === id) || list[0];
  const cap = () => byId(SIZES, S.size).cap;
  const itemCount = () => S.items.reduce((a, i) => a + i.qty, 0);
  B.price = function (s) {
    s = s || S;
    const base = byId(BOXES, s.box).price + byId(SIZES, s.size).add + byId(FILLS, s.fill).add;
    const ex = Object.entries(s.extras || {}).reduce((a, [k, n]) => a + (byId(EXTRAS, k).price * n), 0);
    const items = (s.items || []).reduce((a, i) => { const p = ST.product(i.pid); return a + (p ? ST.unitPrice(p, i.D) * i.qty : 0); }, 0);
    return { box: ST.round2(base + ex), items: ST.round2(items), total: ST.round2(base + ex + items) };
  };

  /* ---------------- rendering helpers ---------------- */
  const thumbs = new Map();
  async function itemThumb(it) {
    const p = ST.product(it.pid); if (!p) return null;
    const key = it.pid + JSON.stringify(it.D);
    if (thumbs.has(key)) return thumbs.get(key);
    const c = ENG.canvas(10, 10);
    await ENG.render(c, p, 0, it.D, { maxW: 360, force: !ENG.isDefault(p, it.D) });
    thumbs.set(key, c); return c;
  }
  function rr(x, cx, cy, w, h, r) { x.beginPath(); x.moveTo(cx + r, cy); x.arcTo(cx + w, cy, cx + w, cy + h, r); x.arcTo(cx + w, cy + h, cx, cy + h, r); x.arcTo(cx, cy + h, cx, cy, r); x.arcTo(cx, cy, cx + w, cy, r); x.closePath(); }
  function rng(seed) { let s = seed || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; }
  function swirl(x, X, Y, W, H, col) { x.save(); rr(x, X, Y, W, H, 6); x.clip(); x.strokeStyle = col; x.lineWidth = Math.max(6, W / 34); for (let i = -12; i < 30; i++) { x.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40; const px = X + u * W; const py = Y + i * W / 22 + Math.sin(u * Math.PI * 2.2 + i * .7) * W / 20; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } x.restore(); }

  /* item picture for the box: personalised render, cut out along the product outline when we have a mask */
  async function itemCut(it) {
    const p = ST.product(it.pid); if (!p) return null;
    const key = 'cut' + it.pid + JSON.stringify(it.D);
    if (thumbs.has(key)) return thumbs.get(key);
    const vi = ENG.viewFor(p, it.D, 0); const V = p.views[vi];
    const c = ENG.canvas(10, 10);
    await ENG.render(c, p, vi, it.D, { maxW: 520, force: !ENG.isDefault(p, it.D) });
    let out = { cv: c, cut: false };
    const mp = V && window.MASKS && window.MASKS[V.src];
    if (mp) {
      const m = await ENG.img(mp);
      if (m) {
        const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over';
        const t2 = ENG.trim(c); out = { cv: t2, cut: true };
      }
    }
    thumbs.set(key, out); return out;
  }
  function noiseFill(x, X, Y, W, H, amt, seed) { const R = rng(seed || 3); for (let i = 0; i < W * H / 90; i++) { x.fillStyle = R() > .5 ? `rgba(255,255,255,${R() * amt})` : `rgba(0,0,0,${R() * amt * .8})`; x.fillRect(X + R() * W, Y + R() * H, 1.4, 1.4); } }
  function petal(x, px, py, s, rot, col) { x.save(); x.translate(px, py); x.rotate(rot); const g = x.createRadialGradient(-s * .2, -s * .2, s * .1, 0, 0, s); g.addColorStop(0, shade(col, .25)); g.addColorStop(.7, col); g.addColorStop(1, shade(col, -.35)); x.fillStyle = g; x.beginPath(); x.moveTo(0, -s); x.bezierCurveTo(s * .9, -s * .8, s, s * .5, 0, s); x.bezierCurveTo(-s, s * .5, -s * .9, -s * .8, 0, -s); x.fill(); x.restore(); }
  /** photo-like top view of the open gift box with the real (personalised) products inside */
  B.drawBox = async function (cv, s, W) {
    s = s || S; W = W || 900; const H = Math.round(W * .86);
    cv.width = W; cv.height = H; const x = cv.getContext('2d'); const k = W / 900;
    const bx = byId(BOXES, s.box), rb = byId(RIBBONS, s.ribbon), sz = byId(SIZES, s.size);
    const R = rng(17);
    // surface: soft linen/marble table
    const bg = x.createRadialGradient(W * .45, H * .35, 40 * k, W / 2, H / 2, W * .75); bg.addColorStop(0, '#fbf8f5'); bg.addColorStop(1, '#ece4dc'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    noiseFill(x, 0, 0, W, H, .05, 9);
    x.strokeStyle = 'rgba(160,140,130,.08)'; x.lineWidth = 2 * k; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-50, H * R()); x.bezierCurveTo(W * .3, H * R(), W * .7, H * R(), W + 50, H * R()); x.stroke(); }
    // box geometry (seen from above, lid open behind)
    const sc = sz.id === 's' ? .78 : sz.id === 'm' ? .88 : .97;
    const bw = 700 * k * sc, bh = 430 * k * sc, X = (W - bw) / 2, lidH = 150 * k * sc, Y = 60 * k + lidH + (1 - sc) * 120 * k;
    const wt = 26 * k * sc; // wall thickness
    // scattered petals on the table
    if (s.fill === 'petals' || bx.id === 'samt') for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, r = (.5 + R() * .25); petal(x, W / 2 + Math.cos(a) * W * r * .62, Y + bh / 2 + Math.sin(a) * H * r * .55, (9 + R() * 9) * k, R() * 6, ['#b0122c', '#c8102e', '#8e0d22'][i % 3]); }
    // drop shadow of the whole box
    x.save(); x.shadowColor = 'rgba(60,30,40,.38)'; x.shadowBlur = 40 * k; x.shadowOffsetY = 18 * k; x.fillStyle = bx.c; rr(x, X, Y - lidH, bw, bh + lidH, 10 * k); x.fill(); x.restore();
    // lid (inside face visible, slightly narrower at the far edge)
    const inset = 18 * k * sc;
    x.save(); x.beginPath(); x.moveTo(X + inset, Y - lidH); x.lineTo(X + bw - inset, Y - lidH); x.lineTo(X + bw, Y); x.lineTo(X, Y); x.closePath(); x.clip();
    const lg = x.createLinearGradient(0, Y - lidH, 0, Y); lg.addColorStop(0, shade(bx.c, -.02)); lg.addColorStop(.75, shade(bx.c, -.12)); lg.addColorStop(1, shade(bx.c, -.32)); x.fillStyle = lg; x.fillRect(X, Y - lidH, bw, lidH);
    if (bx.pattern) { x.globalAlpha = .9; swirl(x, X, Y - lidH, bw, lidH, bx.c2); x.globalAlpha = 1; const sh = x.createLinearGradient(0, Y - lidH, 0, Y); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = sh; x.fillRect(X, Y - lidH, bw, lidH); }
    if (bx.velvet) noiseFill(x, X, Y - lidH, bw, lidH, .08, 4);
    if (bx.gold || bx.id === 'samt' || bx.id === 'kraft' || bx.id === 'rosa') { x.fillStyle = bx.gold ? '#d9b660' : bx.id === 'kraft' ? 'rgba(70,40,20,.55)' : 'rgba(255,255,255,.85)'; x.font = `600 ${30 * k * sc}px "ui-sans", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('letterSpacing' in x) x.letterSpacing = `${6 * k}px`; x.fillText('NEUETALIA', W / 2, Y - lidH * .42); if ('letterSpacing' in x) x.letterSpacing = '0px'; x.font = `400 ${15 * k * sc}px "ui-serif-i", Georgia, serif`; x.fillText('Alles für ein Lächeln', W / 2, Y - lidH * .18); }
    x.restore();
    // hinge shadow line
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(X, Y - 3 * k, bw, 5 * k);
    // box rim (top edges of the walls)
    x.save(); rr(x, X, Y, bw, bh, 8 * k); x.clip();
    const rg = x.createLinearGradient(X, Y, X + bw, Y + bh); rg.addColorStop(0, shade(bx.c, .12)); rg.addColorStop(1, shade(bx.c, -.1)); x.fillStyle = rg; x.fillRect(X, Y, bw, bh);
    if (bx.pattern) swirl(x, X, Y, bw, bh, bx.c2);
    if (bx.velvet) noiseFill(x, X, Y, bw, bh, .08, 5);
    x.restore();
    if (bx.gold) { x.strokeStyle = '#d4af37'; x.lineWidth = 2 * k; rr(x, X + 5 * k, Y + 5 * k, bw - 10 * k, bh - 10 * k, 6 * k); x.stroke(); }
    // inner opening
    const iX = X + wt, iY = Y + wt * .9, iW = bw - 2 * wt, iH = bh - wt * 1.7;
    x.save(); rr(x, iX, iY, iW, iH, 4 * k); x.clip();
    // inner walls (far wall shows most, light from top-left)
    x.fillStyle = shade(bx.pattern ? '#f3c3d8' : bx.c, -.38); x.fillRect(iX, iY, iW, iH);
    const fillTop = iY + wt * 1.3;
    // filling
    if (s.fill === 'satin') {
      const g = x.createLinearGradient(iX, fillTop, iX + iW, iY + iH); g.addColorStop(0, '#f7dce8'); g.addColorStop(.45, '#fff7fb'); g.addColorStop(1, '#efc6d8'); x.fillStyle = g; x.fillRect(iX, fillTop, iW, iH);
      for (let i = 0; i < 14; i++) { const y0 = fillTop + iH * R(), y1 = fillTop + iH * R(); x.strokeStyle = i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(170,90,130,.16)'; x.lineWidth = (6 + R() * 14) * k; x.lineCap = 'round'; x.beginPath(); x.moveTo(iX - 20, y0); x.bezierCurveTo(iX + iW * .3, y0 + (R() - .5) * 120 * k, iX + iW * .6, y1 + (R() - .5) * 120 * k, iX + iW + 20, y1); x.stroke(); }
    } else if (s.fill === 'petals') {
      x.fillStyle = '#f6e8ea'; x.fillRect(iX, fillTop, iW, iH);
      for (let i = 0; i < 420; i++) petal(x, iX + iW * R(), fillTop + iH * R(), (8 + R() * 10) * k, R() * 6, ['#b0122c', '#c8102e', '#9c0f25', '#d63a55', '#7d0a1d'][i % 5]);
    } else {
      const cols = bx.id === 'schwarz' ? ['#2c2a2c', '#1b1a1b', '#d4af37', '#3a383a'] : bx.id === 'kraft' ? ['#d8b58c', '#c79c6c', '#e8cfae', '#b88a5c'] : bx.id === 'samt' ? ['#f2d6dc', '#ffffff', '#e8b8c4', '#c8102e'] : ['#ffd1e4', '#fe90be', '#ffffff', '#f7b3cf', '#ffe6f1'];
      x.fillStyle = shade(cols[0], -.15); x.fillRect(iX, fillTop - wt, iW, iH + wt);
      x.lineCap = 'round';
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 1400; i++) {
        const px = iX + iW * R(), py = fillTop - wt * .5 + (iH + wt) * R(), L = (14 + R() * 26) * k, a = R() * Math.PI;
        x.strokeStyle = layer ? cols[i % cols.length] : 'rgba(90,30,50,.09)'; x.lineWidth = (layer ? 2.4 : 3.4) * k;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * L * .5 + (R() - .5) * 10 * k, py + Math.sin(a) * L * .5 + (R() - .5) * 10 * k, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
      }
    }
    // inner shadows along the walls
    const ws = [[iX, iY, iW, wt * 2.4, 0, 1, .55], [iX, iY, wt * 1.6, iH, 1, 0, .35], [iX + iW - wt * 1.6, iY, wt * 1.6, iH, -1, 0, .25]];
    for (const [a, b2, c2, d2, dx, dy, al] of ws) { const g = dy ? x.createLinearGradient(0, b2, 0, b2 + d2) : x.createLinearGradient(dx > 0 ? a : a + c2, 0, dx > 0 ? a + c2 : a, 0); g.addColorStop(0, `rgba(0,0,0,${al})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(a, b2, c2, d2); }
    // far wall face
    const fw = x.createLinearGradient(0, iY, 0, iY + wt * 1.3); fw.addColorStop(0, shade(bx.pattern ? '#f3c3d8' : bx.c, -.45)); fw.addColorStop(1, shade(bx.pattern ? '#f3c3d8' : bx.c, -.25)); x.fillStyle = fw; x.fillRect(iX, iY, iW, wt * 1.3);
    // products
    const list = []; for (const it of s.items) for (let q = 0; q < it.qty; q++) list.push(it);
    const ex = []; for (const [id, n] of Object.entries(s.extras || {})) for (let q = 0; q < n; q++) ex.push(byId(EXTRAS, id));
    const n = list.length; const aX = iX + 10 * k, aY = fillTop + 6 * k, aW = iW - 20 * k, aH = iH - (fillTop - iY) - (ex.length ? 64 * k : 12 * k);
    let cols = 1, bestS = 0; for (let c = 1; c <= Math.max(1, n); c++) { const r = Math.ceil(n / c); const sz2 = Math.min(aW / c, aH / r) - (c * r - n) * 2; if (sz2 > bestS) { bestS = sz2; cols = c; } } const rows = Math.max(1, Math.ceil(n / cols));
    const cw = aW / cols, ch = aH / rows;
    for (let i = 0; i < n; i++) {
      const it = await itemCut(list[i]); if (!it) continue;
      const col = i % cols, row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
      const cx = aX + (aW - inRow * cw) / 2 + cw * col + cw / 2 + (R() - .5) * 10 * k, cy = aY + ch * row + ch / 2 + (R() - .5) * 8 * k;
      const c = it.cv; const big = n <= 2 ? 1.05 : 1.22; const maxW = cw * (it.cut ? big : .9), maxH = ch * (it.cut ? big : .9); const r = Math.min(maxW / c.width, maxH / c.height);
      const dw = c.width * r, dh = c.height * r;
      x.save(); x.translate(cx, cy); x.rotate((R() - .5) * (it.cut ? .16 : .1));
      x.shadowColor = 'rgba(30,10,20,.45)'; x.shadowBlur = 18 * k; x.shadowOffsetX = 6 * k; x.shadowOffsetY = 10 * k;
      if (it.cut) x.drawImage(c, -dw / 2, -dh / 2, dw, dh);
      else { const pad = 8 * k; x.fillStyle = '#fff'; rr(x, -dw / 2 - pad, -dh / 2 - pad, dw + 2 * pad, dh + 2 * pad, 6 * k); x.fill(); x.shadowColor = 'transparent'; x.save(); rr(x, -dw / 2, -dh / 2, dw, dh, 4 * k); x.clip(); x.drawImage(c, -dw / 2, -dh / 2, dw, dh); x.restore(); }
      x.restore();
    }
    if (!n) { x.fillStyle = 'rgba(255,255,255,.92)'; rr(x, W / 2 - 190 * k, aY + aH / 2 - 26 * k, 380 * k, 52 * k, 26 * k); x.fill(); x.fillStyle = '#6f6c78'; x.font = `600 ${20 * k}px "ui-sans", "ui-ar", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t('box_empty_canvas'), W / 2, aY + aH / 2); }
    // extras along the front
    ex.slice(0, 12).forEach((e, i) => { x.save(); x.font = `${44 * k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 10 * k; x.shadowOffsetY = 5 * k; const span = Math.min(ex.length, 12); const px = iX + iW / 2 + (i - (span - 1) / 2) * Math.min(56 * k, (iW - 60 * k) / span), py = iY + iH - 34 * k; x.translate(px, py); x.rotate((R() - .5) * .5); x.fillText(e.e, 0, 0); x.restore(); });
    x.restore();
    // satin ribbon over the lid with a bow
    const rx = W / 2, ribW = 34 * k * sc;
    x.save(); x.beginPath(); x.moveTo(X + inset, Y - lidH); x.lineTo(X + bw - inset, Y - lidH); x.lineTo(X + bw, Y); x.lineTo(X, Y); x.closePath(); x.clip();
    const rgr = x.createLinearGradient(rx - ribW / 2, 0, rx + ribW / 2, 0); rgr.addColorStop(0, shade(rb.hex, -.25)); rgr.addColorStop(.45, shade(rb.hex, .25)); rgr.addColorStop(1, shade(rb.hex, -.2)); x.fillStyle = rgr; x.fillRect(rx - ribW / 2, Y - lidH, ribW, lidH * .2); x.restore();
    const bowY = Y - lidH * .8;
    x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 12 * k; x.shadowOffsetY = 5 * k;
    for (const d of [-1, 1]) {
      x.save(); x.translate(rx, bowY); x.rotate(d * .28);
      const g = x.createLinearGradient(0, -30 * k, d * 80 * k, 30 * k); g.addColorStop(0, shade(rb.hex, -.3)); g.addColorStop(.5, shade(rb.hex, .3)); g.addColorStop(1, shade(rb.hex, -.15)); x.fillStyle = g;
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(d * 40 * k, -50 * k * sc, d * 95 * k * sc, -30 * k * sc, d * 78 * k * sc, 8 * k); x.bezierCurveTo(d * 62 * k * sc, 34 * k * sc, d * 24 * k, 18 * k, 0, 0); x.fill();
      x.beginPath(); x.moveTo(0, 6 * k); x.lineTo(d * 30 * k * sc, 70 * k * sc); x.lineTo(d * 14 * k * sc, 74 * k * sc); x.lineTo(d * 4 * k, 10 * k); x.fill(); x.restore();
    }
    const kn = x.createRadialGradient(rx - 4 * k, bowY - 4 * k, 2 * k, rx, bowY, 18 * k * sc); kn.addColorStop(0, shade(rb.hex, .35)); kn.addColorStop(1, shade(rb.hex, -.25)); x.fillStyle = kn; x.beginPath(); x.ellipse(rx, bowY + 2 * k, 17 * k * sc, 14 * k * sc, 0, 0, 7); x.fill(); x.restore();
    // greeting card lying on the table, overlapping the box
    if (s.card && s.card.on) {
      const cc = ENG.canvas(10, 10); await B.drawCard(cc, s.card, 560);
      const cwid = 230 * k * sc + 30 * k, chei = cwid * cc.height / cc.width;
      x.save(); x.translate(Math.min(W - cwid / 2 - 14 * k, X + bw - 40 * k), Math.min(H - chei / 2 - 12 * k, Y + bh - 10 * k)); x.rotate(-.1);
      x.shadowColor = 'rgba(40,20,30,.4)'; x.shadowBlur = 22 * k; x.shadowOffsetY = 10 * k; x.fillStyle = '#fff'; x.fillRect(-cwid / 2, -chei / 2, cwid, chei); x.shadowColor = 'transparent';
      x.drawImage(cc, -cwid / 2, -chei / 2, cwid, chei); x.restore();
    }
    // soft light from the top-left
    const lt = x.createLinearGradient(0, 0, W, H); lt.addColorStop(0, 'rgba(255,255,255,.10)'); lt.addColorStop(1, 'rgba(0,0,0,.05)'); x.fillStyle = lt; x.fillRect(0, 0, W, H);
    return cv;
  };

  /* greeting card designs */
  function wrapLines(x, txt, maxW) {
    const out = [];
    for (const para of String(txt || '').split('\n')) {
      const words = para.split(/\s+/); let line = '';
      for (const w of words) { const test = line ? line + ' ' + w : w; if (x.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; }
      out.push(line);
    }
    return out;
  }
  const HEAD = { birthday: 'card_head_bday', eid: 'card_head_eid', thanks: 'card_head_thx', baby: 'card_head_baby', love: 'card_head_love' };
  B.drawCard = async function (cv, card, W) {
    W = W || 700; const H = Math.round(W * .7); cv.width = W; cv.height = H; const x = cv.getContext('2d'); const k = W / 700;
    const d = card.design || 'roses'; const R = rng(5);
    const bg = { roses: '#fffaf5', love: '#ffe4ee', birthday: '#ffffff', eid: '#2d1a5e', baby: '#eef7ff', thanks: '#e9fbfa', neuetalia: '#FE90BE', minimal: '#ffffff' }[d];
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    let ink = '#3b2b33', head = HEAD[d] ? t(HEAD[d]) : '';
    if (d === 'roses') { for (const [cx, cy] of [[0, 0], [W, H], [W, 0]]) for (let i = 0; i < 9; i++) { x.fillStyle = ['rgba(254,144,190,.55)', 'rgba(240,103,159,.45)', 'rgba(120,170,110,.45)'][i % 3]; x.beginPath(); x.arc(cx + (R() - .5) * 170 * k, cy + (R() - .5) * 150 * k, (24 + R() * 40) * k, 0, 7); x.fill(); } }
    if (d === 'love') { for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(200,16,46,${.15 + R() * .5})`; const s = (14 + R() * 26) * k, px = R() * W, py = R() * H; x.beginPath(); x.moveTo(px, py + s * .3); x.bezierCurveTo(px, py, px - s * .5, py, px - s * .5, py + s * .3); x.bezierCurveTo(px - s * .5, py + s * .6, px, py + s * .8, px, py + s); x.bezierCurveTo(px, py + s * .8, px + s * .5, py + s * .6, px + s * .5, py + s * .3); x.bezierCurveTo(px + s * .5, py, px, py, px, py + s * .3); x.fill(); } x.fillStyle = 'rgba(255,255,255,.85)'; rr(x, 50 * k, 50 * k, W - 100 * k, H - 100 * k, 18 * k); x.fill(); ink = '#8f1730'; }
    if (d === 'birthday') { for (let i = 0; i < 140; i++) { x.fillStyle = ['#FE90BE', '#01CAC9', '#6425FE', '#ffd23f', '#ff7a59'][i % 5]; x.save(); x.translate(R() * W, R() * H); x.rotate(R() * 6); x.fillRect(-5 * k, -2 * k, 10 * k, 4 * k); x.restore(); } x.fillStyle = 'rgba(255,255,255,.9)'; rr(x, 60 * k, 70 * k, W - 120 * k, H - 140 * k, 16 * k); x.fill(); ink = '#6425FE'; }
    if (d === 'eid') { x.fillStyle = '#d4af37'; x.beginPath(); x.arc(W - 110 * k, 100 * k, 52 * k, 0, 7); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(W - 88 * k, 86 * k, 48 * k, 0, 7); x.fill(); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,220,140,${.3 + R() * .6})`; x.beginPath(); x.arc(R() * W, R() * H, (1 + R() * 2.5) * k, 0, 7); x.fill(); } x.strokeStyle = '#d4af37'; x.lineWidth = 3 * k; x.strokeRect(22 * k, 22 * k, W - 44 * k, H - 44 * k); ink = '#f6e7b5'; }
    if (d === 'baby') { for (let i = 0; i < 30; i++) { x.fillStyle = ['#a9d3ec', '#f7a9c9', '#ffe08a'][i % 3]; const px = R() * W, py = R() * H, s = (8 + R() * 12) * k; x.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, r = j % 2 ? s * .45 : s; x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r); } x.fill(); } x.fillStyle = 'rgba(255,255,255,.88)'; rr(x, 60 * k, 60 * k, W - 120 * k, H - 120 * k, 20 * k); x.fill(); ink = '#2b5f86'; }
    if (d === 'thanks') { x.fillStyle = '#01CAC9'; x.fillRect(0, 0, 18 * k, H); x.fillStyle = 'rgba(1,202,201,.18)'; x.beginPath(); x.arc(W, H, 220 * k, 0, 7); x.fill(); ink = '#0b6463'; }
    if (d === 'neuetalia') { swirl(x, 0, 0, W, H, '#ffffff'); x.fillStyle = 'rgba(255,255,255,.92)'; rr(x, 50 * k, 50 * k, W - 100 * k, H - 100 * k, 22 * k); x.fill(); x.fillStyle = '#FE90BE'; x.font = `700 ${22 * k}px ui-sans, sans-serif`; x.textAlign = 'center'; x.fillText('NEUETALIA', W / 2, H - 70 * k); ink = '#333'; }
    if (d === 'minimal') { x.strokeStyle = '#d4af37'; x.lineWidth = 2 * k; x.strokeRect(26 * k, 26 * k, W - 52 * k, H - 52 * k); x.strokeRect(34 * k, 34 * k, W - 68 * k, H - 68 * k); }
    const font = card.font || 'greatvibes';
    const txt = (card.text || '').trim() || t('card_ph_short');
    await Promise.all(ENG.fontsFor(font, txt + head).map(ENG.loadFont));
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = ENG.isAr(txt) ? 'rtl' : 'ltr';
    let y0 = H * .5;
    if (head) { await Promise.all(ENG.fontsFor('greatvibes', head).map(ENG.loadFont)); x.font = ENG.cssFont(d === 'eid' ? 'ruqaa' : 'greatvibes', 50 * k, head); x.fillText(head, W / 2, 120 * k); y0 = H * .56; }
    let fs = 40 * k; let lines;
    for (let i = 0; i < 12; i++) { x.font = ENG.cssFont(font, fs, txt); lines = wrapLines(x, txt, W - 170 * k); if (lines.length * fs * 1.25 < H - (head ? 230 : 150) * k) break; fs *= .9; }
    lines.forEach((ln, i) => x.fillText(ln, W / 2, y0 + (i - (lines.length - 1) / 2) * fs * 1.25));
    if (card.from) { x.font = ENG.cssFont(font, Math.min(fs, 30 * k), card.from); x.fillText('— ' + card.from, W / 2, H - (d === 'neuetalia' ? 110 : 64) * k); }
    return cv;
  };

  /* ---------------- suggestion (rule based, by occasion + budget) ---------------- */
  const CARD_FOR = { liebe: 'love', jahrestag: 'love', hochzeit: 'roses', geburtstag: 'birthday', muttertag: 'roses', ramadan: 'eid', familie: 'baby', kinder: 'baby', freundschaft: 'neuetalia', fuersie: 'roses', fuerihn: 'minimal', weihnachten: 'minimal', einzug: 'thanks', trauer: 'minimal' };
  B.suggest = function (occ, budget) {
    const pool = ST.products().filter(p => !p.virtual && !NOBOX.includes(p.id) && p.stock > 0 && (!occ || (p.occ || []).includes(occ)) && ST.minPrice(p) <= budget * .6).sort((a, b) => (needsPhoto(a) ? 1 : 0) - (needsPhoto(b) ? 1 : 0) || (b.best ? 1 : 0) - (a.best ? 1 : 0) || ST.minPrice(a) - ST.minPrice(b));
    const box = budget >= 140 ? 'samt' : budget >= 90 ? 'schwarz' : budget >= 50 ? 'zebra' : 'rosa';
    const n = budget >= 400 ? 8 : budget >= 250 ? 7 : budget >= 180 ? 6 : budget >= 140 ? 5 : budget >= 90 ? 4 : budget >= 50 ? 3 : 2;
    const st = fresh(); st.box = box; st.size = n > 5 ? 'l' : n > 3 ? 'm' : 's'; st.fill = budget >= 90 ? 'petals' : 'shred'; st.ribbon = box === 'schwarz' ? 'gold' : box === 'samt' ? 'gold' : 'rosa';
    const seen = new Set();
    for (const p of pool) {
      if (st.items.length >= n) break; if (seen.has(p.cat) && pool.length > n * 2) continue;
      const D = ENG.blankDesign(p); for (const o of (p.opts || [])) D.opt[o.id] = o.def;
      const tmp = Object.assign({}, st, { items: st.items.concat([{ uid: ST.uid('b'), pid: p.id, D, qty: 1 }]) });
      if (B.price(tmp).total > budget) continue;
      st.items.push({ uid: ST.uid('b'), pid: p.id, D, qty: 1 }); seen.add(p.cat);
    }
    if (B.price(st).total + 3.5 <= budget) st.extras.rose = 1;
    if (B.price(st).total + 8.9 <= budget) st.extras.choco = 1;
    st.card = { on: true, design: CARD_FOR[occ] || 'roses', text: t('card_tpl_' + (CARD_FOR[occ] || 'roses')), from: '', font: C.lang() === 'ar' ? 'ruqaa' : 'greatvibes' };
    return st;
  };

  /* ---------------- page ---------------- */
  const STEPS = ['box_s1', 'box_s2', 'box_s3', 'box_s4'];
  let catF = '', qF = '';
  B.leave = function () { };
  B.useState = function (st) { const keep = S && S.editId; S = st; S.editId = keep || null; S.step = 2; save(); };
  B.show = function (sub, q) {
    q = q || {};
    if (q.edit) B.loadFromCart(q.edit);
    else if (!S) { S = ST.get('boxDraft', null) || fresh(); if (!S.card) S.card = fresh().card; }
    const P = B.price(); const n = itemCount();
    const head = `<div class="wrap lhead bx-head"><span class="eyb">${t('box_eyb')}</span><h1>${t('box_h')}</h1><p class="lead">${t('box_lead')}</p>
      <ol class="bx-steps">${STEPS.map((k, i) => `<li><button data-act="bx-step" data-v="${i + 1}" aria-current="${S.step === i + 1 ? 'step' : 'false'}"${i + 1 < S.step ? ' class="done"' : ''}><i>${i + 1 < S.step ? ic('check') : i + 1}</i><span>${t(k)}</span></button></li>`).join('')}</ol></div>`;
    let body = '';
    if (S.step === 1) body = `
      <section class="bx-sec"><h2>${t('box_pick')}</h2><div class="bx-opts">${BOXES.map(b => `<button class="bx-opt" data-act="bx-set" data-k="box" data-v="${b.id}" aria-pressed="${S.box === b.id}"><i class="bx-sw" style="--a:${b.c};--b:${b.c2}"${b.pattern ? ' data-p="1"' : ''}></i><b>${esc(L(b.l))}</b><small>${eur(b.price)}</small></button>`).join('')}</div></section>
      <section class="bx-sec"><h2>${t('box_size')}</h2><div class="bx-opts">${SIZES.map(z => `<button class="bx-opt" data-act="bx-set" data-k="size" data-v="${z.id}" aria-pressed="${S.size === z.id}"><b>${esc(L(z.l))}</b><small>${esc(L(z.d))}${z.add ? ' · +' + eur(z.add) : ''}</small></button>`).join('')}</div></section>
      <section class="bx-sec"><h2>${t('box_fill')}</h2><div class="bx-opts">${FILLS.map(f => `<button class="bx-opt" data-act="bx-set" data-k="fill" data-v="${f.id}" aria-pressed="${S.fill === f.id}"><b>${esc(L(f.l))}</b><small>${f.add ? '+' + eur(f.add) : t('free')}</small></button>`).join('')}</div></section>
      <section class="bx-sec"><h2>${t('box_ribbon')}</h2><div class="sws">${RIBBONS.map(r => `<button class="sw" data-act="bx-set" data-k="ribbon" data-v="${r.id}" role="radio" aria-checked="${S.ribbon === r.id}" style="--c:${r.hex}" title="${esc(L(r.l))}"><span class="vh">${esc(L(r.l))}</span></button>`).join('')}<span class="swl">${esc(L(byId(RIBBONS, S.ribbon).l))}</span></div></section>
      <section class="bx-sec bx-ai"><h2>${ic('sparkle')} ${t('box_suggest_h')}</h2><p class="muted">${t('box_suggest_p')}</p>
        <div class="row"><select class="in" id="bxOcc">${CAT_EXTRA.occ.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select><label class="fd-bud"><span class="vh">${t('finder_budget')}</span><input class="in" id="bxBud" type="number" min="10" step="any" inputmode="decimal" value="75" placeholder="${esc(t('finder_budget_ph'))}"><b>€</b></label><button class="btn purple" data-act="bx-suggest">${ic('sparkle')} ${t('box_suggest_btn')}</button></div></section>`;
    if (S.step === 2) {
      let list = ST.products().filter(p => !p.virtual && !NOBOX.includes(p.id));
      if (catF) list = list.filter(p => p.cat === catF);
      if (qF) { const r = SHOP.search(qF); list = list.filter(p => r.includes(p)); }
      body = `<section class="bx-sec"><h2>${t('box_items_h')} <small class="bx-cap${n > cap() ? ' over' : ''}">${n}/${cap()}</small></h2>
        ${S.items.length ? `<div class="bx-mine">${S.items.map(it => itemRow(it)).join('')}</div>` : `<p class="muted">${t('box_items_empty')}</p>`}</section>
        <section class="bx-sec"><h2>${t('box_extras')}</h2><div class="bx-extras">${EXTRAS.map(e => { const c = S.extras[e.id] || 0; return `<div class="bx-ex${c ? ' on' : ''}"><span class="e">${e.e}</span><b>${esc(L(e.l))}</b><small>${eur(e.price)}</small><div class="qty sm"><button data-act="bx-ex" data-v="${e.id}" data-d="-1" aria-label="−">${ic('minus')}</button><output>${c}</output><button data-act="bx-ex" data-v="${e.id}" data-d="1" aria-label="+">${ic('plus')}</button></div></div>`; }).join('')}</div></section>
        <section class="bx-sec"><h2>${t('box_add_h')}</h2>
          <div class="row" style="margin-bottom:10px"><input class="in" type="search" id="bxQ" placeholder="${esc(t('search_ph'))}" value="${esc(qF)}"></div>
          <nav class="chips"><button data-act="bx-cat" data-v="" aria-pressed="${!catF}">${t('all')}</button>${CAT_EXTRA.cats.map(c => `<button data-act="bx-cat" data-v="${c}" aria-pressed="${catF === c}">${t('cat_' + c)}</button>`).join('')}</nav>
          <div class="bx-grid">${list.map(p => `<article class="bx-p"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" loading="lazy" width="200" height="200"><b>${esc(L(p.name))}</b><span class="price">${eur(ST.minPrice(p))}</span><button class="btn sm" data-act="bx-add" data-v="${esc(p.id)}"${n >= cap() ? ' disabled' : ''}>${ic('plus')} ${t('box_add')}</button></article>`).join('')}</div></section>`;
    }
    if (S.step === 3) body = `
      <section class="bx-sec"><label class="check big"><input type="checkbox" data-bx="card.on"${S.card.on ? ' checked' : ''}><span><b>${t('box_card_on')}</b><small>${t('box_card_free')}</small></span></label></section>
      ${S.card.on ? `<section class="bx-sec"><h2>${t('box_card_design')}</h2><div class="bx-cards">${CARDS.map(c => `<button class="bx-card" data-act="bx-set" data-k="card.design" data-v="${c.id}" aria-pressed="${S.card.design === c.id}"><canvas data-cardmini="${c.id}" width="210" height="147"></canvas><span>${esc(L(c.l))}</span></button>`).join('')}</div></section>
      <section class="bx-sec"><h2>${t('box_card_text')}</h2>
        <label class="fld"><span>${t('box_card_msg')} <small id="bxCnt">${(S.card.text || '').length}/240</small></span><textarea class="in" rows="4" maxlength="240" data-bx="card.text" placeholder="${esc(t('card_ph'))}">${esc(S.card.text || '')}</textarea></label>
        <div class="row" style="margin:-4px 0 14px">${['love', 'birthday', 'thanks', 'eid'].map(k => `<button class="btn ghost sm" data-act="bx-tpl" data-v="${k}">${ic('wand')} ${esc(L(byId(CARDS, k).l))}</button>`).join('')}</div>
        <label class="fld"><span>${t('box_card_from')}</span><input class="in" maxlength="40" data-bx="card.from" value="${esc(S.card.from || '')}"></label>
        <span class="lb">${t('font')}</span><div class="fonts">${CARD_FONTS.map(f => `<button type="button" data-act="bx-set" data-k="card.font" data-v="${f}" aria-checked="${S.card.font === f}" style="font-family:'${ENG.fam(f)}'">${esc((window.FONTMETA[f] || {}).label || f)}</button>`).join('')}</div></section>
      <section class="bx-sec"><h2>${t('preview')}</h2><canvas id="bxCard" class="bx-cardbig"></canvas></section>` : ''}`;
    if (S.step === 4) body = `<section class="bx-sec"><h2>${t('box_overview')}</h2>
        <dl class="tot bx-tot"><dt>${esc(L(byId(BOXES, S.box).l))} · ${esc(L(byId(SIZES, S.size).l))}</dt><dd>${eur(byId(BOXES, S.box).price + byId(SIZES, S.size).add)}</dd>
        <dt>${t('box_fill')}: ${esc(L(byId(FILLS, S.fill).l))}</dt><dd>${byId(FILLS, S.fill).add ? eur(byId(FILLS, S.fill).add) : t('free')}</dd>
        <dt>${t('box_ribbon')}: ${esc(L(byId(RIBBONS, S.ribbon).l))}</dt><dd>${t('free')}</dd>
        ${Object.entries(S.extras).filter(([, c]) => c).map(([id, c]) => `<dt>${c} × ${esc(L(byId(EXTRAS, id).l))}</dt><dd>${eur(byId(EXTRAS, id).price * c)}</dd>`).join('')}
        ${S.items.map(it => { const p = ST.product(it.pid); return p ? `<dt>${it.qty} × ${esc(L(p.name))}</dt><dd>${eur(ST.unitPrice(p, it.D) * it.qty)}</dd>` : ''; }).join('')}
        <dt>${t('box_card_on')}: ${S.card.on ? esc(L(byId(CARDS, S.card.design).l)) : '–'}</dt><dd>${t('free')}</dd>
        <dt class="big">${t('total')}</dt><dd class="big">${eur(P.total)}</dd></dl>
        ${!S.items.length ? `<p class="warn">${t('box_need_item')}</p>` : ''}
        <button class="btn block big" data-act="bx-cart"${S.items.length ? '' : ' disabled'}>${ic('bag')} ${S.editId ? t('update_cart') : t('add_cart')}</button>
        <p class="muted small" style="margin-top:10px">${t('box_note')}</p></section>`;
    SHOP.page(`${head}<div class="wrap bx">
      <div class="bx-main">${body}
        <div class="bx-nav">${S.step > 1 ? `<button class="btn ghost" data-act="bx-step" data-v="${S.step - 1}">${ic('back', 'flip')} ${t('back')}</button>` : '<span></span>'}${S.step < 4 ? `<button class="btn" data-act="bx-step" data-v="${S.step + 1}">${t('next')} ${ic('chev', 'flip')}</button>` : ''}</div>
      </div>
      <aside class="bx-side"><div class="bx-stage"><canvas id="bxCv"></canvas><span class="bx-live">${t('live_preview')}</span></div>
        <div class="bx-sum"><span>${t('box_items_n', { n, c: cap() })}</span><b>${eur(P.total)}</b></div>
        <div class="vbtns"><button class="btn ghost sm" data-act="bx-reset">${ic('trash')} ${t('box_reset')}</button>${S.step < 4 ? `<button class="btn teal sm" data-act="bx-step" data-v="4">${t('box_overview')}</button>` : ''}</div></aside>
    </div>`, 'box');
    B.drawAll();
    const qi = $('#bxQ'); if (qi) qi.addEventListener('input', C.debounce(() => { qF = qi.value; const pos = qi.selectionStart; B.show(); const n2 = $('#bxQ'); if (n2) { n2.focus(); n2.setSelectionRange(pos, pos); } }, 350));
    $$('[data-bx]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      const v = el.type === 'checkbox' ? el.checked : el.value; setPath(el.dataset.bx, v); save();
      if (el.type === 'checkbox') return B.show();
      if (el.dataset.bx === 'card.text') { const c = $('#bxCnt'); if (c) c.textContent = v.length + '/240'; }
      drawSoon();
    }));
    $$('[data-bxname]').forEach(el => el.addEventListener('input', C.debounce(() => { const it = S.items.find(i => i.uid === el.dataset.bxname); if (!it) return; it.D.f[el.dataset.f] = el.value; save(); B.show(); const n2 = $(`[data-bxname="${it.uid}"][data-f="${el.dataset.f}"]`); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }, 500)));
    $$('[data-bxph]').forEach(el => el.addEventListener('change', () => B.photo(el)));
  };
  function itemRow(it) {
    const p = ST.product(it.pid); if (!p) return '';
    const tf = p.fields.find(f => (f.type === 'text') && !f.sf); const pf = p.fields.find(f => f.type === 'photo');
    const ph = pf && it.D.ph[pf.id];
    return `<div class="bx-it"><canvas data-itcv="${it.uid}" width="96" height="96"></canvas><div><b>${esc(L(p.name))}</b><span class="price">${eur(ST.unitPrice(p, it.D))}</span>
      ${tf ? `<input class="in" data-bxname="${it.uid}" data-f="${tf.id}" maxlength="${tf.max || 20}" value="${esc(it.D.f[tf.id] != null ? it.D.f[tf.id] : tf.def)}" aria-label="${esc(t(tf.label))}">` : ''}
      <div class="row">${pf ? `<label class="btn ghost sm upl">${ic(ph ? 'check' : 'camera')} ${ph ? t('photo_replace') : t('photo_add')}<input type="file" accept="image/*" data-bxph="${it.uid}" data-f="${pf.id}"></label>` : ''}<a class="link" href="#/p/${esc(p.id)}">${t('details')}</a><button class="link" data-act="bx-rm" data-v="${it.uid}">${t('remove')}</button></div></div></div>`;
  }
  function setPath(path, v) { const ks = path.split('.'); let o = S; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = v; }
  const drawSoon = C.debounce(() => B.drawAll(), 150);
  B.drawAll = async function () {
    const cv = $('#bxCv'); if (cv) await B.drawBox(cv, S, Math.min(1000, Math.round((cv.parentElement.clientWidth || 500) * Math.min(2, devicePixelRatio || 1))));
    const cb = $('#bxCard'); if (cb) await B.drawCard(cb, S.card, Math.min(900, Math.round((cb.parentElement.clientWidth || 500) * Math.min(2, devicePixelRatio || 1))));
    for (const c of $$('[data-cardmini]')) await B.drawCard(c, Object.assign({}, S.card, { design: c.dataset.cardmini }), 210);
    for (const c of $$('[data-itcv]')) { const it = S.items.find(i => i.uid === c.dataset.itcv); if (!it) continue; const th = await itemThumb(it); if (th) { c.width = 192; c.height = 192; const x = c.getContext('2d'); const r = Math.max(192 / th.width, 192 / th.height); x.drawImage(th, (192 - th.width * r) / 2, (192 - th.height * r) / 2, th.width * r, th.height * r); } }
  };
  B.photo = async function (el) {
    const it = S.items.find(i => i.uid === el.dataset.bxph); const file = el.files && el.files[0]; el.value = ''; if (!it || !file) return;
    C.toast(t('photo_loading'));
    try { const r = await ST.readImage(file, 2000); const id = await ST.photoPut(r.blob); it.D.ph[el.dataset.f] = { src: id, crop: { x: 0, y: 0, s: 1, r: 0 }, fx: 'none', w: r.w, h: r.h }; save(); B.show(); C.toast(t('photo_ok')); }
    catch (e) { C.toast(t('photo_err'), 'err'); }
  };

  /* ---------------- events ---------------- */
  B.onClick = function (el) {
    const a = el.dataset.act; if (!a || !a.startsWith('bx-')) return false;
    const v = el.dataset.v;
    switch (a) {
      case 'bx-step': S.step = Math.max(1, Math.min(4, +v)); save(); B.show(); scrollTo({ top: 0, behavior: C.reduced() ? 'auto' : 'smooth' }); return true;
      case 'bx-set': setPath(el.dataset.k, v); if (el.dataset.k === 'card.font') ENG.loadFont(v); save(); B.show(); return true;
      case 'bx-cat': catF = v; B.show(); return true;
      case 'bx-add': { if (itemCount() >= cap()) { C.toast(t('box_full'), 'err'); return true; } const p = ST.product(v); const D = ENG.blankDesign(p); for (const o of (p.opts || [])) D.opt[o.id] = o.def; S.items.push({ uid: ST.uid('b'), pid: v, D, qty: 1 }); save(); C.toast(t('box_added')); B.show(); return true; }
      case 'bx-rm': S.items = S.items.filter(i => i.uid !== v); save(); B.show(); return true;
      case 'bx-ex': { const c = Math.max(0, Math.min(999, (S.extras[v] || 0) + +el.dataset.d)); if (c) S.extras[v] = c; else delete S.extras[v]; save(); B.show(); return true; }
      case 'bx-tpl': S.card.text = t('card_tpl_' + v); S.card.design = v; save(); B.show(); return true;
      case 'bx-suggest': { const occ = $('#bxOcc').value, bud = Math.max(10, +$('#bxBud').value || 75); const keep = S.editId; S = B.suggest(occ, bud); S.editId = keep; S.step = 2; save(); C.toast(t('box_suggested')); B.show(); return true; }
      case 'bx-reset': S = fresh(); save(); B.show(); return true;
      case 'bx-cart': B.toCart(); return true;
    }
    return false;
  };

  /* ---------------- cart ---------------- */
  B.toCart = async function () {
    if (!S.items.length) { C.toast(t('box_need_item'), 'err'); return; }
    const miss = S.items.find(it => { const p = ST.product(it.pid); return p && p.fields.some(f => f.type === 'photo' && !f.optional && !(it.D.ph && it.D.ph[f.id])); });
    if (miss) { C.toast(t('box_need_photo', { n: L(ST.product(miss.pid).name) }), 'err'); S.step = 2; save(); B.show(); setTimeout(() => { const el = $(`[data-bxph="${miss.uid}"]`); if (el) { const c = el.closest('.bx-it'); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('flash'); } }, 80); return; }
    const boxId = S.editId || ST.uid('i');
    const cv = ENG.canvas(10, 10); await B.drawBox(cv, S, 520);
    const P = B.price();
    const cfg = JSON.parse(JSON.stringify({ box: S.box, size: S.size, fill: S.fill, ribbon: S.ribbon, extras: S.extras, card: S.card }));
    let cart = ST.cart().filter(i => i.id !== boxId && !(i.D && i.D.boxOf === boxId));
    cart.push({ id: boxId, pid: 'geschenkbox', D: { f: {}, font: {}, color: {}, size: {}, ph: {}, opt: {}, box: cfg }, qty: 1, unit: P.box, tax: 19, name: GBOX.name, preview: cv.toDataURL('image/jpeg', .82), at: Date.now() });
    for (const it of S.items) {
      const p = ST.product(it.pid); if (!p) continue;
      const D = JSON.parse(JSON.stringify(it.D)); for (const f of p.fields) if (D.f[f.id] == null && f.type !== 'photo') D.f[f.id] = f.def; D.boxOf = boxId;
      const th = await itemThumb(it); const tc = ENG.canvas(240, 240); if (th) { const r = Math.max(240 / th.width, 240 / th.height); tc.getContext('2d').drawImage(th, (240 - th.width * r) / 2, (240 - th.height * r) / 2, th.width * r, th.height * r); }
      cart.push({ id: ST.uid('i'), pid: p.id, D, qty: it.qty, unit: ST.unitPrice(p, D), tax: p.tax || 19, name: p.name, preview: tc.toDataURL('image/jpeg', .8), at: Date.now() });
    }
    ST.saveCart(cart); S.editId = boxId; save(); SHOP.refreshHeader(); CHECKOUT.drawer(boxId);
  };
  B.loadFromCart = function (id) {
    const cart = ST.cart(); const bx = cart.find(i => i.id === id && i.pid === 'geschenkbox'); if (!bx) return;
    S = Object.assign(fresh(), JSON.parse(JSON.stringify(bx.D.box)), { editId: id, step: 4 });
    S.items = cart.filter(i => i.D && i.D.boxOf === id).map(i => { const D = JSON.parse(JSON.stringify(i.D)); delete D.boxOf; return { uid: ST.uid('b'), pid: i.pid, D, qty: i.qty }; });
  };
  /* lines for cart, emails, invoice and admin */
  B.lines = function (it, lang) {
    const c = (it.D && it.D.box) || {}; const out = [];
    out.push([t('box_pick', null, lang), L(byId(BOXES, c.box).l, lang) + ' · ' + L(byId(SIZES, c.size).l, lang)]);
    out.push([t('box_fill', null, lang), L(byId(FILLS, c.fill).l, lang) + ' · ' + t('box_ribbon', null, lang) + ' ' + L(byId(RIBBONS, c.ribbon).l, lang)]);
    const ex = Object.entries(c.extras || {}).filter(([, n]) => n).map(([id, n]) => n + '× ' + L(byId(EXTRAS, id).l, lang));
    if (ex.length) out.push([t('box_extras', null, lang), ex.join(', ')]);
    const inner = ST.cart().concat(...ST.orders().map(o => o.items)).filter(i => i.D && i.D.boxOf === it.id);
    const seen = new Set(); const names = inner.filter(i => !seen.has(i.id) && seen.add(i.id)).map(i => i.qty + '× ' + L(i.name, lang));
    if (names.length) out.push([t('box_items_h', null, lang), names.join(', ')]);
    if (c.card && c.card.on) { out.push([t('box_card_on', null, lang), L(byId(CARDS, c.card.design).l, lang) + ' · ' + ((window.FONTMETA[c.card.font] || {}).label || '')]); if (c.card.text) out.push([t('box_card_msg', null, lang), c.card.text.replace(/\n/g, ' / ') + (c.card.from ? ' — ' + c.card.from : '')]); }
    return out;
  };
  /** printable greeting card (PNG, 148 × 105 mm at 300 dpi) for the shop */
  B.cardBlob = async function (it) { const c = (it.D && it.D.box && it.D.box.card) || {}; const cv = ENG.canvas(10, 10); await B.drawCard(cv, c, 1748); return C.canvasBlob(cv, 'image/png'); };
})();
