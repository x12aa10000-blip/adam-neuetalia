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

  /** draw the open gift box with its contents. returns the canvas */
  B.drawBox = async function (cv, s, W) {
    s = s || S; W = W || 900; const H = Math.round(W * .86);
    cv.width = W; cv.height = H; const x = cv.getContext('2d'); const k = W / 900;
    const bx = byId(BOXES, s.box), rb = byId(RIBBONS, s.ribbon);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff1f7'); g.addColorStop(1, '#ffffff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sz = byId(SIZES, s.size); const sc = sz.id === 's' ? .82 : sz.id === 'm' ? .92 : 1;
    const bw = 660 * k * sc, bh = 360 * k * sc, cx = W / 2, top = 250 * k + (1 - sc) * 140 * k, wall = 120 * k * sc;
    const X = cx - bw / 2, Y = top;
    // shadow
    x.save(); x.fillStyle = 'rgba(80,30,60,.18)'; x.filter = `blur(${18 * k}px)`; x.beginPath(); x.ellipse(cx, Y + bh + wall + 10 * k, bw * .55, 26 * k, 0, 0, 7); x.fill(); x.restore();
    // lid leaning behind
    x.save(); x.translate(cx + bw * .08, Y - 30 * k); x.rotate(-.09); x.fillStyle = shade(bx.c, -.08); rr(x, -bw * .52, -150 * k * sc, bw * 1.04, 170 * k * sc, 10 * k); x.fill();
    if (bx.pattern) swirl(x, -bw * .52, -150 * k * sc, bw * 1.04, 170 * k * sc, bx.c2);
    if (bx.gold) { x.strokeStyle = '#d4af37'; x.lineWidth = 3 * k; rr(x, -bw * .52 + 10 * k, -140 * k * sc, bw * 1.04 - 20 * k, 150 * k * sc, 8 * k); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(-bw * .52, 10 * k * sc, bw * 1.04, 10 * k); x.restore();
    // inner opening
    x.save(); rr(x, X, Y, bw, bh, 10 * k); x.clip();
    x.fillStyle = bx.pattern ? '#ffd6e8' : shade(bx.c, -.25); x.fillRect(X, Y, bw, bh);
    const R = rng(11);
    if (s.fill === 'satin') { const sg = x.createLinearGradient(X, Y, X + bw, Y + bh); sg.addColorStop(0, '#fbe3ee'); sg.addColorStop(.5, '#ffffff'); sg.addColorStop(1, '#f5cfe0'); x.fillStyle = sg; x.fillRect(X, Y, bw, bh); x.strokeStyle = 'rgba(200,120,160,.25)'; x.lineWidth = 3 * k; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(X, Y + bh * R()); x.bezierCurveTo(X + bw * .3, Y + bh * R(), X + bw * .7, Y + bh * R(), X + bw, Y + bh * R()); x.stroke(); } }
    else { const cols = s.fill === 'petals' ? ['#b0122c', '#d6223f', '#8e0d22', '#e8476a'] : bx.id === 'schwarz' ? ['#d4af37', '#b8913f', '#e9cf7c'] : bx.id === 'kraft' ? ['#d9b48a', '#c49464', '#e8cba7'] : ['#ffc2dc', '#fe90be', '#ffffff', '#f6a5c8'];
      for (let i = 0; i < (s.fill === 'petals' ? 260 : 900); i++) { x.strokeStyle = x.fillStyle = cols[i % cols.length]; const px = X + bw * R(), py = Y + bh * R();
        if (s.fill === 'petals') { x.beginPath(); x.ellipse(px, py, 16 * k, 10 * k, R() * 6, 0, 7); x.fill(); }
        else { x.lineWidth = 2.2 * k; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 20 * k * (R() - .5), py + 20 * k * (R() - .5), px + 30 * k * (R() - .5), py + 30 * k * (R() - .5)); x.stroke(); } } }
    // inner shadow along the back wall
    const ig = x.createLinearGradient(0, Y, 0, Y + 60 * k); ig.addColorStop(0, 'rgba(0,0,0,.28)'); ig.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = ig; x.fillRect(X, Y, bw, 60 * k);
    // items
    const list = []; for (const it of s.items) for (let q = 0; q < it.qty; q++) list.push(it);
    const ex = []; for (const [id, n] of Object.entries(s.extras || {})) for (let q = 0; q < n; q++) ex.push(byId(EXTRAS, id));
    const n = list.length;
    const ih = bh - (ex.length ? 56 * k : 0);
    const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * bw / ih)))), rows = Math.max(1, Math.ceil(n / cols));
    const cw = bw / cols, ch = ih / rows; const side = Math.min(cw * .88, ch * .9);
    for (let i = 0; i < n; i++) {
      const c = await itemThumb(list[i]); if (!c) continue;
      const col = i % cols, row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols); const px = X + (bw - inRow * cw) / 2 + cw * col + cw / 2 + (R() - .5) * 14 * k, py = Y + ch * row + ch / 2 + (R() - .5) * 10 * k;
      x.save(); x.translate(px, py); x.rotate((R() - .5) * .14);
      x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 16 * k; x.shadowOffsetY = 6 * k;
      x.fillStyle = '#fff'; rr(x, -side / 2, -side / 2, side, side, 14 * k); x.fill(); x.shadowColor = 'transparent';
      x.save(); rr(x, -side / 2 + 5 * k, -side / 2 + 5 * k, side - 10 * k, side - 10 * k, 10 * k); x.clip();
      const r = Math.max((side - 10 * k) / c.width, (side - 10 * k) / c.height); x.drawImage(c, -c.width * r / 2, -c.height * r / 2, c.width * r, c.height * r); x.restore(); x.restore();
    }
    if (!n) { x.fillStyle = 'rgba(51,51,51,.6)'; x.font = `600 ${26 * k}px ui-sans, ui-ar, sans-serif`; x.textAlign = 'center'; x.fillText(t('box_empty_canvas'), cx, Y + bh / 2); }
    x.restore();
    // extras on top
    ex.slice(0, 12).forEach((e, i) => { x.save(); x.font = `${46 * k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; const px = X + 40 * k + i * 54 * k, py = Y + bh - 30 * k; x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 8 * k; x.fillText(e.e, px, py); x.restore(); });
    // front wall
    x.save(); x.beginPath(); x.moveTo(X - 6 * k, Y + bh - 4 * k); x.lineTo(X + bw + 6 * k, Y + bh - 4 * k); x.lineTo(X + bw - 4 * k, Y + bh + wall); x.lineTo(X + 4 * k, Y + bh + wall); x.closePath();
    const fg = x.createLinearGradient(0, Y + bh, 0, Y + bh + wall); fg.addColorStop(0, bx.c); fg.addColorStop(1, shade(bx.c, -.12)); x.fillStyle = fg; x.fill();
    x.save(); x.clip(); if (bx.pattern) swirl(x, X, Y + bh - 4 * k, bw, wall + 4 * k, bx.c2); if (bx.velvet) { for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(255,255,255,${R() * .06})`; x.fillRect(X + bw * R(), Y + bh + wall * R(), 2 * k, 2 * k); } } x.restore();
    if (bx.gold) { x.strokeStyle = '#d4af37'; x.lineWidth = 3 * k; x.strokeRect(X + 14 * k, Y + bh + 12 * k, bw - 28 * k, wall - 26 * k); x.fillStyle = '#d4af37'; x.font = `600 ${24 * k}px ui-sans, sans-serif`; x.textAlign = 'center'; x.fillText('NEUETALIA', cx, Y + bh + wall / 2 + 8 * k); }
    // ribbon band + bow
    x.fillStyle = rb.hex; x.fillRect(cx - 22 * k, Y + bh - 4 * k, 44 * k, wall + 4 * k);
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(cx + 14 * k, Y + bh - 4 * k, 8 * k, wall + 4 * k);
    x.restore();
    x.save(); x.translate(cx, Y + bh + 6 * k); x.fillStyle = rb.hex; x.strokeStyle = 'rgba(0,0,0,.15)'; x.lineWidth = 2 * k;
    for (const d of [-1, 1]) { x.beginPath(); x.ellipse(d * 48 * k, -10 * k, 52 * k, 26 * k, d * .35, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(d * 8 * k, 0); x.lineTo(d * 40 * k, 70 * k); x.lineTo(d * 22 * k, 66 * k); x.lineTo(d * 2 * k, 6 * k); x.fill(); }
    x.beginPath(); x.ellipse(0, -6 * k, 18 * k, 16 * k, 0, 0, 7); x.fill(); x.stroke(); x.restore();
    // greeting card leaning in front
    if (s.card && s.card.on) {
      const cc = ENG.canvas(10, 10); await B.drawCard(cc, s.card, 520);
      x.save(); x.translate(X + bw - 120 * k, Y + bh + wall - 60 * k); x.rotate(-.12); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 18 * k; x.shadowOffsetY = 8 * k;
      const cwid = 250 * k * sc, chei = cwid * cc.height / cc.width; x.fillStyle = '#fff'; x.fillRect(-cwid / 2, -chei / 2, cwid, chei); x.shadowColor = 'transparent'; x.drawImage(cc, -cwid / 2, -chei / 2, cwid, chei); x.restore();
    }
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
    const n = budget >= 140 ? 5 : budget >= 90 ? 4 : budget >= 50 ? 3 : 2;
    const st = fresh(); st.box = box; st.size = n > 3 ? 'm' : 's'; st.fill = budget >= 90 ? 'petals' : 'shred'; st.ribbon = box === 'schwarz' ? 'gold' : box === 'samt' ? 'gold' : 'rosa';
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
        <div class="row"><select class="in" id="bxOcc">${CAT_EXTRA.occ.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select><select class="in" id="bxBud">${[30, 50, 75, 100, 150].map(v => `<option value="${v}"${v === 75 ? ' selected' : ''}>${t('price_to')} ${eur(v)}</option>`).join('')}</select><button class="btn purple" data-act="bx-suggest">${ic('sparkle')} ${t('box_suggest_btn')}</button></div></section>`;
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
      case 'bx-suggest': { const occ = $('#bxOcc').value, bud = +$('#bxBud').value; const keep = S.editId; S = B.suggest(occ, bud); S.editId = keep; S.step = 2; save(); C.toast(t('box_suggested')); B.show(); return true; }
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
