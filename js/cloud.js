/* Server connection (Supabase). Everything that must be shared – orders, photos, products, settings,
   accounts, reviews – goes through the server functions in server/schema.sql.
   The browser keeps only the cart, wishlist, language and the visitor's own orders.
   Without a configured server (js/config.js) the shop keeps its old local behaviour (development only). */
(function () {
  'use strict';
  const CFG = window.SHOP_CONFIG || {};
  const ON = !!(CFG.url && CFG.key);
  const CL = { on: ON, ready: false, mail: false };
  window.CLOUD = CL;
  const isAdminPage = /admin\.html$/.test(location.pathname);
  const AR = () => ST.get('adminLang', 'ar') === 'ar';
  const W = (de, ar) => (AR() ? ar : de);

  /* ---------------- transport ---------------- */
  async function rpc(fn, args) {
    const h = { 'Content-Type': 'application/json', apikey: CFG.key };
    if (/^eyJ/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
    let r;
    try { r = await fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args || {}), cache: 'no-store' }); }
    catch (e) { const er = new Error('offline'); er.code = 'offline'; throw er; }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
    if (!r.ok) { const code = (j && j.message) || ('http_' + r.status); const er = new Error(code); er.code = code; throw er; }
    if (j && typeof j === 'object' && j.error_code) { const er = new Error(j.error_code); er.code = j.error_code; throw er; }
    return j;
  }
  CL.rpc = rpc;
  const MSG = {
    offline: ['Keine Verbindung zum Server. Bitte Internet prüfen und erneut versuchen.', 'No connection to the server. Please check your internet and try again.', 'لا يوجد اتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.'],
    rate_limited: ['Zu viele Versuche. Bitte warte ein paar Minuten.', 'Too many attempts. Please wait a few minutes.', 'محاولات كثيرة. انتظر بضع دقائق من فضلك.'],
    price_changed: ['Preise haben sich geändert. Bitte prüfe deinen Warenkorb.', 'Prices have changed. Please check your bag.', 'تغيّرت الأسعار. راجع سلتك من فضلك.'],
    product_unavailable: ['Ein Artikel ist nicht mehr verfügbar. Bitte prüfe deinen Warenkorb.', 'An item is no longer available. Please check your bag.', 'أحد المنتجات لم يعد متوفراً. راجع سلتك من فضلك.'],
    shop_not_ready: ['Der Shop wird gerade eingerichtet. Bitte versuche es später oder ruf uns an.', 'The shop is being set up. Please try later or call us.', 'المتجر قيد التجهيز. حاول لاحقاً أو اتصل بنا.'],
    date: ['Bitte wähle ein gültiges Lieferdatum.', 'Please choose a valid delivery date.', 'اختر موعد تسليم صحيح من فضلك.'],
    giftcard: ['Das Gutscheinguthaben reicht nicht mehr. Bitte erneut prüfen.', 'The gift card balance is no longer enough.', 'رصيد بطاقة الهدية لم يعد كافياً.'],
    auth: ['Bitte melde dich erneut an.', 'Please sign in again.', 'سجّل الدخول مرة أخرى من فضلك.'],
    generic: ['Das hat nicht geklappt. Bitte versuche es erneut.', 'That did not work. Please try again.', 'لم تنجح العملية. حاول مرة أخرى.']
  };
  function texts() {
    const I = window.I18N; if (!I) return; const K = (k, de, en, ar) => { I.de[k] = de; I.en[k] = en; I.ar[k] = ar; };
    K('pw_forgot', 'Passwort vergessen?', 'Forgot your password?', 'نسيت كلمة السر؟');
    K('pw_forgot_p', 'Gib deine E-Mail-Adresse ein. Wenn es ein Konto dazu gibt, schicken wir dir einen Link zum Zurücksetzen.', 'Enter your e-mail address. If there is an account, we will send you a reset link.', 'اكتب بريدك الإلكتروني. إذا كان هناك حساب، سنرسل لك رابطاً لإعادة التعيين.');
    K('pw_send', 'Link senden', 'Send link', 'إرسال الرابط');
    K('pw_sent', 'Falls ein Konto existiert, ist der Link unterwegs. Bitte schau auch im Spam-Ordner nach.', 'If an account exists, the link is on its way. Please also check your spam folder.', 'إذا كان هناك حساب، فالرابط في الطريق. تحقق أيضاً من مجلد الرسائل غير المرغوبة.');
    K('pw_nomail', 'Bitte ruf uns kurz an, wir helfen dir sofort weiter:', 'Please give us a quick call and we will help you right away:', 'اتصل بنا من فضلك وسنساعدك فوراً:');
    K('pw_new_h', 'Neues Passwort', 'New password', 'كلمة سر جديدة');
    K('pw_new_p', 'Mindestens 8 Zeichen.', 'At least 8 characters.', '8 أحرف على الأقل.');
    K('pw_done', 'Passwort geändert – du bist angemeldet.', 'Password changed – you are signed in.', 'تم تغيير كلمة السر – أنت مسجّل الدخول.');
    K('pw_expired', 'Der Link ist abgelaufen. Bitte fordere einen neuen an.', 'The link has expired. Please request a new one.', 'انتهت صلاحية الرابط. اطلب رابطاً جديداً.');
    K('pw_short', 'Das Passwort braucht mindestens 8 Zeichen.', 'The password needs at least 8 characters.', 'كلمة السر تحتاج 8 أحرف على الأقل.');
    K('pp_hint', 'Deine Bestellung ist gespeichert. Bezahle jetzt sicher über PayPal – die Bestätigung prüfen wir direkt bei PayPal.', 'Your order is saved. Pay securely with PayPal now – we confirm the payment directly with PayPal.', 'تم حفظ طلبك. ادفع الآن بأمان عبر PayPal – نتحقق من الدفع مباشرة لدى PayPal.');
    K('pp_later', 'Später bezahlen', 'Pay later', 'الدفع لاحقاً');
    K('pp_pay_now', 'Jetzt bezahlen', 'Pay now', 'ادفع الآن');
    K('pp_paid', 'Danke! Zahlung bestätigt.', 'Thank you! Payment confirmed.', 'شكراً! تم تأكيد الدفع.');
    K('pp_pending', 'PayPal prüft die Zahlung noch. Wir melden uns, sobald sie bestätigt ist.', 'PayPal is still reviewing the payment. We will let you know once it is confirmed.', 'لا تزال PayPal تراجع الدفع. سنبلغك عند التأكيد.');
    K('pp_check', 'Die Zahlung passt nicht zur Bestellung. Bitte kontaktiere uns.', 'The payment does not match the order. Please contact us.', 'الدفع لا يطابق الطلب. يرجى التواصل معنا.');
    K('pp_failed', 'Die Zahlung hat nicht geklappt. Du kannst es erneut versuchen oder später über „Bestellung verfolgen“ bezahlen.', 'The payment did not work. You can try again or pay later via “Track order”.', 'لم ينجح الدفع. يمكنك المحاولة مجدداً أو الدفع لاحقاً من „تتبّع الطلب“.');
    K('pp_open', 'Zahlung offen', 'Payment open', 'الدفع مفتوح');
  }
  CL.msg = function (code) { const l = { de: 0, en: 1, ar: 2 }[isAdminPage ? (AR() ? 'ar' : 'de') : (C.lang ? C.lang() : 'de')] || 0; return (MSG[code] || MSG.generic)[l]; };
  CL.fail = e => { try { C.toast(CL.msg(e && e.code), 'err'); } catch (x) { } };

  if (!ON) { CL.boot = () => Promise.resolve(); return; }

  /* ---------------- what is stored where ---------------- */
  // shared data, kept only in memory (never in this browser's localStorage)
  const MEM = new Set(['orders', 'customers', 'giftcards', 'coupons', 'emails', 'activity', 'reviews', 'questions', 'settings', 'prodOv', 'customProducts', 'catCfg', 'site', 'seqOrder', 'seeded']);
  ST.memOnly = k => MEM.has(k) || /^seqInv/.test(k);
  // shop data saved by the old version (before the server) is NEVER deleted: it is moved to a backup
  // ("an2bak:") so the owner can take it over to the server from the admin (see CL.oldData / importOld)
  const BAK = 'an2bak:';
  try {
    Object.keys(localStorage).filter(k => k.startsWith('an2:') && ST.memOnly(k.slice(4))).forEach(k => {
      try { const b = BAK + k.slice(4); if (localStorage.getItem(b) === null) localStorage.setItem(b, localStorage.getItem(k)); localStorage.removeItem(k); } catch (e) { /* full storage: keep the original */ }
    });
  } catch (e) { }
  MEM.forEach(k => ST.forget(k));
  const KV = ['settings', 'prodOv', 'customProducts', 'catCfg', 'site', 'coupons'];
  const LISTS = { orders: ['order', o => o.no], reviews: ['review', r => r.id], questions: ['question', q => q.id], giftcards: ['giftcard', g => g.code], emails: ['email', m => m.id], customers: ['customer', c => c.id] };
  const NO_DELETE = new Set(['emails']);

  let applying = false;              // true while server data is copied in (no push back)
  const quiet = fn => { applying = true; try { fn(); } finally { applying = false; } };
  const admin = () => { const a = ST.get('adminSession', null); return a && a.token && (!a.at || Date.now() - a.at < 12 * 3600e3) ? a : null; };
  const custTok = () => { const s = ST.get('session', null); return s && s.token ? s.token : null; };
  CL.admin = admin;

  /* ---------------- photos ---------------- */
  const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = rej; fr.readAsDataURL(blob); });
  const unb64 = (s, mime) => { const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); };
  ST.remotePhoto = async function (id) {
    try {
      const a = admin(); const r = a ? await rpc('shop_admin_photo_get', { p_token: a.token, p_id: id }) : await rpc('shop_photo_get', { p_id: id });
      return r && r.data ? unb64(r.data, r.mime) : null;
    } catch (e) { return null; }
  };
  const sent = new Set((() => { try { return JSON.parse(localStorage.getItem('an2:phUp') || '[]'); } catch (e) { return []; } })());
  const remember = id => { sent.add(id); try { localStorage.setItem('an2:phUp', JSON.stringify(Array.from(sent).slice(-400))); } catch (e) { } };
  /** upload every local photo referenced in obj; asAdmin = public product/website images */
  CL.uploadPhotos = async function (obj, asAdmin) {
    const ids = Array.from(new Set((JSON.stringify(obj || {}).match(/idb:[A-Za-z0-9_-]+/g) || [])));
    for (const id of ids) {
      if (sent.has(id + (asAdmin ? '#pub' : ''))) continue;
      const blob = await ST.photoLocal(id); if (!blob) continue; // already on the server or gone
      const mime = /png|webp/.test(blob.type) ? blob.type : 'image/jpeg';
      const data = await b64(blob);
      if (asAdmin) { const a = admin(); if (!a) continue; await rpc('shop_admin_photo_put', { p_token: a.token, p_id: id, p_mime: mime, p_data: data }); remember(id + '#pub'); }
      else { await rpc('shop_photo_put', { p_id: id, p_mime: mime, p_data: data }); remember(id); }
    }
  };

  /* ---------------- public start-up ---------------- */
  function applyPublic(b) {
    quiet(() => {
      const s = b.settings || {};
      // payment methods that really work: bank transfer, cash on pickup, and PayPal/card only with a PayPal client ID
      if (s.payments) { const hasPP = !!((s.paypal || {}).clientId); s.payments.paypal = !!s.payments.paypal && hasPP; s.payments.card = !!s.payments.card && hasPP; s.payments.klarna = false; s.payments.applepay = false; }
      ST.set('settings', s);
      ST.set('prodOv', b.prodOv || {}); ST.set('customProducts', b.customProducts || []);
      if (b.catCfg) ST.set('catCfg', b.catCfg); if (b.site) ST.set('site', b.site);
      ST.set('reviews', b.reviews || []); ST.set('questions', b.questions || []);
      // keep codes this visitor already checked (they are re-checked by the server at checkout anyway)
      const promo = b.promo || []; const had = ST.get('coupons', []) || [];
      ST.set('coupons', promo.concat(had.filter(c => !promo.some(x => x.code === c.code))));
      if (!ST.get('giftcards', null)) ST.set('giftcards', []);
      ST.set('emails', []); ST.set('activity', []); ST.set('customers', []);
      ST.set('seeded', true);
    });
    ST.invalidate();
    if (window.SITE && SITE.apply) SITE.apply();
    CL.ready = !!b.ready;
  }
  /* the visitor's own orders survive a reload */
  const MY = 'an2:myOrders';
  // guests: keep their own orders on this device for 48 h only (shared computers); accounts load them from the server
  const loadMine = () => { try { const l = JSON.parse(localStorage.getItem(MY) || '[]'); const keep = custTok() ? l : l.filter(o => Date.now() - (o.created || 0) < 48 * 3600e3); if (keep.length !== l.length) localStorage.setItem(MY, JSON.stringify(keep)); return keep; } catch (e) { return []; } };
  const saveMine = list => { try { localStorage.setItem(MY, JSON.stringify(list.slice(0, 30))); } catch (e) { } };
  CL.keepOrder = function (o) {
    if (!o || !o.no) return;
    const list = ST.orders().filter(x => x.no !== o.no); list.unshift(o); list.sort((a, b) => b.created - a.created);
    quiet(() => ST.set('orders', list));
    if (!admin()) saveMine(list);
  };

  CL.boot = async function () {
    showLoading(true);
    try {
      const b = await rpc('shop_boot');
      applyPublic(b);
      if (!admin()) quiet(() => ST.set('orders', loadMine()));
      if (!isAdminPage) CL.repriceCart();
      if (custTok()) await CL.refreshMe().catch(() => { });
      if (isAdminPage && admin()) await CL.adminStart().catch(e => { if (e.code === 'auth') quiet(() => ST.set('adminSession', null)); });
    } catch (e) {
      CL.bootError = e.code || 'offline';
      applyPublic({ settings: {}, prodOv: {}, customProducts: [], reviews: [], questions: [], promo: [] });
    }
    showLoading(false);
  };
  function showLoading(on) {
    let el = document.getElementById('bootLoad');
    if (on && !el) { document.body.insertAdjacentHTML('afterbegin', '<div id="bootLoad" class="boot-load" role="status" aria-live="polite"><span class="spin"></span></div>'); }
    if (!on && el) el.remove();
  }

  /* ---------------- customer accounts ---------------- */
  CL.refreshMe = async function () {
    const tok = custTok(); if (!tok) return null;
    try {
      const r = await rpc('shop_cust_me', { p_token: tok });
      quiet(() => ST.set('me', r.me));
      (r.orders || []).forEach(o => CL.keepOrder(o));
      return r.me;
    } catch (e) { if (e.code === 'auth') { quiet(() => { ST.set('session', null); ST.set('me', null); }); } throw e; }
  };
  ST.me = () => (custTok() ? ST.get('me', null) : null);
  ST.customers = () => (admin() ? ST.get('customers', []) : []);
  ST.register = async function (d) {
    try {
      const r = await rpc('shop_cust_register', { p_name: d.name, p_email: d.email, p_phone: d.phone || '', p_pw: d.pw, p_marketing: !!d.marketing });
      quiet(() => { ST.set('session', { token: r.token, at: Date.now() }); ST.set('me', r.me); });
      return { c: r.me };
    } catch (e) { if (e.code === 'exists') return { err: 'exists' }; if (e.code === 'pw_short') return { err: 'pw' }; CL.fail(e); return { err: 'fail' }; }
  };
  ST.login = async function (email, pw) {
    try {
      const r = await rpc('shop_cust_login', { p_email: email, p_pw: pw });
      quiet(() => { ST.set('session', { token: r.token, at: Date.now() }); ST.set('me', r.me); });
      CL.refreshMe().catch(() => { });
      return { c: r.me };
    } catch (e) { if (e.code !== 'wrong') CL.fail(e); return { err: 'wrong' }; }
  };
  ST.logout = function () {
    const tok = custTok(); if (tok) rpc('shop_cust_logout', { p_token: tok }).catch(() => { });
    quiet(() => { ST.set('session', null); ST.set('me', null); ST.set('orders', []); });
    saveMine([]);
  };
  let meTimer = null, mePatch = {};
  ST.updateMe = function (patch) {
    const me = ST.get('me', null); if (!me || !custTok()) return;
    quiet(() => ST.set('me', Object.assign({}, me, patch)));
    Object.assign(mePatch, patch); clearTimeout(meTimer);
    meTimer = setTimeout(() => { const p = mePatch; mePatch = {}; rpc('shop_cust_update', { p_token: custTok(), p_patch: p }).catch(e => { if (e.code !== 'rate_limited') CL.fail(e); }); }, 600);
  };
  ST.deleteMe = async function () {
    const tok = custTok(); if (!tok) return false;
    try { await rpc('shop_cust_delete', { p_token: tok, p_pw: null }); } catch (e) { CL.fail(e); return false; }
    quiet(() => { ST.set('session', null); ST.set('me', null); ST.set('orders', []); }); saveMine([]);
    return true;
  };
  ST.upsertGuest = d => ({ id: null, name: d.name, email: String(d.email || '').trim().toLowerCase(), phone: d.phone });

  /* ---------------- shop actions ---------------- */
  ST.addReview = function (r) { rpc('shop_review_add', { p_pid: r.pid, p_stars: r.stars, p_name: r.name, p_text: r.text }).catch(CL.fail); };
  ST.addQuestion = function (q) { rpc('shop_question_add', { p_pid: q.pid, p_text: q.text, p_email: q.email || '', p_lang: q.lang || 'de' }).catch(CL.fail); };
  const _log = ST.log;
  ST.log = function (kind, text, by) {
    const a = admin(); if (!a) return; // customer-side events are logged by the server
    const id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const e = { id, at: Date.now(), kind, text: String(text).slice(0, 300), by: by || a.user };
    quiet(() => ST.set('activity', [e].concat(ST.get('activity', [])).slice(0, 400)));
    queue.items.set('activity|' + id, { kind: 'activity', id, data: e }); flushSoon();
  };
  void _log;
  const _send = ST.sendMail;
  ST.sendMail = function (tpl, o, extra) {
    if (!admin()) return null; // order confirmation e-mails are sent by the server
    const m = _send.apply(this, arguments);
    if (CL.mail && m && tpl !== 'owner_new' && o && o.no) {
      try { const x = DOCS.mail(m); rpc('shop_admin_mail', { p_token: admin().token, p_no: o.no, p_to: m.to, p_subject: x.subject, p_html: x.html, p_kind: tpl }).catch(e => C.toast(W('E-Mail nicht gesendet: ', 'ما انبعت الإيميل: ') + CL.msg(e.code), 'err')); } catch (e) { }
    }
    return m;
  };

  /* order: check on the server first (price, stock, date), then payment, then save */
  CL.orderPayload = function (d) {
    const items = ST.cart().map(i => { const p = ST.product(i.pid); return Object.assign({}, i, { needsApproval: !!d.approval && !!p && !ENG.isDefault(p, i.D) }); });
    const prodDays = ST.prodDaysOf(items);
    const date = d.date || ST.iso(ST.deliveryDate(d.method, prodDays));
    const tt = ST.totals(items, { method: d.method, wrap: d.wrap, wrapQty: 1, coupon: d.coupon, giftcard: d.giftcard });
    return Object.assign({}, d, { items, date, prodDays, expectTotal: tt.total });
  };
  CL.checkOrder = async function (d) {
    const p = CL.orderPayload(d); p.dryRun = true;
    try { await rpc('shop_order_place', { p: Object.assign({}, p, { items: p.items.map(i => Object.assign({}, i, { preview: '' })) }), p_cust_token: custTok() || null, p_dry: true }); return { ok: true }; }
    catch (e) { return { err: e.code }; }
  };
  ST.placeOrder = async function (d) {
    if (!ST.cart().length) return { err: 'empty' };
    const p = CL.orderPayload(d);
    try {
      await CL.uploadPhotos(p.items, false);
      const o = await rpc('shop_order_place', { p, p_cust_token: custTok() || null, p_dry: false });
      CL.keepOrder(o);
      ST.saveCart([]);
      const me = ST.me(); if (me && d.saveAddr && d.addr) { const addrs = me.addresses || []; if (!addrs.some(a => a.street === d.addr.street && a.zip === d.addr.zip)) ST.updateMe({ addresses: addrs.concat([d.addr]) }); }
      return { o };
    } catch (e) { return { err: e.code || 'fail' }; }
  };
  /* bring the bag to today's prices (after the owner changed a price or removed a product) */
  CL.repriceCart = function () {
    const cart = ST.cart(); if (!cart.length) return false;
    let changed = false; const keep = [];
    const tb = window.BOX && BOX._tables ? BOX._tables() : null;
    for (const i of cart) {
      let u = i.unit;
      if (i.pid === 'gutschein') { keep.push(i); continue; }
      if (i.pid === 'geschenkbox') { const b = (i.D && i.D.box) || {}; if (tb && tb.boxes[b.box] != null) u = ST.round2(tb.boxes[b.box] + (tb.sizes[b.size] || 0) + (tb.fills[b.fill] || 0) + Object.entries(b.extras || {}).reduce((a, [k, n]) => a + (tb.extras[k] || 0) * n, 0)); }
      else { const p = ST.product(i.pid); if (!p || p.active === false || p.deleted) { changed = true; continue; } u = ST.unitPrice(p, i.D); }
      if (Math.abs(u - i.unit) > 0.004) { changed = true; i.unit = u; }
      keep.push(i);
    }
    if (changed) { quiet(() => ST.saveCart(keep)); }
    return changed;
  };
  CL.refreshPublic = async function () { try { applyPublic(await rpc('shop_boot')); } catch (e) { } return CL.repriceCart(); };
  /* ---------------- PayPal: verified on the server (Supabase Edge Functions) ---------------- */
  const fnUrl = name => CFG.url.replace(/\/+$/, '') + '/functions/v1/' + name;
  async function fn(name, body) {
    let r; try { r = await fetch(fnUrl(name), { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key }, body: JSON.stringify(body) }); }
    catch (e) { const er = new Error('offline'); er.code = 'offline'; throw er; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) { const er = new Error(j.error || 'http_' + r.status); er.code = j.error || 'http_' + r.status; er.data = j; throw er; }
    return j;
  }
  /* DHL label: the admin session is checked on the server, DHL keys never reach the browser */
  CL.dhlLabel = async function (no, kg) {
    const a = admin(); if (!a) { const er = new Error('auth'); er.code = 'auth'; throw er; }
    return fn('dhl-label', { token: a.token, no, kg });
  };
  let ppLoad = null;
  function loadPayPal(id) {
    if (window.paypal && window.paypal.Buttons) return Promise.resolve(window.paypal);
    if (ppLoad) return ppLoad;
    ppLoad = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(id) + '&currency=EUR&intent=capture&enable-funding=card'; sc.onload = () => res(window.paypal); sc.onerror = () => { ppLoad = null; rej(new Error('pp')); }; document.head.appendChild(sc); });
    return ppLoad;
  }
  CL.payable = o => !!o && ['paypal', 'card'].includes(o.pay.method) && !['bezahlt', 'erstattet'].includes(o.pay.status) && o.status !== 'storniert';
  /** opens PayPal for an already saved order; amount and result are checked on the server */
  CL.payPayPal = function (o) {
    const id = String((ST.settings().paypal || {}).clientId || '').trim();
    if (!id || !CL.payable(o)) return;
    const ov = C.sheet({ title: t('pay_' + o.pay.method), kind: 'modal' });
    ov.body.innerHTML = `<div class="paydemo"><p class="paysum">${eur(o.totals.total)}</p><p class="muted">${esc(t('pp_hint'))}</p><div id="ppBtns"><span class="spin"></span></div><p class="warn" id="ppErr" hidden></p></div>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">${t('pp_later')}</button>`;
    const err = m => { const e = $('#ppErr', ov); if (e) { e.hidden = false; e.textContent = m; } };
    loadPayPal(id).then(pp => {
      const box = $('#ppBtns', ov); if (!box) return; box.innerHTML = '';
      pp.Buttons({
        fundingSource: o.pay.method === 'card' && pp.FUNDING ? pp.FUNDING.CARD : undefined,
        createOrder: () => fn('paypal-create-order', { no: o.no, email: o.cust.email }).then(r => r.id),
        onApprove: d => fn('paypal-capture-order', { no: o.no, email: o.cust.email, orderID: d.orderID }).then(async () => {
          await CL.fetchOrder(o.no, o.cust.email); C.closeAll(); C.toast(t('pp_paid')); C.dispatch({ keepScroll: true });
        }).catch(e => err(e.code === 'amount_mismatch' || e.code === 'order_mismatch' ? t('pp_check') : e.code === 'not_completed' ? t('pp_pending') : t('pp_failed'))),
        onError: () => err(t('pp_failed'))
      }).render(box);
    }).catch(() => err(t('pp_failed')));
  };
  CL.fetchOrder = async function (no, email) {
    const o = await rpc('shop_order_get', { p_no: no, p_email: email }).catch(() => null);
    if (o) CL.keepOrder(o); return o;
  };

  /* coupon / gift card: ask the server, then let the normal checkout logic run */
  window.addEventListener('click', async e => {
    const el = e.target.closest && e.target.closest('[data-act="cpn"],[data-act="gcd"],[data-act="gc-check"]'); if (!el || admin() && isAdminPage) return;
    if (el.dataset.srv === '1') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const act = el.dataset.act;
    try {
      if (act === 'cpn') {
        const code = ($('#cpn') || {}).value || ''; const sub = ST.totals(ST.cart()).sub;
        const r = await rpc('shop_coupon_check', { p_code: code, p_sub: sub });
        const list = ST.coupons().filter(c => c.code.toUpperCase() !== String(code).trim().toUpperCase());
        if (r.c) list.push(r.c);
        else if (r.err === 'min') list.push({ code: String(code).trim().toUpperCase(), type: 'eur', value: 0, min: r.min, on: true });
        else if (r.err === 'expired') list.push({ code: String(code).trim().toUpperCase(), type: 'eur', value: 0, until: '2000-01-01', on: true });
        else if (r.err === 'used') list.push({ code: String(code).trim().toUpperCase(), type: 'eur', value: 0, max: 1, uses: 1, on: true });
        quiet(() => ST.set('coupons', list));
      } else {
        const code = (($('#gcd') || $('#gcCode')) || {}).value || '';
        const r = await rpc('shop_giftcard_check', { p_code: code });
        const list = ST.giftcards().filter(g => g.code !== String(code).trim().toUpperCase());
        if (r.g) list.push({ code: r.g.code, balance: r.g.balance, value: r.g.balance });
        else if (r.err === 'empty') list.push({ code: String(code).trim().toUpperCase(), balance: 0, value: 0 });
        quiet(() => ST.set('giftcards', list));
      }
    } catch (er) { CL.fail(er); return; }
    el.dataset.srv = '1'; el.click(); delete el.dataset.srv;
  }, true);

  /* ---------------- owner area: login, sync, live orders ---------------- */
  const queue = { kv: new Map(), items: new Map() };
  const snap = {};                       // key → Map(id → json) as last seen on the server
  let flushT = null, pollT = null, lastPull = 0, flushing = false;
  function snapshot(key, list) { const [, idOf] = LISTS[key]; snap[key] = new Map((list || []).map(x => [String(idOf(x)), JSON.stringify(x)])); }

  ST.afterSet = function (k, v) {
    if (applying || !ON) return;
    const a = admin(); if (!a) return;
    if (KV.includes(k)) { if (a.role === 'owner') { queue.kv.set(k, v); if (['prodOv', 'customProducts', 'catCfg', 'site'].includes(k)) priceSoon(); flushSoon(); } return; }
    if (LISTS[k] && snap[k]) {
      const [kind, idOf] = LISTS[k]; const now = new Map();
      for (const x of (v || [])) { const id = String(idOf(x)); const j = JSON.stringify(x); now.set(id, j); if (snap[k].get(id) !== j) queue.items.set(kind + '|' + id, { kind, id, data: x }); }
      if (!NO_DELETE.has(k)) for (const id of snap[k].keys()) if (!now.has(id)) queue.items.set(kind + '|' + id, { kind, id, deleted: true });
      snap[k] = now; flushSoon();
    }
  };
  function flushSoon() { clearTimeout(flushT); flushT = setTimeout(flush, 450); status('saving'); }
  async function flush() {
    const a = admin(); if (!a || flushing) return;
    if (!queue.kv.size && !queue.items.size) { status('ok'); return; }
    flushing = true;
    const kv = {}; queue.kv.forEach((v, k) => { kv[k] = v; });
    const items = Array.from(queue.items.values());
    queue.kv.clear(); queue.items.clear();
    try {
      await CL.uploadPhotos({ kv, items: items.filter(i => i.kind !== 'order') }, true);
      if (a.role !== 'owner') { for (const k in kv) delete kv[k]; }
      const own = items.filter(i => i.kind !== 'customer' || a.role === 'owner');
      if (Object.keys(kv).length || own.length) await rpc('shop_admin_push', { p_token: a.token, p_kv: kv, p_items: own });
      status('ok');
    } catch (e) {
      // put back what was not saved (newer local changes win)
      for (const k in kv) if (!queue.kv.has(k)) queue.kv.set(k, kv[k]);
      for (const i of items) { const key = i.kind + '|' + i.id; if (!queue.items.has(key)) queue.items.set(key, i); }
      status('err', e);
      if (e.code === 'auth') return expired();
      if (e.code === 'forbidden') { queue.kv.clear(); queue.items.clear(); C.toast(W('Keine Berechtigung für diese Änderung.', 'ما عندك صلاحية لهالتعديل.'), 'err'); }
      else setTimeout(flush, 8000);
    } finally { flushing = false; if (queue.kv.size || queue.items.size) flushSoon(); }
  }
  CL.flush = flush;
  CL.pending = () => queue.kv.size + queue.items.size > 0 || flushing;
  window.addEventListener('beforeunload', e => { if (admin() && CL.pending()) { flush(); e.preventDefault(); e.returnValue = ''; } });

  function status(st, e) {
    const el = document.getElementById('syncState'); if (!el) return;
    el.dataset.st = st;
    el.textContent = st === 'saving' ? W('Speichert …', 'عم يحفظ …') : st === 'ok' ? W('Gespeichert', 'محفوظ') : W('Nicht gespeichert – ', 'ما انحفظ – ') + CL.msg(e && e.code);
  }
  function expired() {
    stopPoll(); quiet(() => ST.set('adminSession', null)); clearAdminData();
    C.toast(W('Sitzung abgelaufen – bitte neu anmelden.', 'انتهت الجلسة – سجّل دخول من جديد.'), 'err');
    if (C.path().startsWith('/admin')) C.dispatch();
  }
  function clearAdminData() { quiet(() => { ['orders', 'customers', 'giftcards', 'emails', 'activity'].forEach(k => ST.set(k, [])); }); Object.keys(snap).forEach(k => delete snap[k]); }

  /* price list for the server-side price check */
  let priceT = null, lastPrices = '';
  function priceSoon() { clearTimeout(priceT); priceT = setTimeout(pushPrices, 700); }
  CL.priceTable = function () {
    const out = { _names: {} };
    for (const p of ST.products(true)) {
      if (['gutschein', 'geschenkbox'].includes(p.id)) { out._names[p.id] = p.name; continue; }
      const opts = {};
      for (const o of (p.opts || [])) { const c = {}; for (const ch of (o.choices || [])) c[ch.id] = ST.round2(ch.price || 0); opts[o.id] = { _def: o.def, c }; }
      out[p.id] = { base: ST.basePrice(p), active: p.active !== false && !p.deleted, tax: p.tax || 19, name: p.name, opts, digital: !!p.digital };
    }
    if (window.BOX && BOX.priceTables) out._box = BOX.priceTables();
    return out;
  };
  function pushPrices() {
    const a = admin(); if (!a || a.role !== 'owner') return;
    const t = CL.priceTable(); const j = JSON.stringify(t); if (j === lastPrices) return;
    lastPrices = j; queue.kv.set('prices', t); flushSoon();
  }

  function applyPull(r, first) {
    const newOrders = [];
    quiet(() => {
      for (const [k, v] of Object.entries(r.kv || {})) {
        if (k === 'prices') { lastPrices = JSON.stringify(v); continue; }
        if (!KV.includes(k) || queue.kv.has(k)) continue;
        ST.set(k, v);
      }
      const by = {};
      for (const it of (r.items || [])) (by[it.kind] = by[it.kind] || []).push(it);
      if (by.activity) ST.set('activity', by.activity.map(i => i.data).concat(first ? [] : ST.get('activity', [])).sort((a, b) => b.at - a.at).slice(0, 400));
      if (by.newsletter) ST.set('newsletter', by.newsletter.map(i => i.data));
      for (const [key, [kind, idOf]] of Object.entries(LISTS)) {
        if (kind === 'customer') continue;
        const inc = by[kind]; const del = (r.deleted || []).filter(d => d.kind === kind).map(d => String(d.id));
        if (!inc && !del.length && !first) continue;
        let list = first ? [] : ST.get(key, []).slice();
        for (const it of (inc || [])) {
          if (queue.items.has(kind + '|' + it.id)) continue;
          const i = list.findIndex(x => String(idOf(x)) === it.id);
          if (i >= 0) list[i] = it.data; else { list.push(it.data); if (kind === 'order' && !first) newOrders.push(it.data); }
        }
        if (del.length) list = list.filter(x => !del.includes(String(idOf(x))));
        if (kind === 'order') list.sort((a, b) => b.created - a.created);
        else if (kind === 'email') list.sort((a, b) => b.at - a.at);
        else if (kind !== 'giftcard') list.sort((a, b) => (b.at || 0) - (a.at || 0));
        ST.set(key, list); snapshot(key, list);
      }
      if ((r.customers || []).length || first || (r.deleted || []).some(d => d.kind === 'customer')) {
        let list = first ? [] : ST.get('customers', []).slice();
        for (const c of (r.customers || [])) { const i = list.findIndex(x => x.id === c.id); if (i >= 0) list[i] = c; else list.push(c); }
        const del = (r.deleted || []).filter(d => d.kind === 'customer').map(d => d.id);
        list = list.filter(x => !del.includes(x.id));
        ST.set('customers', list); snapshot('customers', list);
      }
    });
    ST.invalidate();
    if ((r.kv || {}).site && window.SITE && SITE.apply) SITE.apply();
    CL.mail = !!r.mail;
    return newOrders;
  }
  CL.adminStart = async function () {
    const a = admin(); if (!a) return;
    const r = await rpc('shop_admin_pull', { p_token: a.token, p_since: 0 });
    if (r.role !== a.role) quiet(() => ST.set('adminSession', Object.assign({}, a, { role: r.role })));
    lastPull = r.now - 15000;
    applyPull(r, true);
    // first start of a new shop: copy the full default settings and the standard discount codes to the server
    if (r.role === 'owner' && !(r.kv || {}).settings) { const s = ST.settings(); delete s.staff; queue.kv.set('settings', s); flushSoon(); }
    if (r.role === 'owner' && !(r.kv || {}).coupons && ST.DEFAULT_COUPONS) { ST.saveCoupons(JSON.parse(JSON.stringify(ST.DEFAULT_COUPONS))); }
    if (r.role === 'owner') CL.oldBanner();
    // new brand name: replace the old shop name once (owner can still change it in the settings)
    if (r.role === 'owner') { const s = ST.settings(); if (/Neuetalia/i.test(s.shop.name || '') || /Neuetalia/i.test(s.shop.owner || '')) { s.shop.name = 'Adam'; if (/Neuetalia/i.test(s.shop.owner || '')) s.shop.owner = 'Adam'; ST.saveSettings(s); } }
    if (r.role === 'owner') pushPrices();
    // the shop address is needed for links in e-mails (taken from the owner's own browser, never from visitors)
    if (r.role === 'owner' && /^https:/.test(location.origin)) { const s = ST.settings(); if (!s.shop.url) { s.shop.url = location.origin + location.pathname.replace(/admin\.html$/, ''); ST.saveSettings(s); } }
    startPoll();
  };
  /* ---------------- data from the old version (saved in this browser before the server existed) ---------------- */
  const OLD_KEYS = ['settings', 'site', 'catCfg', 'customProducts', 'prodOv', 'coupons'];
  CL.oldData = function () {
    const out = {};
    try { if (localStorage.getItem(BAK + '_done')) return out; for (const k of OLD_KEYS) { const v = localStorage.getItem(BAK + k); if (v) { try { out[k] = JSON.parse(v); } catch (e) { } } } } catch (e) { }
    return out;
  };
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const deep = (a, b) => { for (const k in b) { if (isObj(b[k]) && isObj(a[k])) deep(a[k], b[k]); else if (b[k] !== undefined) a[k] = b[k]; } return a; };
  CL.importOld = function () {
    const d = CL.oldData(); const done = [];
    if (d.settings) { const s = deep(ST.settings(), d.settings); delete s.staff; if (/Neuetalia/i.test(s.shop.name || '')) s.shop.name = 'Adam'; ST.saveSettings(s); done.push('settings'); }
    if (d.site) { ST.set('site', deep(ST.get('site', {}) || {}, d.site)); done.push('site'); }
    if (d.catCfg) { ST.set('catCfg', d.catCfg); done.push('catCfg'); }
    if (Array.isArray(d.customProducts) && d.customProducts.length) { const cur = ST.get('customProducts', []) || []; ST.set('customProducts', cur.concat(d.customProducts.filter(p => !cur.some(x => x.id === p.id)))); done.push('customProducts'); }
    if (isObj(d.prodOv)) { ST.set('prodOv', deep(ST.get('prodOv', {}) || {}, d.prodOv)); done.push('prodOv'); }
    if (Array.isArray(d.coupons)) { const cur = ST.coupons(); ST.saveCoupons(cur.concat(d.coupons.filter(c => c && /^[A-Z0-9_-]{2,40}$/.test(String(c.code || '').toUpperCase()) && typeof c.value === 'number' && !cur.some(x => x.code.toUpperCase() === String(c.code).toUpperCase())).map(c => Object.assign({}, c, { code: String(c.code).toUpperCase() })))); done.push('coupons'); }
    try { localStorage.setItem(BAK + '_done', String(Date.now())); } catch (e) { }
    if (window.SITE && SITE.apply) SITE.apply();
    ST.log('website', 'Daten aus der alten Version übernommen: ' + done.join(', '), (admin() || {}).user || 'admin');
    return done;
  };
  CL.oldBanner = function () {
    const d = CL.oldData(); const keys = Object.keys(d); if (!keys.length) return;
    const n = (d.customProducts || []).length;
    const show = () => {
      const main = $('#amain') || $('.a-main'); if (!main || main.querySelector('#clOld')) return;
      main.insertAdjacentHTML('afterbegin', `<div class="sec-warn" id="clOld">${ic('alert')}<span>${W('In diesem Browser sind Daten aus der alten Shop-Version gespeichert (Einstellungen, Website-Texte & Farben, Kategorien' + (n ? ', ' + n + ' eigene Produkte' : '') + ', Produkt-Änderungen, Rabattcodes). Sollen sie auf den Server übernommen werden?', 'بهالمتصفح في بيانات من النسخة القديمة للمتجر (الإعدادات، نصوص وألوان الموقع، الأقسام' + (n ? '، ' + n + ' منتجات خاصة' : '') + '، تعديلات المنتجات، أكواد الخصم). بدك ننقلها عالسيرفر؟')}</span>
        <button class="btn sm" data-clold="1">${W('Übernehmen', 'انقلها')}</button><button class="btn ghost sm" data-clold="0">${W('Nicht übernehmen', 'لا')}</button></div>`);
    };
    show(); if (CL._oldObs) return;
    CL._oldObs = new MutationObserver(() => { if (Object.keys(CL.oldData()).length) show(); else { CL._oldObs.disconnect(); } });
    CL._oldObs.observe(document.body, { childList: true, subtree: true });
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-clold]'); if (!b) return;
    if (b.dataset.clold === '1') { const done = CL.importOld(); C.toast(W('Übernommen ✓ – wird gespeichert', 'تم النقل ✓ – عم ينحفظ') + ' (' + done.length + ')'); }
    else { try { localStorage.setItem(BAK + '_done', 'skip ' + Date.now()); } catch (x) { } }
    const box = $('#clOld'); if (box) box.remove();
  });
  function startPoll() { stopPoll(); pollT = setInterval(poll, 15000); }
  function stopPoll() { if (pollT) clearInterval(pollT); pollT = null; }
  async function poll() {
    const a = admin(); if (!a) return stopPoll();
    if (document.hidden && Date.now() - lastPull < 60000) return;
    try {
      const r = await rpc('shop_admin_pull', { p_token: a.token, p_since: lastPull });
      lastPull = r.now - 15000;
      const fresh = applyPull(r, false);
      fresh.forEach(o => { if (window.ADMIN && ADMIN.ping) ADMIN.ping({ tpl: 'owner_new', no: o.no, lang: 'de', id: 'x', to: '', at: Date.now() }); });
      const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (!fresh.length && (r.items || []).length && C.path().startsWith('/admin') && !typing && !document.querySelector('.ov')) C.dispatch({ keepScroll: true });
    } catch (e) { if (e.code === 'auth') expired(); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && admin() && isAdminPage) poll(); });

  /* ---------------- hooks into the existing modules (after they are loaded) ---------------- */
  CL.install = function () {
    texts();
    /* gift box price list for the server */
    if (window.BOX && !BOX.priceTables) BOX.priceTables = function () { return BOX._tables ? BOX._tables() : {}; };

    /* customer: cancel, approval, complaint, tracking, account – always via the server */
    if (window.CHECKOUT) {
      const K = CHECKOUT;
      const _track = K.track; K.track = async function (no, q) {
        q = q || {}; const mine = ST.get('lastOrderMine', null);
        if (no && !admin()) {
          const known = ST.order(no); const email = q.e || (known && known.cust.email) || (mine && mine.no === no && mine.email) || (ST.me() && ST.me().email);
          if (email) await CL.fetchOrder(no, email);
        }
        return _track.apply(this, arguments);
      };
      const _appr = K.approval; let apprTok = null;
      K.approval = async function (no, token) {
        apprTok = token;
        const o = await rpc('shop_order_by_token', { p_no: no, p_token: token }).catch(() => null);
        if (o) CL.keepOrder(o);
        return _appr.apply(this, arguments);
      };
      K.approve = async function (no, idx, ok, msg) {
        try { const o = await rpc('shop_order_approve', { p_no: no, p_token: apprTok, p_idx: idx, p_ok: ok, p_msg: msg || '' }); CL.keepOrder(o); C.toast(ok ? t('appr_thx') : t('appr_change_thx')); C.dispatch({ keepScroll: true }); }
        catch (e) { CL.fail(e); }
      };
      const payBtn = o => CL.payable(o) && (ST.settings().paypal || {}).clientId ? `<div class="callout f-blush pp-open"><b>${esc(t('pp_open'))} · ${eur(o.totals.total)}</b><button class="btn" data-pp-pay="${esc(o.no)}">${esc(t('pp_pay_now'))}</button></div>` : '';
      const _thx2 = K.thanks; K.thanks = function (no) { const r = _thx2.apply(this, arguments); const o = ST.order(no); const h = $('.thanks .lead'); if (h && o) h.insertAdjacentHTML('afterend', payBtn(o)); return r; };
      const _trk2 = K.track; K.track = async function () { const r = await _trk2.apply(this, arguments); const m = /\/verfolgen\/([^?]+)/.exec(C.path()); const o = m && ST.order(decodeURIComponent(m[1])); const h = $('.td-head'); if (h && o && !$('.pp-open')) h.insertAdjacentHTML('afterend', payBtn(o)); return r; };
      document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pp-pay]'); if (!b) return; e.preventDefault(); CL.payPayPal(ST.order(b.dataset.ppPay)); });
      const _acc = K.account; K.account = async function (tab, q) {
        if (tab === 'passwort') return pwPage(q || {});
        if (custTok()) await CL.refreshMe().catch(() => { }); return _acc.apply(this, arguments);
      };
      function pwPage(q) {
        const reset = q.t && /^[a-f0-9]{64}$/.test(q.t);
        SHOP.page(`<div class="wrap narrow acc-auth pw-page"><div class="auth-box"><h1>${t(reset ? 'pw_new_h' : 'pw_forgot')}</h1><p class="lead">${t(reset ? 'pw_new_p' : 'pw_forgot_p')}</p>
          <form class="authf" id="pwForm" novalidate>${reset ? `<label class="fld"><span>${t('password')}</span><input class="in" name="pw" type="password" minlength="8" autocomplete="new-password" required></label>` : `<label class="fld"><span>${t('email')}</span><input class="in" name="email" type="email" autocomplete="email" required></label>`}
          <button class="btn block">${t(reset ? 'save' : 'pw_send')}</button></form><p id="pwOut" class="hint" hidden></p><p><a class="link" href="#/konto">← ${t('login')}</a></p></div></div>`, 'acc');
        $('#pwForm').addEventListener('submit', async e => {
          e.preventDefault(); e.stopPropagation(); const f = e.target; const out = $('#pwOut'); const b = f.querySelector('button'); b.disabled = true;
          try {
            if (reset) {
              if (f.pw.value.length < 8) { C.toast(t('pw_short'), 'err'); return; }
              const r = await rpc('shop_cust_pw_reset', { p_token: q.t, p_pw: f.pw.value });
              quiet(() => { ST.set('session', { token: r.token, at: Date.now() }); ST.set('me', r.me); });
              C.toast(t('pw_done')); SHOP.refreshHeader(); C.go('#/konto');
            } else {
              const r = await rpc('shop_cust_pw_forgot', { p_email: f.email.value, p_lang: C.lang() });
              const s = ST.settings().shop || {};
              out.hidden = false; out.innerHTML = r.mail ? esc(t('pw_sent')) : esc(t('pw_nomail')) + (s.phone ? ` <bdi dir="ltr"><a href="tel:${esc(String(s.phone).replace(/\s/g, ''))}">${esc(s.phone)}</a></bdi>` : '');
              f.reset();
            }
          } catch (er) { C.toast(er.code === 'expired' ? t('pw_expired') : er.code === 'pw_short' ? t('pw_short') : CL.msg(er.code), 'err'); }
          finally { b.disabled = false; }
        }, true);
      }
      K.mailbox = function () { C.go(ST.me() ? '#/konto' : '#/verfolgen'); };
    }
    ST.cancelOrderCustomer = async function (no) {
      const o = ST.order(no); if (!o) return false;
      try { const x = await rpc('shop_order_cancel', { p_no: no, p_email: o.cust.email }); CL.keepOrder(x); return true; } catch (e) { if (e.code === 'cancel_late') C.toast(t('cancel_late'), 'err'); else CL.fail(e); return false; }
    };
    ST.complaint = async function (no, text) {
      const o = ST.order(no); if (!o) return false;
      try { const x = await rpc('shop_order_complaint', { p_no: no, p_email: o.cust.email, p_text: text }); CL.keepOrder(x); return true; } catch (e) { CL.fail(e); return false; }
    };
    ST.newsletter = email => rpc('shop_newsletter', { p_email: email, p_lang: C.lang() });

    /* owner area */
    if (window.ADMIN) installAdmin();
  };

  function installAdmin() {
    const A = ADMIN;
    A.login = function () {
      const app = $('#app'); app.className = 'adm login';
      document.documentElement.lang = AR() ? 'ar' : 'de'; document.documentElement.dir = AR() ? 'rtl' : 'ltr';
      app.innerHTML = `<div class="a-login"><a class="a-logo" href="#/">${esc((ST.settings().shop || {}).name || 'Adam')}</a><h1>${W('Verwaltung', 'لوحة الإدارة')}</h1>
        <form data-aform="login" autocomplete="on"><label class="fld"><span>${W('Benutzer', 'اسم المستخدم')}</span><input class="in" name="user" autocomplete="username" required autocapitalize="none" spellcheck="false"></label>
        <label class="fld"><span>${W('Passwort', 'كلمة السر')}</span><input class="in" name="pw" type="password" autocomplete="current-password" required></label>
        <button class="btn block">${W('Anmelden', 'تسجيل الدخول')}</button></form>
        ${CL.bootError ? `<p class="warn">${esc(CL.msg(CL.bootError))}</p>` : ''}
        <p class="muted small">${W('Mitarbeiter-Zugänge sehen nur Bestellungen, Produktion und Versand.', 'حسابات الموظفين بتشوف بس الطلبات والإنتاج والشحن.')}</p><a class="link" href="./">← ${W('Zurück zum Shop', 'رجوع للمتجر')}</a>
        <p class="lang-sw small"><button type="button" class="link" data-cl-lang="${AR() ? 'de' : 'ar'}">${AR() ? 'Deutsch' : 'العربية'}</button></p></div>`;
      setTimeout(() => { const i = $('[name=user]'); if (i) i.focus(); }, 50);
    };
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-cl-lang]'); if (!b) return; quiet(() => ST.set('adminLang', b.dataset.clLang)); A.login(); });
    const _sub = A.onSubmit;
    A.onSubmit = async function (f) {
      if (f.dataset.aform !== 'login') return _sub.apply(this, arguments);
      const fd = new FormData(f); const btn = f.querySelector('button'); btn.disabled = true;
      try {
        const r = await rpc('shop_admin_login', { p_user: String(fd.get('user') || '').trim(), p_pw: String(fd.get('pw') || '') });
        quiet(() => ST.set('adminSession', { user: r.user, role: r.role, at: Date.now(), token: r.token }));
        await CL.adminStart();
        C.dispatch();
      } catch (e) {
        C.toast(e.code === 'wrong' ? W('Benutzer oder Passwort falsch', 'اسم المستخدم أو كلمة السر غلط') : CL.msg(e.code), 'err');
      } finally { btn.disabled = false; }
    };
    const _click = A.onClick;
    A.onClick = async function (el) {
      if (el.dataset.a === 'logout') { const a = admin(); await flush(); if (a) rpc('shop_admin_logout', { p_token: a.token }).catch(() => { }); stopPoll(); quiet(() => ST.set('adminSession', null)); clearAdminData(); C.go('#/admin'); return; }
      if (el.dataset.a === 'reset') return;
      return _click.apply(this, arguments);
    };
    /* settings page: team with real passwords, e-mail sending, no demo reset */
    const _set = A.settings;
    A.settings = function () {
      _set.apply(this, arguments);
      $$('[data-a="reset"]').forEach(b => b.remove());
      const team = $$('.a-card').find(s => /Team|الفريق/.test((s.querySelector('h2') || {}).textContent || ''));
      if (team) { team.querySelectorAll('input,select').forEach(x => x.removeAttribute('name')); team.innerHTML = `<h2>${W('Team & Passwörter', 'الفريق وكلمات السر')}</h2><div id="clTeam"><span class="spin"></span></div>`; loadTeam(); }
      const host = team || $('#amain');
      host.insertAdjacentHTML('afterend', `<section class="a-card" id="clMail"><h2>${W('E-Mails an Kunden', 'الإيميلات للزباين')}</h2>
        <p class="hint">${CL.mail ? W('E-Mail-Versand ist eingerichtet.', 'إرسال الإيميلات شغّال.') : W('Noch nicht eingerichtet: Bestellbestätigungen werden nur im Shop angezeigt. Mit einem kostenlosen Resend-Schlüssel (resend.com) gehen echte E-Mails raus.', 'لسا مو مفعّل: تأكيد الطلب بيبين بس بالموقع. بمفتاح مجاني من resend.com بتطلع إيميلات حقيقية.')}</p>
        <div class="grid2"><label class="fld"><span>Resend API Key</span><input class="in no-tr" dir="ltr" id="clKey" type="password" autocomplete="off" placeholder="re_…"></label>
        <label class="fld"><span>${W('Absender', 'المرسل')}</span><input class="in no-tr" dir="ltr" id="clFrom" placeholder="Adam <shop@deine-domain.de>"></label></div>
        <div class="vbtns"><button type="button" class="btn ghost sm" id="clMailSave">${W('Speichern', 'حفظ')}</button>${CL.mail ? `<button type="button" class="btn ghost sm danger" id="clMailOff">${W('Ausschalten', 'إيقاف')}</button>` : ''}</div></section>`);
      const pw = $('#clPw');
      void pw;
    };
    async function loadTeam() {
      const a = admin(); const box = $('#clTeam'); if (!box || !a) return;
      let users = [];
      try { users = await rpc('shop_admin_users', { p_token: a.token }); } catch (e) { box.innerHTML = `<p class="warn">${esc(CL.msg(e.code))}</p>`; return; }
      box.innerHTML = `<ul class="team-l">${users.map(u => `<li><b>${esc(u.user)}</b> <span class="badge">${u.role === 'owner' ? W('Inhaber', 'صاحب المحل') : W('Mitarbeiter', 'موظف')}</span>${u.user !== a.user ? ` <button type="button" class="link danger" data-cl-del="${esc(u.user)}">${W('Entfernen', 'حذف')}</button>` : ` <small class="muted">(${W('du', 'إنت')})</small>`}</li>`).join('')}</ul>
        <h3 class="sub">${W('Eigenes Passwort ändern', 'غيّر كلمة السر تبعك')}</h3>
        <div class="grid3"><label class="fld"><span>${W('Aktuelles Passwort', 'كلمة السر الحالية')}</span><input class="in" type="password" id="clOld" autocomplete="current-password"></label>
        <label class="fld"><span>${W('Neues Passwort (mind. 10 Zeichen)', 'كلمة سر جديدة (10 أحرف عالأقل)')}</span><input class="in" type="password" id="clNew" autocomplete="new-password" minlength="10"></label>
        <div class="fld"><span>&nbsp;</span><button type="button" class="btn ghost" id="clPwGo">${W('Ändern', 'غيّر')}</button></div></div>
        <h3 class="sub">${W('Zugang hinzufügen / Passwort zurücksetzen', 'زيد حساب / رجّع كلمة سر')}</h3>
        <div class="grid3"><label class="fld"><span>${W('Benutzername', 'اسم المستخدم')}</span><input class="in" id="clU" autocomplete="off"></label>
        <label class="fld"><span>${W('Passwort (mind. 10 Zeichen)', 'كلمة السر (10 أحرف عالأقل)')}</span><input class="in" type="password" id="clUP" autocomplete="new-password"></label>
        <label class="fld"><span>${W('Rolle', 'الصلاحية')}</span><select class="in" id="clR"><option value="staff">${W('Mitarbeiter (Bestellungen, Produktion, Versand)', 'موظف (طلبات، إنتاج، شحن)')}</option><option value="owner">${W('Inhaber (alles)', 'صاحب المحل (كل شي)')}</option></select></label></div>
        <button type="button" class="btn ghost sm" id="clAdd">${W('Speichern', 'حفظ')}</button>`;
    }
    document.addEventListener('click', async e => {
      const a = admin(); if (!a || !e.target.closest) return;
      const del = e.target.closest('[data-cl-del]'), pwGo = e.target.closest('#clPwGo'), add = e.target.closest('#clAdd'), ms = e.target.closest('#clMailSave'), off = e.target.closest('#clMailOff');
      try {
        if (del) { if (!await C.confirm(W('Zugang wirklich entfernen?', 'أكيد بدك تحذف هالحساب؟'), W('Entfernen', 'حذف'), W('Abbrechen', 'إلغاء'))) return; await rpc('shop_admin_user_set', { p_token: a.token, p_user: del.dataset.clDel, p_pw: null, p_role: 'staff', p_delete: true }); C.toast(W('Entfernt', 'انحذف')); loadTeam(); }
        if (pwGo) { await rpc('shop_admin_pw', { p_token: a.token, p_old: $('#clOld').value, p_new: $('#clNew').value }); C.toast(W('Passwort geändert', 'تغيّرت كلمة السر')); loadTeam(); }
        if (add) { await rpc('shop_admin_user_set', { p_token: a.token, p_user: $('#clU').value, p_pw: $('#clUP').value, p_role: $('#clR').value, p_delete: false }); C.toast(W('Gespeichert', 'انحفظ')); loadTeam(); }
        if (ms || off) { await rpc('shop_admin_mail_setup', { p_token: a.token, p_key: off ? '' : $('#clKey').value, p_from: off ? '' : $('#clFrom').value }); CL.mail = !off && !!$('#clKey').value; C.toast(W('Gespeichert', 'انحفظ')); C.dispatch({ keepScroll: true }); }
      } catch (er) { C.toast(er.code === 'wrong' ? W('Aktuelles Passwort falsch', 'كلمة السر الحالية غلط') : er.code === 'pw_short' ? W('Passwort zu kurz (mind. 10 Zeichen)', 'كلمة السر قصيرة (10 أحرف عالأقل)') : CL.msg(er.code), 'err'); }
    });
    /* save state in the header */
    const _shell = A.shell;
    if (_shell) A.shell = function () { const r = _shell.apply(this, arguments); addSync(); return r; };
    new MutationObserver(addSync).observe(document.getElementById('app') || document.body, { childList: true });
    function addSync() { const top = $('.a-top'); if (top && !$('#syncState')) { top.querySelector('.sp').insertAdjacentHTML('afterend', '<span id="syncState" class="sync-st" data-st="ok" aria-live="polite"></span>'); status(CL.pending() ? 'saving' : 'ok'); } }
  }
})();
