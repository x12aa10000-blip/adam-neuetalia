/* Round 5: website settings (logo, colours, home page, shop locations), header with drop-down
   categories and live search, compact product cards with quick "add to bag", "add to the box",
   proper reviews, calm form validation, checkout polish and real PayPal when a client ID is set.
   Everything wraps the existing modules – no existing function is removed. */
(function () {
  'use strict';
  const V = {};
  window.V5 = V;
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };

  /* ---------------- texts ---------------- */
  K('v5_branches', 'Unsere Läden', 'Our shops', 'فروعنا');
  K('v5_branches_h', 'Besuch uns in unseren Läden', 'Visit us in our shops', 'زورونا بفروعنا');
  K('v5_branches_p', 'Abholen, anschauen, beraten lassen – wir freuen uns auf dich.', 'Pick up, have a look, get advice – we look forward to seeing you.', 'استلم طلبك، شوف المنتجات، واسألنا عن أي شي – منستناك.');
  K('v5_map', 'Karte', 'Map', 'الخريطة');
  K('v5_call', 'Anrufen', 'Call', 'اتصال');
  K('v5_add', 'In den Korb', 'Add', 'أضف');
  K('v5_quick', 'Schnell bestellen', 'Quick order', 'طلب سريع');
  K('v5_more_opts', 'Alle Optionen auf der Produktseite', 'All options on the product page', 'كل خيارات التخصيص بصفحة المنتج');
  K('v5_add_box', 'In die Geschenkbox legen', 'Put into the gift box', 'أضف للبوكس');
  K('v5_box_added', 'In deiner Geschenkbox ({n}) – weiter zur Box?', 'In your gift box ({n}) – go to the box?', 'انضاف للبوكس ({n}) – بدك تكمل تصميم البوكس؟');
  K('v5_box_go', 'Zur Box', 'Open box', 'روح للبوكس');
  K('v5_box_full', 'Die größte Box ist voll (8 Geschenke).', 'The largest box is full (8 gifts).', 'أكبر بوكس صار مليان (٨ هدايا).');
  K('v5_vat_all', 'Alle Preise inkl. MwSt., zzgl. Versand.', 'All prices incl. VAT, plus shipping.', 'كل الأسعار شاملة الضريبة، الشحن منفصل.');
  K('v5_reviews_h', 'Das sagen unsere Kunden', 'What our customers say', 'آراء زبائننا');
  K('v5_reviews_n', 'aus {n} Bewertungen', 'from {n} reviews', 'من {n} تقييم');
  K('v5_reviews_none', 'Noch keine Bewertungen – sei die erste Person!', 'No reviews yet – be the first!', 'لسا ما في تقييمات – كون أول واحد!');
  K('v5_v_req', 'Bitte ausfüllen', 'Please fill in', 'هالحقل مطلوب');
  K('v5_v_email', 'Bitte eine gültige E-Mail eingeben, z. B. name@mail.de', 'Please enter a valid e-mail, e.g. name@mail.com', 'اكتب بريد إلكتروني صحيح، مثل name@mail.com');
  K('v5_v_min', 'Mindestens {n} Zeichen', 'At least {n} characters', 'على الأقل {n} أحرف');
  K('v5_v_agb', 'Bitte bestätige die AGB', 'Please accept the terms', 'لازم توافق على الشروط');
  K('v5_v_check', 'Bitte prüfe die markierten Felder.', 'Please check the marked fields.', 'شيك على الحقول اللي عليها ملاحظة.');
  K('v5_co_s1', 'Warenkorb', 'Bag', 'السلة');
  K('v5_co_s2', 'Daten & Lieferung', 'Details & delivery', 'البيانات والتوصيل');
  K('v5_co_s3', 'Bezahlen', 'Payment', 'الدفع');
  K('v5_co_s4', 'Fertig', 'Done', 'تم');
  K('v5_pick_store', 'In welchem Laden holst du ab?', 'Which shop will you pick up from?', 'من أي فرع بدك تستلم؟');
  K('v5_pp_title', 'Sicher bezahlen', 'Pay securely', 'دفع آمن');
  K('v5_pp_p', 'Du bezahlst direkt bei PayPal (auch mit Karte möglich).', 'You pay directly with PayPal (card also possible).', 'الدفع مباشرة عن طريق PayPal (فيك تدفع بالبطاقة كمان).');
  K('v5_pp_err', 'PayPal konnte nicht geladen werden. Bitte später erneut versuchen oder andere Zahlart wählen.', 'PayPal could not be loaded. Please try again later or choose another method.', 'ما قدرنا نفتح PayPal. جرب بعد شوي أو اختار طريقة دفع تانية.');
  K('v5_cats_all', 'Alle Kategorien', 'All categories', 'كل الأقسام');
  K('v5_popular', 'Beliebt', 'Popular', 'الأكثر طلباً');
  K('v5_new', 'Neu', 'New', 'جديد');
  K('v5_best', 'Bestseller', 'Bestseller', 'الأكثر مبيعاً');
  K('v5_free_text', 'Kostenlose Abholung im Laden', 'Free pick-up in store', 'استلام مجاني من المحل');

  /* ---------------- icons (same style as the core set) ---------------- */
  const XI = {
    down: '<path d="m6 9.5 6 6 6-6"/>',
    ig: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none"/>',
    fb: '<path d="M14.6 7.6h2V4.2h-2.4a3.9 3.9 0 0 0-3.9 3.9v2.4H8.2v3.3h2.1v6.4h3.4v-6.4h2.4l.5-3.3h-2.9V8.6a1 1 0 0 1 .9-1z"/>',
    tt: '<path d="M14.2 3.8v10.6a3.6 3.6 0 1 1-3.6-3.6"/><path d="M14.2 3.8c.4 2.6 2.4 4.4 5 4.6"/>',
    wa: '<path d="M4.4 19.6 5.6 16A8.1 8.1 0 1 1 8.8 18.7z"/><path d="M9.3 8.3c.2 2.9 2.5 5.3 5.5 5.7l.9-1.3-1.7-1-.8.8c-1.1-.5-2-1.4-2.5-2.5l.8-.8-1-1.7z"/>',
    store: '<path d="M4 9.5 5.5 4.5h13L20 9.5M4.5 9.5V20h15V9.5"/><path d="M4 9.5c0 1.5 1.2 2.5 2.7 2.5S9.3 11 9.3 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.6 2.5S20 11 20 9.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'
  };
  /** opening hours typed by the owner: keep time ranges left-to-right inside Arabic text */
  V.hrs = s => esc(s).replace(/\d{1,2}[:.]\d{2}\s*[–\-]\s*\d{1,2}[:.]\d{2}/g, m => `<bdi dir="ltr">${m}</bdi>`);
  V.ic = (n, cls) => XI[n] ? `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${XI[n]}</svg>` : ic(n, cls);

  /* ---------------- website settings ---------------- */
  /* home page sections (new premium layout first; older blocks can be switched on in the admin) */
  const SECTIONS = ['hero', 'quick', 'usp', 'best', 'occ', 'promos', 'cats', 'new', 'wall', 'finder', 'reviews', 'about', 'locs', 'faq', 'news', 'mosaic', 'feats', 'carousel', 'camp', 'gift'];
  const SEC_OFF = ['mosaic', 'feats', 'carousel', 'camp', 'gift'];
  V.SECTIONS = SECTIONS;
  const L3 = (de, en, ar) => ({ de: de || '', en: en || '', ar: ar || '' });
  const BRAND0 = '#fe90be';
  const SDEF = () => ({
    v: 2, brand: BRAND0, accent: '#01cac9', logo: '', logoH: 46,
    sections: SECTIONS.map(id => ({ id, on: !SEC_OFF.includes(id) })),
    slides: [{ img: '', e: L3(), t: L3(), p: L3(), b: L3(), link: '' }, { img: '', e: L3(), t: L3(), p: L3(), b: L3(), link: '' }, { img: '', e: L3(), t: L3(), p: L3(), b: L3(), link: '' }],
    tiles: { her: { img: '', t: L3() }, him: { img: '', t: L3() }, promo: { img: '', t: L3(), p: L3() }, kids: { img: '', t: L3() }, all: { img: '', t: L3() }, custom: { img: '', t: L3(), p: L3() } },
    texts: {},
    locations: [{ id: 'l1', name: 'Adam & Neuetalia', street: 'Steindamm 62', zip: '20099', city: 'Hamburg', phone: '+49 177 6449312', hours: L3('Mo–Sa 09:00–22:00 · So 09:00–16:00', 'Mon–Sat 09:00–22:00 · Sun 09:00–16:00', 'الإثنين–السبت 09:00–22:00 · الأحد 09:00–16:00') }],
    social: { ig: 'https://www.instagram.com/neuetalia', tt: 'https://www.tiktok.com/@neuetalia', fb: 'https://www.facebook.com/neuetalia' },
    boxes: {}, extras: {}, paypal: { clientId: '' }
  });
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const merge = (a, b) => { if (!isObj(b)) return a; for (const k in b) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else if (b[k] !== undefined) a[k] = b[k]; } return a; };
  const SITE = {
    get() {
      const raw = JSON.parse(JSON.stringify(ST.get('site', {})));
      // settings saved before the new home page: take the new section order and the pink brand colour again
      if (!raw.v || raw.v < 2) { delete raw.sections; if (!raw.brand || /^#c2608b$/i.test(raw.brand)) delete raw.brand; if (/^#3aa7a3$/i.test(raw.accent || '')) delete raw.accent; raw.v = 2; }
      const c = merge(SDEF(), raw);
      for (const id of SECTIONS) if (!c.sections.some(s => s.id === id)) c.sections.push({ id, on: !SEC_OFF.includes(id) });
      while (c.slides.length < 3) c.slides.push({ img: '', e: L3(), t: L3(), p: L3(), b: L3(), link: '' });
      return c;
    },
    save(c) { c.v = 2; ST.set('site', c); SITE.apply(); },
    /** text from the website settings, else the built-in translation */
    tx(key, fb, v) { const o = SITE.get().texts[key]; const s = o && (o[C.lang()] || o.de); return s ? s : t(fb || key, v); },
    apply() {
      const c = SITE.get(); const r = document.documentElement.style;
      const P = V.palette(hex(c.brand) ? c.brand : BRAND0);
      for (const k in P) r.setProperty('--' + k, P[k]);
      r.setProperty('--accent', hex(c.accent) ? c.accent : '#01cac9');
      r.setProperty('--logo-h', (+c.logoH || 46) + 'px');
    }
  };
  /* one colour → a matching family (button colour, darker text colour, light tints) */
  function hsl(hx) { let [r, g, b] = [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h * 360, s, l]; }
  function hx(h, s, l) { const f = n => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
  V.palette = function (c) {
    const [h, s, l] = hsl(c);
    const btn = l > .7 ? hx(h, Math.min(s, .82), .67) : c;
    const [, bs, bl] = hsl(btn);
    return { brand: btn, 'brand-d': hx(h, Math.min(bs, .62), Math.max(.3, bl - .22)), 'brand-l': hx(h, Math.min(s, .9), .92), 'brand-xl': hx(h, Math.min(s, .9), .975), 'brand-soft': c, 'sh-btn': `0 8px 20px -10px ${hx(h, Math.min(bs, .7), Math.max(.25, bl - .15))}` };
  };
  window.SITE = SITE;
  function hex(s) { return /^#[0-9a-f]{6}$/i.test(String(s || '')); }
  function mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
  V.mix = mix;
  /** images saved by the owner live in IndexedDB ("idb:…"); this puts them into <img data-idb> */
  V.src = s => !s ? '' : String(s).startsWith('idb:') ? `src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" data-idb="${esc(s)}"` : `src="${esc(s)}"`;
  V.hydrate = function (root) { $$('img[data-idb]', root || document).forEach(async im => { const u = await ST.photoUrl(im.dataset.idb); if (u) { im.src = u; im.removeAttribute('data-idb'); } }); };
  SITE.apply();

  /* ---------------- logo ---------------- */
  V.logo = function () {
    const c = SITE.get();
    if (c.logo) return `<a class="logo" href="#/" aria-label="Adam &amp; Neuetalia"><img ${V.src(c.logo)} alt="Adam &amp; Neuetalia"></a>`;
    return `<a class="logo" href="#/" aria-label="Adam &amp; Neuetalia"><small>Adam &amp;</small><b><i>N</i>EUETALI<em>A</em></b></a>`;
  };

  /* ---------------- header: categories drop down, live search ---------------- */
  const CATS = () => CAT_EXTRA.cats;
  const cnt = c => ST.products().filter(p => p.cat === c || (p.also || []).includes(c)).length;
  SHOP.header = function () {
    const n = ST.cartCount(); const me = ST.me(); const s = ST.settings();
    const mins = ST.minutesToCutoff();
    const bar = mins > 0 && ST.isWorkday(new Date()) ? t('bar_today', { t: s.cutoff }) : t('bar_pickup');
    const path = C.path(); const on = h => path.startsWith(h) ? ' class="on"' : '';
    const occs = CAT_EXTRA.occ.filter(o => ST.products().some(p => (p.occ || []).includes(o)));
    const wn = ST.wishlist().length;
    return `<div class="topbar"><div class="wrap"><span class="tb-msg">${ic('gift')} ${esc(SITE.tx('top_welcome'))}</span><span class="tb-msg tb-2">${ic('bike')} ${esc(bar)}</span><div class="tb-langs" role="group" aria-label="Sprache · Language · اللغة">${[['de', 'Deutsch', 'DE'], ['en', 'English', 'EN'], ['ar', 'العربية', 'ع']].map(([l, x, sh]) => `<button data-lang="${l}" aria-pressed="${l === C.lang()}" lang="${l}"><span class="hide-s">${x}</span><span class="only-s">${sh}</span></button>`).join('')}</div></div></div>
    <header class="hd"><div class="wrap hd-in">
      <button class="ibtn only-s" data-act="menu" aria-label="${esc(t('menu'))}">${ic('menu')}</button>
      ${V.logo()}
      <div class="hd-sbox" role="search"><form data-v5="hsearch" autocomplete="off">${ic('search')}<input id="hq" type="search" enterkeyhint="search" placeholder="${esc(t('search_ph'))}" aria-label="${esc(t('search'))}" aria-controls="hres" aria-autocomplete="list"><button type="submit" aria-label="${esc(t('search'))}">${ic('search')}</button></form><div class="hd-sres" id="hres" role="listbox" hidden></div></div>
      <div class="hd-tools">
        <button class="ibtn only-s" data-act="search" aria-label="${esc(t('search'))}">${ic('search')}</button>
        <a class="hd-act hide-s" href="#/konto">${ic('user')}<span>${me ? esc(me.name.split(' ')[0]) : t('login')}<small>${me ? t('account') : t('register')}</small></span></a>
        <a class="hd-act hide-s" href="#/wunschliste" aria-label="${esc(t('wishlist'))}">${ic('heart')}${wn ? `<i class="cnt">${wn}</i>` : ''}</a>
        <button class="hd-act" data-act="cart" aria-label="${esc(t('cart'))}">${ic('bag')}<span class="hide-s">${t('cart')}</span>${n ? `<i class="cnt">${n}</i>` : ''}</button>
      </div></div>
      <nav class="hd-nav" aria-label="${esc(t('menu'))}"><div class="wrap">
        <div class="ni cats"><button type="button" data-v5="nav" aria-expanded="false">${ic('grid')} ${t('categories')} ${V.ic('down', 'dn')}</button>
          <div class="mm cats">${CATS().map(c => `<a href="#/c/${c}"><img src="${esc(SHOP.catImg(c))}" alt="" loading="lazy" width="56" height="56"><span>${t('cat_' + c)}<small>${t('n_products', { n: cnt(c) })}</small></span></a>`).join('')}<a class="all" href="#/c/alle">${t('nav_shop')} ${ic('chev', 'flip')}</a></div></div>
        <div class="ni"><a href="#/c/alle"${on('/c/')}>${t('nav_ready')}</a></div>
        <div class="ni"><a href="#/box"${on('/box')}>${ic('box')} ${t('nav_box')}</a></div>
        <div class="ni"><button type="button" data-v5="nav" aria-expanded="false">${t('nav_occ')} ${V.ic('down', 'dn')}</button>
          <div class="mm list">${occs.map(o => `<a href="#/o/${o}">${t('occ_' + o)}<small>${ST.products().filter(p => (p.occ || []).includes(o)).length}</small></a>`).join('')}<a href="#/anlass"><b>${t('see_all')}</b></a></div></div>
        <div class="ni"><a href="#/gutschein"${on('/gutschein')}>${t('nav_gift')}</a></div>
        <div class="ni"><a href="#/filialen"${on('/filialen')}>${ic('pin')} ${t('v5_branches')}</a></div>
        <span class="sp"></span>
        <div class="ni"><a href="#/verfolgen"${on('/verfolgen')}>${ic('truck')} ${t('track_title')}</a></div>
        <div class="ni"><a href="#/hilfe"${on('/hilfe')}>${t('nav_help')}</a></div>
      </div></nav></header>`;
  };
  const _after = SHOP.after; SHOP.after = function () { _after.apply(this, arguments); V.hydrate(); V.markForms(); };
  const _rh = SHOP.refreshHeader; SHOP.refreshHeader = function () { _rh.apply(this, arguments); V.hydrate($('header.hd')); };
  // side menu: show the logo and our shops too
  const _menu = SHOP.menu; SHOP.menu = function () { _menu.apply(this, arguments); const v = $('.ov.menu .m-visit'); if (v) v.insertAdjacentHTML('afterend', `<a class="btn ghost block" style="margin-top:10px" href="#/filialen">${ic('pin')} ${t('v5_branches')}</a>`);
    if (v && ST.get('adminSession', null)) { const ar = C.lang() === 'ar'; v.parentNode.insertAdjacentHTML('beforeend', `<div class="m-admin"><button type="button" class="btn block" data-v5="emstart">${ic('edit')} ${ar ? 'عدّل الموقع' : C.lang() === 'en' ? 'Edit website' : 'Website bearbeiten'}</button><a class="btn ghost block" href="admin.html#/admin">${ic('settings')} ${ar ? 'لوحة الإدارة' : C.lang() === 'en' ? 'Admin' : 'Verwaltung'}</a></div>`); } };
  document.addEventListener('click', e => { if (e.target.closest('[data-v5="emstart"]')) { e.preventDefault(); ST.set('editMode', true); C.closeAll(); location.reload(); } });

  /* live search under the header box */
  let hsel = -1;
  const sres = () => $('#hres');
  const drawSearch = C.debounce(() => {
    const inp = $('#hq'), box = sres(); if (!inp || !box) return;
    const q = inp.value.trim(); hsel = -1;
    if (!q) { box.innerHTML = `<div class="sugg">${['Rosenbox', 'Kette', 'Foto', 'Gravur', 'Tasse', 'Lampe'].map(w => `<button type="button" data-v5="hsugg" data-v="${w}">${w}</button>`).join('')}</div>`; box.hidden = false; return; }
    const r = SHOP.search(q).slice(0, 6);
    box.innerHTML = r.length ? r.map(p => `<a class="srow" role="option" href="#/p/${esc(p.id)}"><img src="${esc(p.views[0].thumb)}" alt="" width="56" height="56"><span>${esc(L(p.name))}<small>${t('cat_' + p.cat)}</small></span>${SHOP.priceHTML(p)}</a>`).join('') + `<a class="srow all" href="#/suche/${encodeURIComponent(q)}">${t('see_all_results')} ${ic('chev', 'flip')}</a>` : `<p class="muted">${t('no_results')}</p>`;
    box.hidden = false;
  }, 110);
  const closeSearch = () => { const b = sres(); if (b) b.hidden = true; };
  document.addEventListener('input', e => { if (e.target.id === 'hq') drawSearch(); });
  document.addEventListener('focusin', e => { if (e.target.id === 'hq') drawSearch(); });
  document.addEventListener('keydown', e => {
    if (e.target.id !== 'hq') return;
    const rows = $$('#hres .srow');
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!rows.length) return; hsel = (hsel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; rows.forEach((r, i) => r.classList.toggle('on', i === hsel)); rows[hsel].scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && hsel >= 0 && rows[hsel]) { e.preventDefault(); location.hash = rows[hsel].getAttribute('href'); closeSearch(); }
  });
  document.addEventListener('submit', e => { const f = e.target; if (f.dataset.v5 !== 'hsearch') return; e.preventDefault(); const q = ($('#hq') || {}).value || ''; if (q.trim()) { closeSearch(); C.go('#/suche/' + encodeURIComponent(q.trim())); } });
  document.addEventListener('click', e => {
    if (!e.target.closest('.hd-sbox')) closeSearch();
    if (!e.target.closest('.hd-nav .ni')) $$('.hd-nav .ni.open').forEach(x => { x.classList.remove('open'); const b = x.querySelector('[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false'); });
  });
  window.addEventListener('hashchange', () => { closeSearch(); });

  /* ---------------- product card: fixed photo size, name, price and a quick add button ---------------- */
  const starsMini = p => { const r = ST.reviews(p.id).filter(r => r.ok); if (!r.length) return ''; const a = r.reduce((s, x) => s + x.stars, 0) / r.length; return `<span class="pc-stars" aria-label="${a.toFixed(1)} / 5">${'★'.repeat(Math.round(a))}${'☆'.repeat(5 - Math.round(a))}<small>(${r.length})</small></span>`; };
  SHOP.card = function (p, opt) {
    opt = opt || {};
    const wished = ST.wishlist().includes(p.id);
    const v = p.views[0];
    const alt = p.views[1] && !p.views[1].when && p.views[1].thumb;
    const custom = (p.fields || []).length;
    const tag = (p.best ? `<span class="ptag t-best">${t('v5_best')}</span>` : '') + (custom ? `<span class="ptag t-custom">${t('tag_custom')}</span>` : SHOP.techTag(p));
    return `<article class="pcard${opt.big ? ' big' : ''}">
      <a class="pimg" href="#/p/${esc(p.id)}" aria-label="${esc(L(p.name))}"><img src="${esc(v.thumb || v.img)}" alt="" loading="lazy" width="560" height="560">${alt ? `<img class="alt" src="${esc(alt)}" alt="" loading="lazy">` : ''}${p.stock <= 0 ? `<span class="soldout">${t('sold_out')}</span>` : ''}</a>
      ${ST.onSale(p) ? `<span class="psale">−${Math.round((1 - p.salePrice / p.price) * 100)} %</span>` : ''}
      <span class="ptags">${tag}</span>
      <button class="wish${wished ? ' on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wished}" aria-label="${esc(t('wishlist'))}">${ic('heart')}</button>
      <div class="pc-body"><a class="pc-name" href="#/p/${esc(p.id)}">${esc(L(p.name))}</a>${starsMini(p)}
        <div class="pc-foot">${SHOP.priceHTML(p)}<button class="pc-add" data-act="qadd" data-id="${esc(p.id)}" aria-label="${esc(t('add_cart'))}"${p.stock <= 0 ? ' disabled' : ''}>${ic('bag')}<span class="lbl">${t('v5_add')}</span></button></div></div>
    </article>`;
  };
  SHOP.grid = list => `<div class="pgrid">${list.map(p => SHOP.card(p)).join('')}</div>`;
  // listing pages: one VAT hint for the whole list instead of a line under every product
  const _list = SHOP.list; SHOP.list = function () { _list.apply(this, arguments); const m = $('.lwrap>div:last-child') || $('#main .wrap:last-child'); if (m && $('.pgrid', m)) m.insertAdjacentHTML('beforeend', `<p class="vat-note">${t('v5_vat_all')} <a class="link" href="#/rechtliches/versand">${t('ship_pay')}</a></p>`); };

  /* ---------------- quick add from the card ---------------- */
  function fieldVisible(p, f, Dz) { if (!f.show) return true; const o = (p.opts || []).find(o => o.id === f.show.opt); const v = (Dz.opt && Dz.opt[f.show.opt]) || (o && o.def); if (f.show.gte != null) return +v >= f.show.gte; return true; }
  const zonesFor = (p, fid) => p.views.flatMap((v, vi) => v.zones.map(z => ({ z, vi }))).filter(({ z }) => z.f === fid || ENG.styleField(z) === fid || (z.tpl && z.tpl.includes('{' + fid)));
  function invalid(p, Dz) {
    for (const f of p.fields) {
      if (!fieldVisible(p, f, Dz)) continue;
      if (f.type === 'photo' && !f.optional && zonesFor(p, f.id).length && !Dz.ph[f.id]) return { f, msg: t('need_photo', { n: t(f.label) }) };
      if (f.type === 'spotify' && !f.optional && !ENG.spotifyUri(Dz.f[f.id])) return { f, msg: t('sp_need') };
      if (f.type === 'spotify' && !f.optional && f.def && ENG.spotifyUri(Dz.f[f.id]) === ENG.spotifyUri(f.def)) return { f, msg: t('sp_change') };
      if ((f.type === 'text' || f.type === 'textarea') && !f.optional) { const v = Dz.f[f.id] != null ? Dz.f[f.id] : f.def; if (!String(v).trim()) return { f, msg: t('need_text', { n: t(f.label) }) }; }
    }
    return null;
  }
  async function cartItem(p, Dz, qty) {
    const fill = {}; for (const f of p.fields) if (Dz.f[f.id] == null && f.type !== 'photo') fill[f.id] = f.def;
    const design = JSON.parse(JSON.stringify(Dz)); Object.assign(design.f, fill); delete design._touched;
    const c = ENG.canvas(10, 10); await ENG.render(c, p, ENG.viewFor(p, design, 0), design, { maxW: 420, force: !ENG.isDefault(p, design) });
    return { id: ST.uid('i'), pid: p.id, D: design, qty: qty || 1, unit: ST.unitPrice(p, design), tax: p.tax || 19, name: p.name, preview: c.toDataURL('image/jpeg', .8), at: Date.now() };
  }
  V.addToCart = async function (p, Dz, qty) { const it = await cartItem(p, Dz, qty); const cart = ST.cart(); cart.push(it); ST.saveCart(cart); SHOP.refreshHeader(); CHECKOUT.drawer(it.id); return it; };
  V.quickAdd = async function (id) {
    const p = ST.product(id); if (!p) return;
    const Dz = ENG.blankDesign(p); for (const o of (p.opts || [])) Dz.opt[o.id] = o.def;
    if (!(p.fields || []).length && !(p.opts || []).length) { await V.addToCart(p, Dz, 1); return; }
    const ov = C.sheet({ title: t('v5_quick'), kind: 'modal', wide: true });
    let vi = 0;
    const fieldsHTML = () => {
      let h = '';
      for (const o of (p.opts || [])) { const v = Dz.opt[o.id] || o.def; h += `<div class="fld"><span class="lb">${t(o.label)}</span><div class="seg sm">${o.choices.map(c => `<button type="button" data-qopt="${o.id}" data-val="${esc(c.id)}" aria-pressed="${c.id === v}">${c.hex ? `<i class="odot" style="background:${esc(c.hex)}"></i>` : ''}${esc(L(c.l))}${c.price ? `<small>+${eur(c.price)}</small>` : ''}</button>`).join('')}</div></div>`; }
      for (const f of p.fields) {
        if (!fieldVisible(p, f, Dz)) continue;
        const lab = t(f.label); const val = Dz.f[f.id] != null ? Dz.f[f.id] : f.def;
        if (f.type === 'text' || f.type === 'textarea') {
          const fonts = !f.sf ? (f.fonts || []) : []; const cur = Dz.font[f.id] || fonts[0];
          h += `<div class="fld" data-qf="${f.id}"><label class="lb" for="q_${f.id}">${lab}${f.optional ? `<small>${t('optional')}</small>` : ''}</label>${f.type === 'textarea' ? `<textarea class="in" rows="${f.lines || 2}" id="q_${f.id}" data-qfield="${f.id}" maxlength="${f.max || 80}">${esc(val)}</textarea>` : `<input class="in" id="q_${f.id}" data-qfield="${f.id}" maxlength="${f.max || 30}" value="${esc(val)}" autocomplete="off">`}
            ${fonts.length > 1 ? `<div class="fonts">${fonts.slice(0, 8).map(fid => `<button type="button" data-qfont="${f.id}" data-val="${fid}" aria-checked="${fid === cur}" style="font-family:'${ENG.fam(fid)}'">${esc(PDP.fontSample(f, val, fid))}</button>`).join('')}</div>` : ''}
            ${!f.sf && f.colors && f.colors.length > 1 ? `<div class="sws">${f.colors.map(c => `<button type="button" class="sw" data-qcol="${f.id}" data-val="${c.id}" role="radio" aria-checked="${(Dz.color[f.id] || f.colors[0].id) === c.id}" style="--c:${c.hex}" title="${esc(L(c.l))}"><span class="vh">${esc(L(c.l))}</span></button>`).join('')}</div>` : ''}</div>`;
        } else if (f.type === 'photo') {
          const ph = Dz.ph[f.id];
          h += `<div class="fld" data-qf="${f.id}"><span class="lb">${lab}${f.optional ? `<small>${t('optional')}</small>` : ''}</span><label class="drop">${ic(ph ? 'check' : 'camera')}<b>${ph ? t('photo_replace') : t('photo_add')}</b><input type="file" accept="image/*" data-qphoto="${f.id}"></label></div>`;
        } else if (f.type === 'spotify') {
          h += `<div class="fld" data-qf="${f.id}"><label class="lb" for="q_${f.id}">${lab}</label><input class="in" id="q_${f.id}" data-qfield="${f.id}" inputmode="url" placeholder="https://open.spotify.com/track/…" value="${esc(val)}"></div>`;
        } else if (f.type === 'date') {
          h += `<div class="fld"><label class="lb" for="q_${f.id}">${lab}</label><input class="in" type="date" id="q_${f.id}" data-qfield="${f.id}" value="${esc(val)}"></div>`;
        } else if (f.type === 'stone') {
          h += `<div class="fld"><label class="lb" for="q_${f.id}">${lab}</label><select class="in" id="q_${f.id}" data-qfield="${f.id}">${f.choices.map(x => `<option value="${x.id}"${x.id === val ? ' selected' : ''}>${esc(L(x.l))}</option>`).join('')}</select></div>`;
        }
      }
      return h;
    };
    const paint = () => {
      ov.body.innerHTML = `<div class="qa"><div class="qa-pv"><canvas id="qaCv"></canvas></div><div class="qa-f"><h3>${esc(L(p.name))}</h3><p class="price-l" id="qaPrice">${SHOP.priceHTML(p, Dz)}</p>${fieldsHTML()}<a class="link qa-more" href="#/p/${esc(p.id)}?d=${PDP.encode(Dz)}">${ic('wand')} ${t('v5_more_opts')}</a></div></div>`;
      ov.foot.innerHTML = `<button class="btn ghost" data-qa="box">${ic('box')} ${t('v5_add_box')}</button><button class="btn" data-qa="add">${ic('bag')} ${t('add_cart')}</button>`;
      draw();
    };
    const draw = C.debounce(async () => { const cv = $('#qaCv', ov); if (!cv) return; const w = Math.min(900, Math.round((cv.parentElement.clientWidth || 400) * Math.min(2, devicePixelRatio || 1))); await ENG.render(cv, p, ENG.viewFor(p, Dz, vi), Dz, { maxW: w, force: !ENG.isDefault(p, Dz) }); }, 90);
    paint();
    ENG.neededFonts(p, Dz).forEach(ENG.loadFont);
    for (const f of p.fields) for (const fid of (f.fonts || []).slice(0, 8)) ENG.loadFont(fid).then(() => { const bt = $(`[data-qfont="${f.id}"][data-val="${fid}"]`, ov); if (bt) bt.style.fontFamily = `'${ENG.fam(fid)}'`; });
    const pageOf = fid => { const r = zonesFor(p, fid); return r.length ? r[0].vi : 0; };
    ov.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.qfield) { const f = ENG.fieldById(p, el.dataset.qfield); let v = el.value; if (f.max && v.length > f.max) v = v.slice(0, f.max); Dz.f[f.id] = v; Dz._touched = true; vi = pageOf(f.id); el.closest('.fld').classList.remove('bad'); const er = el.closest('.fld').querySelector('.ferr'); if (er) er.remove(); if (ENG.isAr(v)) ENG.fontsFor(ENG.fontFor(p, { f: f.id }, Dz), v).forEach(ENG.loadFont); draw(); }
    });
    ov.addEventListener('change', async e => {
      const el = e.target;
      if (el.tagName === 'SELECT' && el.dataset.qfield) { Dz.f[el.dataset.qfield] = el.value; draw(); return; }
      if (!el.dataset.qphoto) return;
      const f = ENG.fieldById(p, el.dataset.qphoto); const file = el.files && el.files[0]; el.value = ''; if (!file) return;
      C.toast(t('photo_loading'));
      try { const r = await ST.readImage(file, 2000, f.fx && f.fx.includes('ink')); const pid = await ST.photoPut(r.blob); Dz.ph[f.id] = { src: pid, crop: { x: 0, y: 0, s: 1, r: 0 }, fx: (f.fx || [])[0] || 'none', w: r.w, h: r.h }; Dz._touched = true; vi = pageOf(f.id); paint(); C.toast(t('photo_ok')); }
      catch (er) { C.toast(t('photo_err'), 'err'); }
    });
    ov.addEventListener('click', async e => {
      const b = e.target.closest('[data-qopt],[data-qfont],[data-qcol],[data-qa]'); if (!b) return;
      if (b.dataset.qopt) { Dz.opt[b.dataset.qopt] = b.dataset.val; Dz._touched = true; const k = p.views.findIndex(w => w.when && w.when.opt === b.dataset.qopt && w.when.eq === b.dataset.val); if (k >= 0) vi = k; paint(); return; }
      if (b.dataset.qfont) { Dz.font[b.dataset.qfont] = b.dataset.val; Dz._touched = true; ENG.loadFont(b.dataset.val).then(draw); $$(`[data-qfont="${b.dataset.qfont}"]`, ov).forEach(x => x.setAttribute('aria-checked', String(x === b))); vi = pageOf(b.dataset.qfont); return; }
      if (b.dataset.qcol) { Dz.color[b.dataset.qcol] = b.dataset.val; Dz._touched = true; $$(`[data-qcol="${b.dataset.qcol}"]`, ov).forEach(x => x.setAttribute('aria-checked', String(x === b))); draw(); return; }
      const bad = invalid(p, Dz);
      if (bad) { const el = $(`[data-qf="${bad.f.id}"]`, ov); if (el) { el.classList.add('bad'); if (!el.querySelector('.ferr')) el.insertAdjacentHTML('beforeend', `<small class="ferr">${ic('alert')} ${esc(bad.msg)}</small>`); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } C.toast(bad.msg, 'err'); return; }
      b.disabled = true;
      if (b.dataset.qa === 'add') { await V.addToCart(p, Dz, 1); return; }
      if (b.dataset.qa === 'box') { C.closeAll(); V.toBox(p, Dz, 1); }
    });
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act=qadd],[data-act=addbox],[data-v5]'); if (!b) return;
    if (b.dataset.act === 'qadd') { e.preventDefault(); V.quickAdd(b.dataset.id); return; }
    if (b.dataset.act === 'addbox') { e.preventDefault(); const cur = PDP.current(); if (!cur) return; const bad = invalid(cur.p, cur.D); if (bad) { C.toast(bad.msg, 'err'); const el = $(`[data-fid="${bad.f.id}"]`) || $('#cfg'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); return; } V.toBox(cur.p, cur.D, cur.qty); return; }
    const k = b.dataset.v5;
    if (k === 'nav') { const ni = b.closest('.ni'); const open = !ni.classList.contains('open'); $$('.hd-nav .ni.open').forEach(x => x.classList.remove('open')); ni.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); return; }
    if (k === 'hsugg') { const i = $('#hq'); if (i) { i.value = b.dataset.v; i.focus(); drawSearch(); } return; }
    if (k === 'loc') { if (e.target.closest('a')) return; V.showLoc(b); return; }
    if (k === 'boxgo') { C.go('#/box'); return; }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.v5 === 'loc') { e.preventDefault(); V.showLoc(e.target); } });

  /* ---------------- put a (personalised) product into the gift box ---------------- */
  V.toBox = function (p, Dz, qty) {
    const st = ST.get('boxDraft', null) || { step: 2, box: 'zebra', size: 'm', fill: 'shred', ribbon: 'rosa', items: [], extras: {}, card: { on: true, design: 'roses', text: '', from: '', font: 'greatvibes' }, editId: null };
    const n = (st.items || []).reduce((a, i) => a + i.qty, 0) + (qty || 1);
    const caps = { s: 3, m: 5, l: 8 };
    if (n > 8) { C.toast(t('v5_box_full'), 'err'); return; }
    if (n > caps[st.size || 'm']) st.size = n > 5 ? 'l' : 'm';
    const design = JSON.parse(JSON.stringify(Dz)); delete design._touched;
    st.items = (st.items || []).concat([{ uid: ST.uid('b'), pid: p.id, D: design, qty: qty || 1 }]);
    if (window.BOX && BOX.useState) BOX.useState(st); else ST.set('boxDraft', st);
    const ov = C.sheet({ title: t('box_added'), kind: 'modal' });
    ov.body.innerHTML = `<p>${esc(t('v5_box_added', { n }))}</p>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">${t('continue_shopping')}</button><button class="btn" data-v5="boxgo">${ic('box')} ${t('v5_box_go')}</button>`;
  };

  /* ---------------- product page extras: add to box, review summary ---------------- */
  V.revSummary = function (list) {
    if (!list.length) return '';
    const a = list.reduce((s, r) => s + r.stars, 0) / list.length;
    return `<div class="rv-sum"><div class="rv-avg"><b>${a.toFixed(1)}</b><span class="pstars">${'★'.repeat(Math.round(a))}${'☆'.repeat(5 - Math.round(a))}</span><small class="muted">${t('v5_reviews_n', { n: list.length })}</small></div><div class="rv-bars">${[5, 4, 3, 2, 1].map(s => { const k = list.filter(r => r.stars === s).length; return `<div><span>${s} ★</span><i><span style="width:${Math.round(k / list.length * 100)}%"></span></i><span>${k}</span></div>`; }).join('')}</div></div>`;
  };
  const _show = PDP.show; PDP.show = function (id, q) {
    _show.apply(this, arguments);
    const cur = PDP.current(); if (!cur) return;
    const br = $('.buyrow'); if (br && cur.p.id !== 'gutschein') br.insertAdjacentHTML('afterend', `<button type="button" class="btn ghost block box-add" data-act="addbox">${ic('box')} ${t('v5_add_box')}</button>`);
    const rv = $('#reviews'); if (rv) { const list = ST.reviews(cur.p.id).filter(r => r.ok); const sm = rv.querySelector('summary'); if (sm && list.length) sm.insertAdjacentHTML('afterend', V.revSummary(list)); }
  };

  /* ---------------- shop locations (map) ---------------- */
  const locAddr = l => [l.name, l.street, (l.zip || '') + ' ' + (l.city || '')].filter(x => String(x).trim()).join(', ');
  const mapUrl = l => `https://maps.google.com/maps?q=${encodeURIComponent([l.street, (l.zip || '') + ' ' + (l.city || '')].join(', '))}&hl=${C.lang()}&z=15&output=embed`;
  V.locs = () => SITE.get().locations.filter(l => l && (l.street || l.name));
  V.locsHTML = function () {
    const ls = V.locs(); if (!ls.length) return '';
    return `<div class="locs"><div class="loc-list">${ls.map((l, i) => `<div class="loc" data-v5="loc" data-i="${i}" role="button" tabindex="0" aria-pressed="${i === 0}"><i>${V.ic('store')}</i><b>${esc(l.name || 'Adam & Neuetalia')}</b><span>${esc(l.street)}, ${esc(l.zip)} ${esc(l.city)}</span><small>${V.hrs(L(l.hours))}</small>
      <div class="vbtns">${l.phone ? `<a class="btn ghost sm" href="tel:${esc(String(l.phone).replace(/\s/g, ''))}">${ic('phone')} ${t('v5_call')}</a>` : ''}<a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locAddr(l))}">${ic('route')} ${t('route')}</a></div></div>`).join('')}</div>
      <div class="loc-map"><iframe title="${esc(t('v5_map'))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(mapUrl(ls[0]))}"></iframe></div></div>`;
  };
  V.showLoc = function (el) { const ls = V.locs(); const l = ls[+el.dataset.i]; if (!l) return; $$('.loc').forEach(x => x.setAttribute('aria-pressed', String(x === el))); const f = $('.loc-map iframe'); if (f) f.src = mapUrl(l); };
  V.locPage = function () {
    SHOP.page(`<div class="wrap lhead"><h1>${t('v5_branches_h')}</h1><p class="lead">${t('v5_branches_p')}</p></div><div class="wrap">${V.locsHTML()}</div>`, 'locs');
  };
  C.route(/^\/filialen\/?$/, () => { C.applyLang(); if (window.BOX) BOX.leave(); PDP.clear(); V.locPage(); });

  /* ---------------- footer: logo, all shops, real social icons, calm payment chips ---------------- */
  SHOP.footer = function () {
    const s = ST.settings(); const c = SITE.get(); const ls = V.locs();
    const pm = s.payments || {}, sh = s.shipping || {}; const ar = C.lang() === 'ar', en = C.lang() === 'en';
    const logos = [pm.paypal && 'PayPal', pm.card && 'VISA', pm.card && 'Mastercard', pm.card && 'Amex', pm.klarna && 'Klarna', pm.applepay && 'Apple Pay', pm.vorkasse && (ar ? 'تحويل مسبق' : en ? 'Bank transfer' : 'Vorkasse'), pm.cash && (ar ? 'نقداً في المحل' : en ? 'Cash in store' : 'Bar im Laden'), ((sh.dhl || {}).on || (sh.eu || {}).on) && 'DHL', (sh.local || {}).on && (ar ? 'توصيل في هامبورغ' : en ? 'Hamburg courier' : 'Kurier Hamburg'), (sh.pickup || {}).on && (ar ? 'استلام من المحل' : en ? 'Store pickup' : 'Abholung')].filter(Boolean);
    const soc = [['ig', c.social.ig, 'Instagram'], ['tt', c.social.tt, 'TikTok'], ['fb', c.social.fb, 'Facebook'], ['wa', 'https://wa.me/' + s.shop.wa, 'WhatsApp']].filter(x => x[1]);
    return `<footer class="ft">
      <div class="wrap ft-main">
        <div class="ft-brand">${V.logo()}<p>${esc(SITE.tx('ft_about'))}</p><div class="ft-soc" style="margin-top:14px">${soc.map(([k, u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${l}" style="background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)">${V.ic(k)}</a>`).join('')}</div></div>
        <div><h3>${t('ft_links')}</h3><div class="ft-links">
          <a href="#/c/alle">${t('nav_ready')}</a><a href="#/box">${t('nav_box')}</a><a href="#/anlass">${t('nav_occ')}</a><a href="#/gutschein">${t('nav_gift')}</a>
          <a href="#/verfolgen">${t('track_title')}</a><a href="#/hilfe">${t('nav_help')}</a><a href="#/hilfe/rueckgabe">${t('ft_returns')}</a><a href="#/hilfe/versand">${t('help_ship')}</a>
          <a href="#/konto">${t('account')}</a><a href="#/filialen">${t('v5_branches')}</a></div>
          <h3 style="margin-top:22px">${t('ft_paydeliv')}</h3><div class="ft-logos">${logos.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>
        <div class="ft-visit"><h3>${t('v5_branches')}</h3>${ls.map(l => `<p><b>${esc(l.name || s.shop.name)}</b><br>${esc(l.street)}, ${esc(l.zip)} ${esc(l.city)}<br><small>${V.hrs(L(l.hours))}</small></p>`).join('')}<p><a href="tel:${esc(s.shop.phone.replace(/\s/g, ''))}"><bdi dir="ltr">${esc(s.shop.phone)}</bdi></a> · <a href="mailto:${esc(s.shop.email)}">${esc(s.shop.email)}</a></p>
          <div class="vbtns" style="margin-top:12px"><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(s.shop.wa)}">${V.ic('wa')} WhatsApp</a><a class="btn ghost sm" href="#/filialen">${ic('pin')} ${t('v5_map')}</a></div></div>
      </div>
      <div class="ft-bar"><div class="wrap"><span>${esc(s.shop.name)} · ${esc(ls[0] ? ls[0].street + ' · ' + ls[0].zip + ' ' + ls[0].city : '')}</span><span class="ft-soc">${soc.map(([k, u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${l}">${V.ic(k)}</a>`).join('')}</span><span>${ic('mail')} ${esc(s.shop.email)}</span></div></div>
      <div class="wrap ft-legal"><a href="#/rechtliches/impressum">${t('imprint')}</a><a href="#/rechtliches/datenschutz">${t('privacy')}</a><a href="#/rechtliches/agb">${t('terms')}</a><a href="#/rechtliches/widerruf">${t('withdrawal')}</a><a href="#/rechtliches/versand">${t('ship_pay')}</a><button data-act="cookies">${t('cookie_settings')}</button><a href="admin.html">${t('admin_area')}</a><span style="margin-inline-start:auto">© ${new Date().getFullYear()} ${esc(s.shop.name)}</span></div>
    </footer>`;
  };

  /* ---------------- home page, built from the website settings ---------------- */
  const HOME_IMG = { her: 'rosenbox-herz', him: 'np-tasse-fussball', promo: 'geschenkbox-liebe', kids: 'np-tasse-emoji', all: 'np-kissen-satin' };
  const TILE_DEF = { her: ['who_her', '#/o/fuersie'], him: ['who_him', '#/o/fuerihn'], kids: ['who_kids', '#/o/kinder'], all: ['who_all', '#/c/alle'], promo: ['tile_gifts', '#/c/alle'], custom: ['tile_custom', '#/box'] };
  const tl = (o, key) => (o && (o[C.lang()] || o.de)) || t(key);
  V.homeBlocks = function () {
    const S = SHOP; const cfg = SITE.get(); const s = ST.settings();
    const all = ST.products();
    const best = all.filter(p => p.best).concat(all.filter(p => !p.best)).slice(0, 12);
    const fresh = all.filter(p => p.np && ST.minPrice(p) >= 20).reverse().sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)).slice(0, 8);
    const camp = S.campaign();
    const occs = ['liebe', 'muttertag', 'hochzeit', 'geburtstag', 'familie', 'ramadan'];
    const used = new Set(); const occImg = o => { const list = all.filter(p => (p.occ || []).includes(o)).sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)); const p = list.find(p => !used.has(p.views[0].img)) || list[0]; if (!p) return ''; used.add(p.views[0].img); return p.views[0].thumb || p.views[0].img; };
    const pimg = id => { const p = ST.product(id); return p ? (p.views[0].thumb || p.views[0].img) : ''; };
    const tile = k => { const x = cfg.tiles[k] || {}; return x.img ? V.src(x.img) : `src="${esc(k === 'custom' ? 'img/o/box-hero.jpg' : pimg(HOME_IMG[k]))}"`; };
    const wall = ['rosenbox-herz', 'flasche', 'hoodie-name', 'rosen-acrylbox'].map(id => ST.product(id)).filter(p => p && p.active);
    const revs = ST.reviews().filter(r => r.ok && r.text);
    const car = ['np-kissen-herz', 'rosenbox-herz', 'np-songtasse', 'geschenkbox-liebe', 'np-kette-herz', 'rose-glas', 'np-uhr-herz', 'collage-box'].map(id => ST.product(id)).filter(Boolean);
    const occOpts = CAT_EXTRA.occ.filter(o => !['fuersie', 'fuerihn', 'kinder'].includes(o));
    const tp = cfg.tiles;
    const B = {
      hero: () => `<section class="hm"><div class="wrap hm-grid">
        <form class="finder rv" data-form="finder">
          <h2>${ic('sparkle')} ${esc(SITE.tx('finder_h'))}</h2>
          <label class="vh" for="fdOcc">${t('finder_occ')}</label><select class="in" id="fdOcc" name="occ"><option value="">${t('finder_occ')}</option>${occOpts.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select>
          <label class="vh" for="fdWho">${t('finder_who')}</label><select class="in" id="fdWho" name="who"><option value="">${t('finder_who')}</option><option value="fuersie">${t('who_her')}</option><option value="fuerihn">${t('who_him')}</option><option value="kinder">${t('who_kids')}</option></select>
          <label class="fd-bud"><span class="vh">${t('finder_budget')}</span><input class="in" id="fdMax" name="max" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('finder_budget_ph'))}"><b>€</b></label>
          <button class="btn">${ic('search')} ${t('finder_go')}</button>
          <p class="finder-pop">${t('finder_pop')}</p>
          <nav class="chips finder-chips">${['geburtstag', 'liebe', 'hochzeit', 'muttertag', 'ramadan', 'kinder'].map(o => `<a href="#/o/${o}">${t('occ_' + o)}</a>`).join('')}</nav>
          <a class="finder-box" href="#/box"><img src="img/o/box-hero.jpg" alt="" loading="lazy" width="120" height="103"><span><b>${t('nav_box')}</b><small>${t('tile_custom_p')}</small></span>${ic('chev', 'flip')}</a>
        </form>
        <a class="tile t-her rv" data-i="1" href="${esc(tp.her.link || TILE_DEF.her[1])}"><img ${tile('her')} alt="" loading="eager"><b>${esc(tl(tp.her.t, 'who_her'))}</b></a>
        <a class="tile t-him rv" data-i="2" href="${esc(tp.him.link || TILE_DEF.him[1])}"><img ${tile('him')} alt="" loading="eager"><b>${esc(tl(tp.him.t, 'who_him'))}</b></a>
        <a class="tile promo rv" href="${esc(tp.promo.link || TILE_DEF.promo[1])}"><img ${tile('promo')} alt=""><span class="tx"><small>${esc(tl(tp.promo.e, 'v5_popular'))}</small><strong>${esc(tl(tp.promo.t, 'tile_gifts'))}</strong><p>${esc(tl(tp.promo.p, 'tile_gifts_p'))}</p><span class="btn sm">${t('shop_now')}</span></span></a>
        <a class="tile t-kids rv" data-i="1" href="${esc(tp.kids.link || TILE_DEF.kids[1])}"><img ${tile('kids')} alt="" loading="lazy"><b>${esc(tl(tp.kids.t, 'who_kids'))}</b></a>
        <a class="tile t-all rv" data-i="2" href="${esc(tp.all.link || TILE_DEF.all[1])}"><img ${tile('all')} alt="" loading="lazy"><b>${esc(tl(tp.all.t, 'who_all'))}</b></a>
        <a class="tile custom rv" href="${esc(tp.custom.link || TILE_DEF.custom[1])}"><img ${tile('custom')} alt="" loading="lazy"><span class="tx"><strong>${esc(tl(tp.custom.t, 'tile_custom'))}</strong><span class="muted small">${esc(tl(tp.custom.p, 'tile_custom_p'))}</span><span class="btn sm">${ic('box')} ${t('nav_box')}</span></span></a>
      </div></section>`,
      cats: () => `<section class="sec cats-sec"><div class="wrap">
        <div class="sh rv"><h2 class="ttl">${esc(SITE.tx('cats_h'))}</h2><a class="more hide-s" href="#/c/alle">${t('see_all')}</a></div>
        <div class="rail">${CATS().map(c => `<a class="circ" href="#/c/${c}"><span class="ph"><img src="${esc(S.catImg(c))}" alt="" loading="lazy"></span><b>${t('cat_' + c)}</b></a>`).join('')}<a class="circ" href="#/gutschein"><span class="ph"><img src="${S.giftcardImg()}" alt="" loading="lazy"></span><b>${t('nav_gift')}</b></a></div></div></section>`,
      best: () => `<section class="sec"><div class="wrap"><div class="sh rv"><h2 class="ttl">${esc(SITE.tx('best_h'))}</h2><a class="more" href="#/c/alle">${t('see_all')}</a></div><div class="prail">${best.map(p => S.card(p)).join('')}</div></div></section>`,
      wall: () => wall.length ? `<section class="wall" style="margin-top:clamp(48px,6vw,84px)"><div class="wrap">
        <div class="sh"><div><span class="eyb">${t('wall_eyb')}</span><h2>${esc(SITE.tx('wall_h'))}</h2></div></div>
        <p class="lead">${esc(SITE.tx('wall_p'))}</p>
        <div class="wall-try"><div class="hx-row"><input id="wallName" maxlength="12" autocomplete="off" placeholder="${esc(t('hero_ph'))}"></div></div>
        <div class="wall-grid">${wall.map((p, i) => `<a href="#/p/${esc(p.id)}" data-wall="${i}"><canvas data-wcv="${i}"></canvas><span><b>${esc(L(p.name))}</b>${S.priceHTML(p)}</span></a>`).join('')}</div></div></section>` : '',
      new: () => fresh.length ? `<section class="sec"><div class="wrap"><div class="sh rv"><h2 class="ttl">${esc(SITE.tx('new_h'))}</h2><a class="more" href="#/c/alle">${t('see_all')}</a></div><div class="prail">${fresh.map(p => S.card(p)).join('')}</div></div></section>` : '',
      feats: () => `<section class="sec"><div class="wrap feats">${[['truck', 1], ['wand', 2], ['heart', 3], ['chat', 4]].map(([i, n], k) => `<div class="feat rv" data-i="${k}"><i>${ic(i)}</i><b>${esc(SITE.tx('feat' + n))}</b><small>${esc(SITE.tx('feat' + n + 'd'))}</small></div>`).join('')}</div></section>`,
      occ: () => `<section class="sec"><div class="wrap"><div class="sh rv"><h2 class="ttl">${esc(SITE.tx('occ_h'))}</h2><a class="more" href="#/anlass">${t('see_all')}</a></div>
        <div class="occ2">${occs.map(o => `<a href="#/o/${o}" class="rv"><img src="${esc(occImg(o))}" alt="" loading="lazy"><b>${t('occ_' + o)}<small>${t('n_products', { n: all.filter(p => (p.occ || []).includes(o)).length })}</small></b></a>`).join('')}</div></div></section>`,
      about: () => `<section class="sec"><div class="wrap team rv"><h2>${esc(SITE.tx('team_h'))}</h2>${[1, 2, 3, 4].map(n => `<h3>${esc(SITE.tx('team_h' + n))}</h3><p>${esc(SITE.tx('team_p' + n))}</p>`).join('')}</div></section>`,
      carousel: () => car.length ? `<section class="sec" style="padding-top:clamp(24px,3vw,40px)"><div class="carou"><button class="carou-nav prev" data-act="carou" data-d="-1" aria-label="‹">${ic('back')}</button><div class="carou-track" id="carou">${car.map(p => `<a href="#/p/${esc(p.id)}" aria-label="${esc(L(p.name))}"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" loading="lazy"></a>`).join('')}</div><button class="carou-nav next" data-act="carou" data-d="1" aria-label="›">${ic('chev')}</button></div></section>` : '',
      reviews: () => revs.length ? `<section class="sec"><div class="wrap"><div class="sh rv"><h2 class="ttl">${t('v5_reviews_h')}</h2></div>${V.revSummary(revs)}<div class="revs">${revs.slice(0, 6).map(r => { const p = ST.product(r.pid); return `<article class="revc"><header><span class="av">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</span><span><b>${esc(r.name)}</b><br><span class="pstars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></span></header><p>${esc(r.text)}</p>${p ? `<a class="link small" href="#/p/${esc(p.id)}">${esc(L(p.name))}</a>` : ''}</article>`; }).join('')}</div></div></section>` : '',
      camp: () => camp ? `<section class="split blush rev" style="margin-top:clamp(48px,6vw,84px)"><div class="sp-img"><img src="${esc(occImg('liebe'))}" alt="" loading="lazy"></div><div class="sp-txt rv"><span class="eyb">${t('camp_eyb')}</span><h2>${esc(camp.title)}</h2><p class="lead">${esc(camp.text)}</p><div><a class="btn" href="${camp.href}">${esc(camp.cta)}</a></div></div></section>` : '',
      gift: () => `<section class="split dark" style="margin-top:14px"><div class="sp-img"><div class="gc-card"><img src="${S.giftcardImg()}" alt="" loading="lazy"></div></div><div class="sp-txt rv"><span class="eyb">${t('nav_gift')}</span><h2>${esc(SITE.tx('gc_h'))}</h2><p class="lead">${esc(SITE.tx('gc_p'))}</p><div><a class="btn" href="#/gutschein">${t('gc_cta')}</a></div></div></section>`,
      locs: () => V.locs().length ? `<section class="sec"><div class="wrap"><div class="sh rv"><h2 class="ttl">${t('v5_branches_h')}</h2><a class="more" href="#/filialen">${t('v5_branches')}</a></div>${V.locsHTML()}</div></section>` : '',
      faq: () => `<section class="sec faq-sec"><div class="wrap narrow"><div class="sh rv"><h2 class="ttl">${t('faq_h')}</h2><a class="more" href="#/hilfe">${t('faq_more')}</a></div>
        <div class="faq">${['ship', 'pickup', 'spotify', 'box', 'proof', 'arabic', 'photo', 'pay', 'returns', 'custom'].map(q => `<details><summary>${t('faq_' + q)}</summary><p>${t('faqa_' + q, { cut: s.cutoff, free: eur(s.freeFrom), local: eur(s.shipping.local.price), dhl: eur(s.shipping.dhl.price), eu: eur(s.shipping.eu.price), min: s.cancelMinutes })}</p></details>`).join('')}</div></div></section>`,
      news: () => `<section class="sec"><div class="wrap"><div class="news rv"><h2>${esc(SITE.tx('news_h'))}</h2><p>${esc(SITE.tx('news_p'))}</p><form data-form="news"><input class="in" type="email" name="email" required placeholder="${esc(t('email'))}" aria-label="${esc(t('email'))}"><button class="btn">${t('news_btn')}</button></form></div></div></section>`
    };
    B.mosaic = B.hero; delete B.hero;
    return B;
  };

  /* ---------------- calm form validation with a message under each field ---------------- */
  const EM = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  V.markForms = function () { $$('form').forEach(f => { f.noValidate = true; }); };
  function fieldErr(el) {
    const v = (el.value || '').trim();
    if (el.type === 'checkbox') return el.required && !el.checked ? t('v5_v_req') : '';
    if (el.required && !v) return el.type === 'email' ? t('v5_v_email') : t('v5_v_req');
    if (v && el.type === 'email' && !EM.test(v)) return t('v5_v_email');
    const mn = +el.getAttribute('minlength'); if (v && mn && v.length < mn) return t('v5_v_min', { n: mn });
    return '';
  }
  function showErr(el, msg) {
    const box = el.closest('.fld,.check') || el.parentElement; if (!box) return;
    box.classList.toggle('bad', !!msg);
    let m = box.querySelector(':scope > .ferr');
    if (!msg) { if (m) m.remove(); return; }
    if (!m) { box.insertAdjacentHTML('beforeend', `<small class="ferr" role="alert">${ic('alert')} <span></span></small>`); m = box.querySelector(':scope > .ferr'); }
    m.querySelector('span').textContent = msg;
  }
  V.showErr = showErr;
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.matches || f.dataset.v5) return;
    const bad = []; for (const el of f.elements) { if (!el.name && !el.id) continue; if (!el.willValidate && el.type !== 'checkbox') continue; const m = fieldErr(el); showErr(el, m); if (m) bad.push(el); }
    if (bad.length) { e.preventDefault(); e.stopImmediatePropagation(); bad[0].focus({ preventScroll: true }); bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, true);
  document.addEventListener('input', e => { const el = e.target; const box = el.closest && el.closest('.fld.bad,.check.bad'); if (!box) return; if (el.dataset.co || !fieldErr(el)) showErr(el, ''); });
  document.addEventListener('change', e => { const el = e.target; if (el.type === 'checkbox' && el.closest('.check.bad') && el.checked) showErr(el, ''); });
  new MutationObserver(() => V.markForms()).observe(document.body, { childList: true, subtree: false });

  /* ---------------- checkout: steps, error messages, pickup shop, PayPal ---------------- */
  let pickStore = 0;
  const _co = CHECKOUT.checkout; CHECKOUT.checkout = function () {
    _co.apply(this, arguments);
    const h1 = $('.co-main h1'); if (h1) h1.insertAdjacentHTML('afterend', `<ol class="co-steps"><li><i>${ic('check')}</i>${t('v5_co_s1')}</li><li class="on"><i>2</i>${t('v5_co_s2')}</li><li><i>3</i>${t('v5_co_s3')}</li><li><i>4</i>${t('v5_co_s4')}</li></ol>`);
    const ls = V.locs(); const pb = $('.pickbox');
    if (pb && ls.length > 1) { if (pickStore >= ls.length) pickStore = 0; pb.outerHTML = `<div class="fld"><span class="lb">${t('v5_pick_store')}</span><div class="mopts">${ls.map((l, i) => `<label class="mopt"><input type="radio" name="v5store" value="${i}"${i === pickStore ? ' checked' : ''}><span class="mi">${V.ic('store')}</span><span class="mt"><b>${esc(l.name)}</b><small>${esc(l.street)}, ${esc(l.zip)} ${esc(l.city)} · ${V.hrs(L(l.hours))}</small></span><em>${t('free')}</em></label>`).join('')}</div></div>`; }
    const pays = $('.pays'); if (pays) pays.insertAdjacentHTML('afterend', `<p class="hint">${V.ic('lock')} ${t('secure_note')}</p>`);
  };
  document.addEventListener('change', e => { if (e.target.name === 'v5store') pickStore = +e.target.value; });
  const _po = ST.placeOrder; ST.placeOrder = function (d) {
    const r = _po.apply(this, arguments);
    if (r && r.o && d.method === 'pickup') { const l = V.locs()[pickStore] || V.locs()[0]; if (l) ST.updateOrder(r.o.no, o => { o.ship.store = { name: l.name, street: l.street, zip: l.zip, city: l.city }; }); }
    return r;
  };
  const _place = CHECKOUT.place; CHECKOUT.place = async function () {
    const p = _place.apply(this, arguments);
    setTimeout(() => {
      $$('.co .fld.bad, .co .check.bad').forEach(b => { const el = b.querySelector('input,select,textarea'); if (!el) return; showErr(el, el.type === 'checkbox' ? t('v5_v_agb') : el.type === 'email' || el.dataset.co === 'email' ? t('v5_v_email') : el.dataset.co === 'addr.zip' && b.querySelector('.in') && el.value ? t('local_zip_bad') : t('v5_v_req')); });
    }, 0);
    return p;
  };
  const _thx = CHECKOUT.thanks; CHECKOUT.thanks = function (no) {
    _thx.apply(this, arguments); const o = ST.order(no); const w = $('.thanks .when');
    if (o && o.ship && o.ship.store && w) w.querySelector('div').insertAdjacentHTML('beforeend', `<p><b>${esc(o.ship.store.name)}</b> · ${esc(o.ship.store.street)}, ${esc(o.ship.store.zip)} ${esc(o.ship.store.city)}</p>`);
  };
  const _trk = CHECKOUT.track; CHECKOUT.track = function () {
    _trk.apply(this, arguments); const m = /\/verfolgen\/([^?]+)/.exec(C.path()); const o = m && ST.order(decodeURIComponent(m[1]));
    if (o && o.ship && o.ship.store) { const ib = $('.track-d .infobox'); if (ib) ib.querySelector('p').innerHTML = `<b>${esc(o.ship.store.name)}</b><br>${esc(o.ship.store.street)}, ${esc(o.ship.store.zip)} ${esc(o.ship.store.city)}`; }
  };
  /* real PayPal (and cards via PayPal) as soon as the owner enters a PayPal client ID */
  let ppLoad = null;
  function loadPP(id) { if (window.paypal) return Promise.resolve(window.paypal); if (ppLoad) return ppLoad; ppLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(id) + '&currency=EUR&intent=capture&enable-funding=card'; s.onload = () => res(window.paypal); s.onerror = () => { ppLoad = null; rej(new Error('pp')); }; document.head.appendChild(s); }); return ppLoad; }
  const _pay = CHECKOUT.pay; CHECKOUT.pay = function (method, total) {
    const id = String((ST.settings().paypal || {}).clientId || (SITE.get().paypal || {}).clientId || '').trim();
    if (!id || !['paypal', 'card'].includes(method)) return _pay.apply(this, arguments);
    return new Promise(res => {
      const ov = C.sheet({ title: t('v5_pp_title'), kind: 'modal' });
      ov.body.innerHTML = `<div class="paydemo"><p class="paysum">${eur(total)}</p><p class="muted">${t('v5_pp_p')}</p><div id="ppBtns"><span class="spin"></span></div></div>`;
      ov.foot.innerHTML = `<button class="btn ghost" data-act="close">${t('cancel')}</button>`;
      let done = false; const fin = ok => { if (done) return; done = true; C.closeAll(); res(ok); };
      ov.addEventListener('click', e => { if (e.target.closest('[data-act=close]')) fin(false); });
      loadPP(id).then(pp => {
        const box = $('#ppBtns', ov); if (!box) return; box.innerHTML = '';
        pp.Buttons({
          fundingSource: method === 'card' && pp.FUNDING ? pp.FUNDING.CARD : undefined,
          createOrder: (d, a) => a.order.create({ purchase_units: [{ amount: { value: Number(total).toFixed(2), currency_code: 'EUR' }, description: 'Adam & Neuetalia' }] }),
          onApprove: (d, a) => a.order.capture().then(() => fin(true)),
          onCancel: () => { }, onError: () => { C.toast(t('v5_pp_err'), 'err'); }
        }).render(box);
      }).catch(() => { const box = $('#ppBtns', ov); if (box) box.innerHTML = `<p class="warn">${t('v5_pp_err')}</p>`; });
    });
  };

  /* ---------------- admin link goes to its own page ---------------- */
  if (!/admin\.html$/.test(location.pathname)) window.addEventListener('hashchange', () => { if (C.path().startsWith('/admin')) location.replace('admin.html' + location.hash); });
  if (!/admin\.html$/.test(location.pathname) && C.path().startsWith('/admin')) location.replace('admin.html' + location.hash);
})();
/* round 7: Enter in the gift-card balance field checks the balance instead of buying a card */
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'gcCode') { e.preventDefault(); const b = document.querySelector('[data-act="gc-check"]'); if (b) b.click(); } });
/* round 7: if the Spotify code image cannot load (offline / blocked), show a clean placeholder instead of a broken image */
document.addEventListener('error', e => { const im = e.target; if (!im || im.tagName !== 'IMG' || !/scannables\.scdn\.co/.test(im.src || '') || im.dataset.spfb) return; im.dataset.spfb = '1'; im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160"><rect width="640" height="160" rx="16" fill="#000"/><circle cx="80" cy="80" r="44" fill="#1ed760"/><path d="M58 68c16-6 34-5 48 3M60 82c13-4 27-3 38 3M62 95c10-3 20-2 29 2" stroke="#000" stroke-width="7" fill="none" stroke-linecap="round"/>' + Array.from({ length: 23 }, (_, i) => { const h = [20, 50, 34, 80, 60, 28, 90, 46, 70, 30, 84, 56, 40, 92, 24, 66, 50, 78, 36, 58, 88, 42, 26][i]; return `<rect x="${150 + i * 20}" y="${80 - h / 2}" width="10" height="${h}" rx="5" fill="#fff"/>`; }).join('') + '</svg>'); }, true);
