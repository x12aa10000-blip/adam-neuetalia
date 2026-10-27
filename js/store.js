/* Data layer: persistence, products, pricing, delivery dates, orders, emails, documents. */
(function () {
  'use strict';
  const NS = 'an2:';
  const ST = {};
  window.ST = ST;

  /* ---------------- persistence ---------------- */
  const mem = {};
  let storageOk = true;
  ST.get = function (k, def) {
    if (k in mem) return mem[k];
    let v = def;
    try { const s = localStorage.getItem(NS + k); if (s != null) v = JSON.parse(s); } catch (e) { storageOk = false; }
    mem[k] = v; return v;
  };
  ST.set = function (k, v) {
    mem[k] = v;
    try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; }
    catch (e) { storageOk = false; if (ST.onStorageError) ST.onStorageError(e); return false; }
  };
  ST.ok = () => storageOk;
  ST.forget = k => { delete mem[k]; };
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith(NS)) return;
    const k = e.key.slice(NS.length); delete mem[k];
    if (ST.onExternalChange) ST.onExternalChange(k);
  });
  ST.uid = (p) => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------------- photos in IndexedDB ---------------- */
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      try {
        const r = indexedDB.open('an2-photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('p');
        r.onsuccess = () => res(r.result); r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return dbp;
  }
  const urlCache = new Map(); const memBlobs = new Map();
  ST.photoPut = async function (blob) {
    const id = 'idb:' + ST.uid('ph');
    memBlobs.set(id, blob);
    const d = await idb();
    if (d) await new Promise(r => { try { const tx = d.transaction('p', 'readwrite'); tx.objectStore('p').put(blob, id); tx.oncomplete = r; tx.onerror = r; } catch (e) { r(); } });
    return id;
  };
  ST.photoBlob = async function (id) {
    if (memBlobs.has(id)) return memBlobs.get(id);
    const d = await idb(); if (!d) return null;
    return new Promise(r => { try { const q = d.transaction('p').objectStore('p').get(id); q.onsuccess = () => { if (q.result) memBlobs.set(id, q.result); r(q.result || null); }; q.onerror = () => r(null); } catch (e) { r(null); } });
  };
  ST.photoUrl = async function (id) {
    if (!id) return null;
    if (!String(id).startsWith('idb:')) return id;
    if (urlCache.has(id)) return urlCache.get(id);
    const b = await ST.photoBlob(id); if (!b) return null;
    const u = URL.createObjectURL(b); urlCache.set(id, u); return u;
  };
  // let the engine resolve idb: sources
  const engImg = ENG.img;
  ENG.img = async function (src) { if (src && String(src).startsWith('idb:')) src = await ST.photoUrl(src); return engImg(src); };

  /** read an uploaded file → resized JPEG/PNG blob + pixel size */
  ST.readImage = function (file, max, keepAlpha) {
    return new Promise((res, rej) => {
      if (!file || (file.type && !/^image\//.test(file.type))) return rej(new Error('type'));
      const u = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        const sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const c = ENG.canvas(im.naturalWidth * sc, im.naturalHeight * sc), x = c.getContext('2d');
        if (!keepAlpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => b ? res({ blob: b, w: im.naturalWidth, h: im.naturalHeight }) : rej(new Error('blob')), keepAlpha ? 'image/png' : 'image/jpeg', .88);
      };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
      im.src = u;
    });
  };

  /* ---------------- settings ---------------- */
  const DEFAULT_SETTINGS = {
    shop: { name: 'Adam & Neuetalia', owner: 'Adam & Neuetalia', street: 'Steindamm 62', zip: '20099', city: 'Hamburg', phone: '+49 177 6449312', wa: '4915751000018', email: 'info@adamneuetalia.com',
      taxId: 'DE000000000', court: 'Amtsgericht Hamburg', iban: 'DE00 0000 0000 0000 0000 00', bank: 'Hamburger Sparkasse' },
    hours: { wd: '09:00 – 22:00', sun: '09:00 – 16:00' },
    cutoff: '14:00',
    freeFrom: 60,
    shipping: {
      pickup: { on: true, price: 0 },
      local: { on: true, price: 6.9, zips: '20000-22999', windows: ['10:00–14:00', '14:00–18:00', '18:00–21:00'] },
      dhl: { on: true, price: 5.9, days: 2 },
      eu: { on: true, price: 14.9, days: 4 }
    },
    wrap: 3.9,
    payments: { paypal: true, card: true, klarna: false, applepay: false, vorkasse: true, cash: true },
    approvalDefault: true,
    cancelMinutes: 60,
    holidays: ['2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-10-03', '2026-10-31', '2026-12-25', '2026-12-26', '2027-01-01'],
    campaign: { on: true, key: 'auto' },
    notify: { sound: true }
  };
  ST.settings = () => deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), ST.get('settings', {}));
  ST.saveSettings = s => ST.set('settings', s);
  function deepMerge(a, b) { if (!b || typeof b !== 'object') return a; for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }

  /* ---------------- products ---------------- */
  let PCACHE = null;
  ST.invalidate = () => { PCACHE = null; };
  ST.products = function (all) {
    if (!PCACHE) {
      const ov = ST.get('prodOv', {});
      const custom = ST.get('customProducts', []);
      const list = CATALOG.map(p => Object.assign({}, p, ov[p.id] || {}));
      for (const c of custom) list.push(Object.assign({ custom: 1 }, c, ov[c.id] || {}));
      for (const p of list) { if (p.active == null) p.active = true; if (p.stock == null) p.stock = 25; }
      ST.applyCats();
      const I0 = window.I18N; if (I0) for (const p of list) for (const o of (p.opts || [])) { if (o.lab) { const k = 'olab_' + p.id + '_' + o.id; for (const l of ['de', 'en', 'ar']) I0[l][k] = o.lab[l] || o.lab.de; o.label = k; } }
      // labels the owner typed in the product designer (3 languages)
      const I = window.I18N; if (I) for (const p of list) for (const f of (p.fields || [])) if (f.lab) { const k = 'lab_' + p.id + '_' + f.id; for (const l of ['de', 'en', 'ar']) if (I[l]) I[l][k] = f.lab[l] || f.lab.de; f.label = k; }
      PCACHE = list;
    }
    return all ? PCACHE : PCACHE.filter(p => p.active && !p.hidden && !p.deleted && CAT_EXTRA.cats.includes(p.cat));
  };
  ST.product = id => ST.products(true).find(p => p.id === id);
  /* categories the owner can rename, add, sort and delete: [{id, l:{de,en,ar}, d:{de,en,ar}}] */
  ST.catCfg = () => ST.get('catCfg', null);
  ST.applyCats = function () {
    const cfg = ST.catCfg(); const I = window.I18N;
    if (!cfg || !window.CAT_EXTRA) return;
    CAT_EXTRA.cats = cfg.map(c => c.id);
    if (I) for (const c of cfg) for (const l of ['de', 'en', 'ar']) { if (c.l && c.l[l]) I[l]['cat_' + c.id] = c.l[l]; if (c.d && c.d[l]) I[l]['catd_' + c.id] = c.d[l]; }
  };
  ST.saveCats = function (cfg) { ST.set('catCfg', cfg); ST.invalidate(); ST.applyCats(); };
  ST.deleteProduct = function (id) { const p = ST.product(id); if (!p) return; if (p.custom) ST.deleteCustom(id); else ST.saveOverride(id, { deleted: true, active: false }); };
  ST.restoreProduct = function (id) { ST.saveOverride(id, { deleted: false, active: true }); };
  ST.saveOverride = function (id, patch) { const ov = ST.get('prodOv', {}); ov[id] = Object.assign({}, ov[id] || {}, patch); ST.set('prodOv', ov); ST.invalidate(); };
  ST.saveCustom = function (p) { const list = ST.get('customProducts', []); const i = list.findIndex(x => x.id === p.id); if (i >= 0) list[i] = p; else list.push(p); ST.set('customProducts', list); ST.invalidate(); };
  ST.deleteCustom = function (id) { ST.set('customProducts', ST.get('customProducts', []).filter(x => x.id !== id)); ST.invalidate(); };
  ST.onSale = p => !!(p.salePrice && p.salePrice < p.price && (!p.saleEnd || new Date(p.saleEnd) > new Date()));
  ST.basePrice = p => ST.onSale(p) ? p.salePrice : p.price;
  ST.optPrice = function (p, D) {
    let x = 0;
    for (const o of (p.opts || [])) { const v = (D.opt && D.opt[o.id]) || o.def; const c = o.choices.find(c => c.id === v); if (c && c.price) x += c.price; }
    return x;
  };
  ST.unitPrice = (p, D) => round2(ST.basePrice(p) + ST.optPrice(p, D || { opt: {} }));
  ST.minPrice = function (p) { let x = ST.basePrice(p); for (const o of (p.opts || [])) x += Math.min(0, ...o.choices.map(c => c.price || 0)); return round2(x); };
  ST.hasFromPrice = p => (p.opts || []).some(o => o.choices.some(c => c.price));
  const round2 = n => Math.round(n * 100) / 100;
  ST.round2 = round2;

  /* ---------------- calendar / delivery ---------------- */
  const pad = n => String(n).padStart(2, '0');
  ST.iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  ST.isWorkday = function (d) { const s = ST.settings(); return d.getDay() !== 0 && !s.holidays.includes(ST.iso(d)); };
  ST.addWorkdays = function (d, n) { const x = new Date(d); x.setHours(12, 0, 0, 0); let k = 0; while (k < n) { x.setDate(x.getDate() + 1); if (ST.isWorkday(x)) k++; } return x; };
  ST.nextWorkday = function (d) { const x = new Date(d); x.setHours(12, 0, 0, 0); while (!ST.isWorkday(x)) x.setDate(x.getDate() + 1); return x; };
  ST.cutoffPassed = function (now) { now = now || new Date(); const [h, m] = ST.settings().cutoff.split(':').map(Number); return now.getHours() * 60 + now.getMinutes() >= h * 60 + m; };
  ST.minutesToCutoff = function (now) { now = now || new Date(); const [h, m] = ST.settings().cutoff.split(':').map(Number); return h * 60 + m - (now.getHours() * 60 + now.getMinutes()); };
  /** earliest date items are ready in the shop */
  ST.readyDate = function (prodDays, now) {
    now = now || new Date();
    let start = new Date(now); start.setHours(12, 0, 0, 0);
    const late = ST.cutoffPassed(now) || !ST.isWorkday(start);
    if (!prodDays || prodDays <= 0) return late ? ST.addWorkdays(start, 1) : ST.nextWorkday(start);
    return ST.addWorkdays(late ? ST.nextWorkday(start) : start, prodDays - (late ? 0 : 1) + (late ? 1 : 0));
  };
  ST.prodDaysOf = items => Math.max(0, ...items.map(i => { const p = ST.product(i.pid); return p ? (p.sd ? 0 : (p.prod || 2)) : 2; }));
  ST.deliveryDate = function (method, prodDays, now) {
    const ready = ST.readyDate(prodDays, now); const s = ST.settings();
    if (method === 'pickup' || method === 'local') return ready;
    if (method === 'dhl') return ST.addWorkdays(ready, s.shipping.dhl.days || 2);
    if (method === 'eu') return ST.addWorkdays(ready, s.shipping.eu.days || 4);
    return ready;
  };
  ST.localZip = function (zip) {
    const z = parseInt(String(zip || '').replace(/\D/g, ''), 10); if (!z) return false;
    return ST.settings().shipping.local.zips.split(',').some(r => { const [a, b] = r.trim().split('-').map(Number); return b ? (z >= a && z <= b) : z === a; });
  };

  /* ---------------- coupons & gift cards ---------------- */
  const DEFAULT_COUPONS = [
    { code: 'WILLKOMMEN10', type: 'pct', value: 10, min: 0, until: '', uses: 0, max: 0, on: true, note: 'Neukunden' },
    { code: 'LIEBE5', type: 'eur', value: 5, min: 40, until: '', uses: 0, max: 0, on: true, note: '' }
  ];
  ST.coupons = () => ST.get('coupons', DEFAULT_COUPONS);
  ST.saveCoupons = l => ST.set('coupons', l);
  ST.findCoupon = function (code, subtotal) {
    code = String(code || '').trim().toUpperCase(); if (!code) return { err: 'empty' };
    const c = ST.coupons().find(x => x.code.toUpperCase() === code);
    if (!c || !c.on) return { err: 'invalid' };
    if (c.until && new Date(c.until + 'T23:59:59') < new Date()) return { err: 'expired' };
    if (c.max && c.uses >= c.max) return { err: 'used' };
    if (c.min && subtotal < c.min) return { err: 'min', min: c.min };
    return { c };
  };
  ST.giftcards = () => ST.get('giftcards', []);
  ST.saveGiftcards = l => ST.set('giftcards', l);
  ST.findGiftcard = function (code) { code = String(code || '').trim().toUpperCase(); const g = ST.giftcards().find(x => x.code === code); if (!g) return { err: 'invalid' }; if (g.balance <= 0) return { err: 'empty' }; return { g }; };
  ST.newGiftcardCode = () => 'GS-' + Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 6).toUpperCase()).join('-');

  /* ---------------- totals ---------------- */
  ST.totals = function (items, ctx) {
    ctx = ctx || {}; const s = ST.settings();
    const lines = items.map(i => ({ gross: round2(i.unit * i.qty), tax: i.tax || 19 }));
    const sub = round2(lines.reduce((a, l) => a + l.gross, 0));
    let ship = 0;
    const m = ctx.method;
    if (m === 'local') ship = s.shipping.local.price;
    else if (m === 'dhl') ship = sub >= s.freeFrom ? 0 : s.shipping.dhl.price;
    else if (m === 'eu') ship = s.shipping.eu.price;
    const wrap = ctx.wrap ? round2(s.wrap * (ctx.wrapQty || 1)) : 0;
    let discount = 0;
    if (ctx.coupon) { const f = ST.findCoupon(ctx.coupon, sub); if (f.c) discount = f.c.type === 'pct' ? round2(sub * f.c.value / 100) : Math.min(sub, f.c.value); }
    let pre = round2(sub + ship + wrap - discount);
    let gift = 0;
    if (ctx.giftcard) { const g = ST.findGiftcard(ctx.giftcard); if (g.g) gift = Math.min(pre, g.g.balance); }
    const total = round2(pre - gift);
    // VAT (included). Shipping/wrap/discount distributed by share of 19 % / 7 % goods.
    const by = { 19: 0, 7: 0 }; lines.forEach(l => { by[l.tax] = (by[l.tax] || 0) + l.gross; });
    const extra = ship + wrap - discount;
    const vat = {};
    for (const r of [19, 7]) { if (!by[r]) continue; const share = sub ? by[r] / sub : 0; const g = by[r] + extra * share; vat[r] = round2(g - g / (1 + r / 100)); }
    return { sub, ship, wrap, discount, gift, total, vat, freeLeft: m === 'dhl' || !m ? Math.max(0, round2(s.freeFrom - sub)) : 0 };
  };

  /* ---------------- accounts (demo: hashed locally) ---------------- */
  async function hash(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('an2|' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; } }
  ST.customers = () => ST.get('customers', []);
  ST.saveCustomers = l => ST.set('customers', l);
  ST.session = () => ST.get('session', null);
  ST.me = function () { const s = ST.session(); if (!s) return null; return ST.customers().find(c => c.id === s.id) || null; };
  ST.register = async function (d) {
    const list = ST.customers(); const email = d.email.trim().toLowerCase();
    if (list.some(c => c.email === email && c.pw)) return { err: 'exists' };
    let c = list.find(c => c.email === email);
    if (!c) { c = { id: ST.uid('c'), created: Date.now(), addresses: [], wishlist: [], designs: [] }; list.push(c); }
    Object.assign(c, { name: d.name.trim(), email, phone: d.phone || '', pw: await hash(d.pw), marketing: !!d.marketing });
    ST.saveCustomers(list); ST.set('session', { id: c.id, at: Date.now() }); ST.log('kunde', `Konto erstellt: ${email}`);
    return { c };
  };
  ST.login = async function (email, pw) {
    email = String(email || '').trim().toLowerCase(); const c = ST.customers().find(c => c.email === email && c.pw);
    if (!c || c.pw !== await hash(pw)) return { err: 'wrong' };
    ST.set('session', { id: c.id, at: Date.now() }); return { c };
  };
  ST.logout = () => ST.set('session', null);
  ST.updateMe = function (patch) { const list = ST.customers(); const s = ST.session(); const c = s && list.find(x => x.id === s.id); if (!c) return; Object.assign(c, patch); ST.saveCustomers(list); };
  ST.deleteMe = function () { const s = ST.session(); if (!s) return; const list = ST.customers(); const c = list.find(x => x.id === s.id); if (!c) return; ST.log('kunde', `Konto gelöscht (DSGVO): ${c.email}`); ST.saveCustomers(list.filter(x => x.id !== s.id)); ST.set('session', null); };
  ST.upsertGuest = function (d) {
    const list = ST.customers(); const email = d.email.trim().toLowerCase();
    let c = list.find(c => c.email === email);
    if (!c) { c = { id: ST.uid('c'), created: Date.now(), name: d.name, email, phone: d.phone, addresses: [], wishlist: [], designs: [], guest: true, marketing: !!d.marketing }; list.push(c); ST.saveCustomers(list); }
    return c;
  };

  /* wishlist / recently viewed work for guests too */
  ST.wishlist = function () { const me = ST.me(); return me ? (me.wishlist || []) : ST.get('wish', []); };
  ST.toggleWish = function (id) {
    const w = ST.wishlist().slice(); const i = w.indexOf(id); if (i >= 0) w.splice(i, 1); else w.unshift(id);
    if (ST.me()) ST.updateMe({ wishlist: w }); else ST.set('wish', w); return i < 0;
  };
  ST.recent = () => ST.get('recent', []);
  ST.pushRecent = function (id) { const r = ST.recent().filter(x => x !== id); r.unshift(id); ST.set('recent', r.slice(0, 12)); };

  /* saved designs (shareable by code) */
  ST.saveDesign = function (pid, D) {
    const list = ST.get('designs', []); const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    list.unshift({ code, pid, D: JSON.parse(JSON.stringify(D)), at: Date.now(), owner: (ST.session() || {}).id || null });
    ST.set('designs', list.slice(0, 60)); return code;
  };
  ST.design = code => ST.get('designs', []).find(d => d.code === code);

  /* ---------------- cart ---------------- */
  ST.cart = () => ST.get('cart', []);
  ST.saveCart = function (c) { ST.set('cart', c); ST.set('cartAt', Date.now()); const me = ST.me(); if (me) ST.updateMe({ cart: c.map(i => ({ pid: i.pid, qty: i.qty })), cartAt: Date.now() }); };
  ST.cartCount = () => ST.cart().reduce((a, i) => a + i.qty, 0);

  /* ---------------- orders ---------------- */
  ST.orders = () => ST.get('orders', []);
  ST.saveOrders = l => ST.set('orders', l);
  ST.order = no => ST.orders().find(o => o.no === no);
  ST.updateOrder = function (no, fn) { const l = ST.orders(); const o = l.find(x => x.no === no); if (!o) return null; fn(o); ST.saveOrders(l); return o; };
  ST.nextNo = function () { const n = ST.get('seqOrder', 10040) + 1; ST.set('seqOrder', n); return 'AN-' + n; };
  ST.nextInvoice = function () { const y = new Date().getFullYear(); const k = 'seqInv' + y; const n = ST.get(k, 0) + 1; ST.set(k, n); return `RE-${y}-${String(n).padStart(4, '0')}`; };
  ST.STATUS = ['neu', 'freigabe', 'produktion', 'bereit', 'unterwegs', 'zugestellt', 'storniert'];
  ST.setStatus = function (no, st, by, note) {
    const o = ST.updateOrder(no, o => { o.status = st; o.history.push({ st, at: Date.now(), by: by || 'system', note: note || '' }); });
    if (!o) return null;
    ST.log('auftrag', `${no}: Status → ${st}${note ? ' (' + note + ')' : ''}`, by);
    const tpl = { produktion: 'production', bereit: o.ship.method === 'pickup' ? 'ready_pickup' : (o.ship.method === 'local' ? 'ready_local' : 'ready_ship'), unterwegs: 'shipped', zugestellt: 'delivered', storniert: 'cancelled' }[st];
    if (tpl) ST.sendMail(tpl, o);
    return o;
  };

  ST.placeOrder = function (d) {
    const s = ST.settings();
    const items = ST.cart().map(i => Object.assign({}, i));
    if (!items.length) return { err: 'empty' };
    const t = ST.totals(items, { method: d.method, wrap: d.wrap, wrapQty: 1, coupon: d.coupon, giftcard: d.giftcard });
    const cust = ST.me() || ST.upsertGuest({ name: d.name, email: d.email, phone: d.phone, marketing: d.marketing });
    const no = ST.nextNo();
    const prodDays = ST.prodDaysOf(items);
    const date = d.date || ST.iso(ST.deliveryDate(d.method, prodDays));
    const needsApproval = !!d.approval && items.some(i => { const p = ST.product(i.pid); return p && !ENG.isDefault(p, i.D); });
    const o = {
      no, created: Date.now(), status: 'neu', history: [{ st: 'neu', at: Date.now(), by: 'kunde', note: '' }],
      cust: { id: cust.id, name: d.name, email: d.email.trim().toLowerCase(), phone: d.phone },
      bill: d.bill, ship: { method: d.method, addr: d.method === 'pickup' ? null : d.addr, date, window: d.window || '', recipient: d.recipient || '' },
      gift: { wrap: !!d.wrap, card: d.card || '', hidePrices: !!d.hidePrices, isGift: !!d.isGift },
      items: items.map(i => ({ ...i, approval: needsApproval && !ENG.isDefault(ST.product(i.pid), i.D) ? { status: 'offen', token: ST.uid('a'), comments: [] } : null })),
      totals: t, coupon: t.discount ? String(d.coupon).toUpperCase() : '', giftcard: t.gift ? String(d.giftcard).toUpperCase() : '',
      pay: { method: d.pay, status: ['vorkasse', 'cash'].includes(d.pay) ? 'offen' : 'bezahlt', at: ['vorkasse', 'cash'].includes(d.pay) ? null : Date.now() },
      note: d.note || '', lang: d.lang || 'de', approval: needsApproval, tracking: null, invoice: ST.nextInvoice(), notes: [], complaints: [],
      cancelUntil: Date.now() + s.cancelMinutes * 60000, prodDays
    };
    const list = ST.orders(); list.unshift(o); ST.saveOrders(list);
    // stock, coupon use, gift card balance
    for (const i of items) { const p = ST.product(i.pid); if (p) ST.saveOverride(p.id, { stock: Math.max(0, (p.stock == null ? 25 : p.stock) - i.qty) }); }
    if (t.discount) { const cs = ST.coupons(); const c = cs.find(x => x.code.toUpperCase() === o.coupon); if (c) { c.uses = (c.uses || 0) + 1; ST.saveCoupons(cs); } }
    if (t.gift) { const gs = ST.giftcards(); const g = gs.find(x => x.code === o.giftcard); if (g) { g.balance = round2(g.balance - t.gift); g.log = (g.log || []).concat([{ at: Date.now(), amount: -t.gift, order: no }]); ST.saveGiftcards(gs); } }
    // gift cards bought as items are issued after payment
    if (o.pay.status === 'bezahlt') ST.issueGiftcardsFor(o);
    ST.saveCart([]);
    if (ST.me()) { const me = ST.me(); const addrs = me.addresses || []; if (d.saveAddr && d.addr && !addrs.some(a => a.street === d.addr.street && a.zip === d.addr.zip)) { addrs.push(d.addr); ST.updateMe({ addresses: addrs }); } }
    ST.log('auftrag', `Neue Bestellung ${no} · ${fmtEur(t.total)}`, 'kunde');
    ST.sendMail('confirm', o);
    ST.sendMail('owner_new', o);
    ST.set('lastOrderPing', { no, at: Date.now() });
    return { o };
  };
  ST.issueGiftcardsFor = function (o) {
    const gs = ST.giftcards(); let changed = false;
    o.items.forEach((it, idx) => {
      if (it.pid !== 'gutschein' || it.issued) return;
      for (let k = 0; k < it.qty; k++) {
        const code = ST.newGiftcardCode(); const amt = it.unit;
        gs.push({ code, value: amt, balance: amt, created: Date.now(), order: o.no, to: it.D.f.to || '', toEmail: it.D.f.toEmail || '', msg: it.D.f.msg || '', from: it.D.f.from || o.cust.name, log: [] });
        ST.sendMail('giftcard', o, { code, amount: amt, to: it.D.f.to, toEmail: it.D.f.toEmail || o.cust.email, msg: it.D.f.msg, from: it.D.f.from || o.cust.name });
      }
      it.issued = true; changed = true;
    });
    if (changed) { ST.saveGiftcards(gs); ST.updateOrder(o.no, x => { x.items = o.items; }); }
  };
  ST.cancelOrder = function (no, by, reason) {
    const o = ST.order(no); if (!o || o.status === 'storniert') return null;
    for (const i of o.items) { const p = ST.product(i.pid); if (p) ST.saveOverride(p.id, { stock: (p.stock || 0) + i.qty }); }
    if (o.giftcard && o.totals.gift) { const gs = ST.giftcards(); const g = gs.find(x => x.code === o.giftcard); if (g) { g.balance = round2(g.balance + o.totals.gift); ST.saveGiftcards(gs); } }
    ST.updateOrder(no, x => { if (x.pay.status === 'bezahlt') x.pay.status = 'erstattet'; });
    return ST.setStatus(no, 'storniert', by, reason || '');
  };

  /* ---------------- reviews, questions, complaints ---------------- */
  ST.reviews = pid => ST.get('reviews', []).filter(r => (!pid || r.pid === pid));
  ST.addReview = function (r) { const l = ST.get('reviews', []); l.unshift(Object.assign({ id: ST.uid('r'), at: Date.now(), ok: false }, r)); ST.set('reviews', l); ST.log('bewertung', `Neue Bewertung für ${r.pid} (${r.stars}★)`); };
  ST.setReviews = l => ST.set('reviews', l);
  ST.questions = pid => ST.get('questions', []).filter(q => (!pid || q.pid === pid));
  ST.addQuestion = function (q) { const l = ST.get('questions', []); l.unshift(Object.assign({ id: ST.uid('q'), at: Date.now(), answer: '' }, q)); ST.set('questions', l); ST.log('frage', `Neue Frage zu ${q.pid}`); };
  ST.setQuestions = l => ST.set('questions', l);

  /* ---------------- activity log ---------------- */
  ST.log = function (kind, text, by) { const l = ST.get('activity', []); l.unshift({ at: Date.now(), kind, text, by: by || (ST.get('adminSession', null) || {}).user || 'system' }); ST.set('activity', l.slice(0, 400)); };

  /* ---------------- emails ---------------- */
  ST.emails = () => ST.get('emails', []);
  ST.sendMail = function (tpl, o, extra) {
    const s = ST.settings();
    const to = tpl === 'owner_new' ? s.shop.email : (extra && extra.toEmail) || (o && o.cust.email);
    const m = { id: ST.uid('m'), tpl, to, at: Date.now(), no: o ? o.no : '', lang: tpl === 'owner_new' ? 'de' : ((o && o.lang) || 'de'), extra: extra || null, read: false };
    const l = ST.emails(); l.unshift(m); ST.set('emails', l.slice(0, 300));
    if (ST.onMail) ST.onMail(m);
    return m;
  };

  /* ---------------- misc ---------------- */
  function fmtEur(n) { return Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }); }
  ST.fmtEur = fmtEur;

  /* ---------------- example data for the owner demo ---------------- */
  ST.seed = function () {
    if (ST.get('seeded', false)) return;
    const mk = (pid, f, extra) => { const p = ST.product(pid); const D = ENG.blankDesign(p); Object.assign(D.f, f || {}); return Object.assign({ id: ST.uid('i'), pid, D, qty: 1, unit: ST.unitPrice(p, D), tax: p.tax || 19, name: p.name, preview: p.views[0].thumb }, extra || {}); };
    const now = Date.now(), H = 3600e3;
    const ex = [
      { st: 'neu', ago: .4, m: 'dhl', name: 'Beispiel: Lena Hoffmann', email: 'lena@example.com', items: [mk('rosenbox-herz', { name: 'Lena' }), mk('kette-datum', { text: '14.02.2024' })], pay: 'paypal' },
      { st: 'produktion', ago: 20, m: 'pickup', name: 'Beispiel: Yusuf Demir', email: 'yusuf@example.com', items: [mk('uhrenbox', { name: 'YUSUF' })], pay: 'cash' },
      { st: 'bereit', ago: 30, m: 'local', name: 'Beispiel: Mariam Haddad', email: 'mariam@example.com', items: [mk('rosenbox-rund', { name: 'Mariam' })], pay: 'card', win: '14:00–18:00' }
    ];
    const list = [];
    ex.forEach((e, k) => {
      const t = ST.totals(e.items, { method: e.m });
      const created = now - e.ago * H;
      const hist = [{ st: 'neu', at: created, by: 'kunde' }]; if (e.st !== 'neu') hist.push({ st: 'produktion', at: created + 2 * H, by: 'inhaber' }); if (e.st === 'bereit') hist.push({ st: 'bereit', at: created + 20 * H, by: 'inhaber' });
      list.push({ no: 'AN-1003' + (8 - k), example: true, created, status: e.st, history: hist, cust: { id: 'demo' + k, name: e.name, email: e.email, phone: '+49 151 0000000' + k },
        bill: { name: e.name, street: 'Musterstraße ' + (k + 3), zip: '20099', city: 'Hamburg', country: 'DE' },
        ship: { method: e.m, addr: e.m === 'pickup' ? null : { name: e.name, street: 'Musterstraße ' + (k + 3), zip: '20099', city: 'Hamburg', country: 'DE' }, date: ST.iso(ST.deliveryDate(e.m, 1, new Date(created))), window: e.win || '', recipient: '' },
        gift: { wrap: k === 0, card: k === 0 ? 'Alles Liebe zum Jahrestag!' : '', hidePrices: k === 0, isGift: k === 0 },
        items: e.items.map(i => ({ ...i, approval: null })), totals: t, coupon: '', giftcard: '', pay: { method: e.pay, status: e.pay === 'cash' ? 'offen' : 'bezahlt', at: created },
        note: '', lang: 'de', approval: false, tracking: null, invoice: 'RE-2026-B00' + (k + 1), notes: [], complaints: [], cancelUntil: created + 3600e3, prodDays: 1 });
    });
    ST.saveOrders(list.concat(ST.orders().filter(o => !o.example)));
    ST.set('seeded', true);
  };
  ST.resetDemo = function () {
    try { Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    for (const k in mem) delete mem[k];
    ST.invalidate();
  };
})();
