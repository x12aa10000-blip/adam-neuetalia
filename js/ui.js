/* New storefront interface ("Soft Premium"): header, footer, tab bar, product card and home page.
   Loaded after shop.js. It replaces only how things look; prices, stock, cart, orders and the live
   personaliser are still done by ST / ENG / CLOUD. */
(function () {
  'use strict';
  const S = window.SHOP;
  const K = (k, de, en, ar) => { const I = window.I18N; I.de[k] = de; I.en[k] = en; I.ar[k] = ar; };
  K('n_hero_h', 'Dein Name auf dem Geschenk.', 'Your name on the gift.', 'اسمك على الهدية.');
  K('n_hero_p', 'Schreib einen Namen und sieh ihn sofort auf dem echten Geschenk. Wir fertigen es von Hand in Hamburg.', 'Type a name and see it at once on the real gift. We make it by hand in Hamburg.', 'اكتب الاسم وشاهده فوراً على الهدية الحقيقية. نصنعها يدوياً في هامبورغ.');
  K('n_name', 'Dein Name', 'Your name', 'الاسم');
  K('n_name_ph', 'z. B. Christina', 'e.g. Christina', 'مثلاً: ليلى');
  K('n_design', 'Jetzt gestalten', 'Personalise now', 'صمّمها الآن');
  K('n_all', 'Alle Geschenke ansehen', 'Browse all gifts', 'تصفّح كل الهدايا');
  K('n_how', 'So funktioniert’s', 'How it works', 'كيف تطلب');
  K('n_how_h', 'In drei Schritten zum Geschenk', 'Three steps to your gift', 'ثلاث خطوات للهدية');
  K('n_s1', 'Schreiben', 'Write', 'اكتب');
  K('n_s1t', 'Name, Datum oder Foto eingeben. Die Vorschau zeigt das Geschenk, wie es wird.', 'Enter a name, date or photo. The preview shows the gift as it will be.', 'أدخل اسماً أو تاريخاً أو صورة. المعاينة تُظهر الهدية كما ستكون.');
  K('n_s2', 'Wir fertigen', 'We make it', 'نصنعها');
  K('n_s2t', 'Folie, Gravur oder Druck machen wir selbst, in der Werkstatt hinter dem Laden.', 'Foil, engraving or print are done by us, in the workshop behind the shop.', 'الطباعة أو الحفر أو الرقائق نصنعها بأنفسنا في الورشة خلف المحل.');
  K('n_s3', 'Abholen oder liefern', 'Pick up or delivery', 'استلام أو توصيل');
  K('n_s3t', 'Am Steindamm abholen, per Kurier in Hamburg oder mit DHL nach Hause.', 'Pick up at Steindamm, courier in Hamburg or DHL to your door.', 'استلام من شتايندام أو توصيل سريع في هامبورغ أو DHL لباب البيت.');
  K('n_pickup_free', 'Abholung gratis', 'Free pick-up', 'استلام مجاني');
  K('n_live', 'Live-Vorschau', 'Live preview', 'معاينة مباشرة');
  K('n_pay', 'Sicher bezahlen', 'Pay safely', 'دفع آمن');
  K('n_visit_h', 'Besuch uns am Steindamm', 'Visit us at Steindamm', 'زورونا في شتايندام');

  K('n_prices', 'Alle Preise inkl. MwSt.', 'All prices include VAT.', 'كل الأسعار تشمل ضريبة القيمة المضافة.');
  K('n_best', 'Bestseller', 'Bestseller', 'الأكثر مبيعاً');
  K('n_pickup', 'Abholung im Laden', 'Pick-up in the shop', 'استلام من المحل');
  K('n_courier', 'Kurier in Hamburg', 'Courier in Hamburg', 'توصيل سريع في هامبورغ');
  K('n_freeabove', 'Versand frei ab', 'Free shipping from', 'شحن مجاني من'  );
  K('hours_h', 'Öffnungszeiten', 'Opening hours', 'أوقات الدوام');
  K('deliv_h', 'Lieferung', 'Delivery', 'التوصيل');
  const SET = () => ST.settings();
  const logo = () => `<a class="n-mark" href="#/" aria-label="Adam">Adam<i aria-hidden="true"></i></a>`;
  const nameField = p => p && p.fields.find(f => f.type === 'text' && !f.sf);

  /* ---------------- shell ---------------- */
  S.header = function () {
    const n = ST.cartCount(), me = ST.me(), s = SET();
    const mins = ST.minutesToCutoff();
    const bar = mins > 0 && ST.isWorkday(new Date()) ? t('bar_today', { t: s.cutoff }) : t('bar_pickup');
    const path = C.path();
    const on = h => path.startsWith(h.slice(1)) ? ' aria-current="page"' : '';
    const langs = [['de', 'DE'], ['en', 'EN'], ['ar', 'عربي']].map(([l, x]) => `<button type="button" class="n-lang" data-lang="${l}" lang="${l}" aria-pressed="${l === C.lang()}">${x}</button>`).join('');
    return `<p class="n-strip">${ic('clock')}<span>${esc(bar)}</span></p>
    <header class="n-top"><div class="n-wrap n-top-in">
      <button class="n-ico n-only-s" data-act="menu" aria-label="${esc(t('menu'))}">${ic('menu')}</button>
      ${logo()}
      <nav class="n-links n-hide-s" aria-label="${esc(t('menu'))}"><a href="#/c/alle"${on('#/c/')}>${t('nav_ready')}</a><a href="#/anlass"${on('#/anlass')}>${t('nav_occ')}</a><a href="#/gutschein"${on('#/gutschein')}>${t('nav_gift')}</a><a href="#/hilfe"${on('#/hilfe')}>${t('nav_help')}</a></nav>
      <div class="n-tools">
        <div class="n-langs n-hide-s" role="group" aria-label="Sprache · Language · اللغة">${langs}</div>
        <button class="n-ico" data-act="search" aria-label="${esc(t('search'))}">${ic('search')}</button>
        <a class="n-ico n-hide-s" href="#/wunschliste" aria-label="${esc(t('wishlist'))}">${ic('heart')}</a>
        <a class="n-ico n-hide-s" href="#/konto" aria-label="${esc(me ? t('account') : t('login'))}">${ic('user')}</a>
        <button class="n-ico" data-act="cart" aria-label="${esc(t('cart'))}">${ic('bag')}${n ? `<i class="n-cnt">${n}</i>` : ''}</button>
      </div></div></header>`;
  };
  S.footer = function () {
    const s = SET();
    const langs = [['de', 'Deutsch'], ['en', 'English'], ['ar', 'العربية']].map(([l, x]) => `<button type="button" class="n-lang" data-lang="${l}" lang="${l}" aria-pressed="${l === C.lang()}">${x}</button>`).join('');
    const col = (h, links) => `<nav aria-label="${esc(h)}"><h3>${esc(h)}</h3>${links.map(([u, k]) => `<a href="${u}">${esc(k)}</a>`).join('')}</nav>`;
    return `<footer class="n-foot"><div class="n-wrap">
      <div class="n-foot-in">
        <div class="n-foot-a">${logo()}<p>${t('ft_about')}</p><div class="n-langs">${langs}</div></div>
        ${col(t('ft_links'), [['#/c/alle', t('nav_ready')], ['#/anlass', t('nav_occ')], ['#/gutschein', t('nav_gift')], ['#/verfolgen', t('track_title')], ['#/konto', t('account')], ['#/wunschliste', t('wishlist')]])}
        ${col(t('nav_help'), [['#/hilfe', t('nav_help')], ['#/hilfe/versand', t('help_ship')], ['#/hilfe/rueckgabe', t('ft_returns')]])}
        <div><h3>${t('ft_visit')}</h3><p>${esc(s.shop.name)}<br>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}</p><p>${t('mon_sat')} <bdi dir="ltr">${esc(s.hours.wd)}</bdi><br>${t('sunday')} <bdi dir="ltr">${esc(s.hours.sun)}</bdi></p>
          <p class="n-row"><a class="n-btn n-sm n-tq" target="_blank" rel="noopener noreferrer" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')} WhatsApp</a></p></div>
      </div>
      <p class="n-foot-legal"><a href="#/rechtliches/impressum">${t('imprint')}</a><a href="#/rechtliches/datenschutz">${t('privacy')}</a><a href="#/rechtliches/agb">${t('terms')}</a><a href="#/rechtliches/widerruf">${t('withdrawal')}</a><a href="#/rechtliches/versand">${t('ship_pay')}</a><button type="button" data-act="cookies">${t('cookie_settings')}</button></p>
      <p class="n-foot-z"><span>${esc(s.shop.name)} · ${esc(s.shop.street)} · ${esc(s.shop.zip)} ${esc(s.shop.city)}</span><span>${t('n_prices')}</span></p>
    </div></footer>`;
  };
  const tabIdx = () => { const p = C.path(); return p === '/' ? 0 : p.startsWith('/wunschliste') ? 3 : -1; };
  S.tabbar = function () {
    const n = ST.cartCount(), i = tabIdx(), prev = S._ti == null ? Math.max(i, 0) : S._ti;
    const cur = k => (k === 'home' ? i === 0 : k === 'wish' ? i === 3 : false) ? ' class="on"' : '';
    return `<nav class="n-tabs" aria-label="${esc(t('menu'))}" style="--i:${prev};--o:${S._ti == null ? (i < 0 ? 0 : 1) : 1}">
      <a href="#/"${cur('home')}>${ic('home')}<span>${t('tab_home')}</span></a>
      <button type="button" data-act="menu">${ic('grid')}<span>${t('tab_cats')}</span></button>
      <button type="button" data-act="search">${ic('search')}<span>${t('search')}</span></button>
      <a href="#/wunschliste"${cur('wish')}>${ic('heart')}<span>${t('wishlist')}</span></a>
      <button type="button" data-act="cart">${ic('bag')}<span>${t('cart')}</span>${n ? `<i class="n-cnt">${n}</i>` : ''}</button></nav>`;
  };
  /* slide the pill from where it was to where the current page is */
  S.tabsSync = function () {
    const nav = $('nav.n-tabs'); if (!nav) return; const i = tabIdx();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (i < 0) { nav.style.setProperty('--o', '0'); return; }
      nav.style.setProperty('--o', '1'); nav.style.setProperty('--i', String(i)); S._ti = i;
    }));
  };
  const after0 = S.after; S.after = function () { const r = after0.apply(this, arguments); S.tabsSync(); return r; };
  /* a tap on a tab slides the pill there at once, then it returns to the current page */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.n-tabs > a, .n-tabs > button'); if (!b) return;
    const nav = b.parentNode, k = [...nav.children].indexOf(b); nav.style.setProperty('--o', '1'); nav.style.setProperty('--i', String(k));
    if (b.tagName === 'BUTTON') setTimeout(() => { const n2 = $('nav.n-tabs'); if (n2) { const i = tabIdx(); n2.style.setProperty('--i', String(i < 0 ? (S._ti || 0) : i)); if (i < 0) n2.style.setProperty('--o', '0'); } }, 520);
  }, { passive: true });
  /* hide the floating assistant button while scrolling */
  let sct = 0; window.addEventListener('scroll', () => { document.body.classList.add('n-scrolling'); clearTimeout(sct); sct = setTimeout(() => document.body.classList.remove('n-scrolling'), 650); }, { passive: true });
  S.refreshHeader = function () {
    const swap = (sel, html, pick) => { const el = $(sel); if (!el) return; const d = document.createElement('div'); d.innerHTML = html; const nw = d.querySelector(pick); if (nw) el.replaceWith(nw); };
    swap('header.n-top', S.header(), 'header.n-top');
    { const nav = $('nav.n-tabs'); if (nav) { const d = document.createElement('div'); d.innerHTML = S.tabbar(); const nw = d.querySelector('nav.n-tabs'); if (nw) { const i = nav.style.getPropertyValue('--i'), o = nav.style.getPropertyValue('--o'); nav.innerHTML = nw.innerHTML; nav.style.setProperty('--i', i); nav.style.setProperty('--o', o); } } }
  };

  /* ---------------- product card ---------------- */
  S.card = function (p) {
    const wished = ST.wishlist().includes(p.id), v = p.views[0];
    const sale = ST.onSale(p);
    const badge = p.stock <= 0 ? `<span class="n-badge n-out">${t('sold_out')}</span>` : sale ? `<span class="n-badge n-sale">−${Math.round((1 - p.salePrice / p.price) * 100)} %</span>` : p.best ? `<span class="n-badge">${t('n_best')}</span>` : '';
    return `<article class="n-card">
      <a class="n-card-img" href="#/p/${esc(p.id)}" aria-label="${esc(L(p.name))}"><img src="${esc(v.thumb || v.img)}" alt="" loading="lazy" width="560" height="700">${badge}</a>
      <button class="n-fav${wished ? ' on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wished}" aria-label="${esc(t('wishlist'))}">${ic('heart')}</button>
      <div class="n-card-b"><a class="n-card-n" href="#/p/${esc(p.id)}">${esc(L(p.name))}</a>${S.starsOf(p) || ''}
        <p class="n-card-f">${S.priceHTML(p)}<a class="n-go" href="#/p/${esc(p.id)}">${t('n_design')}</a></p></div>
    </article>`;
  };
  S.grid = list => `<div class="n-grid">${list.map(p => S.card(p)).join('')}</div>`;

  /* ---------------- home ---------------- */
  let heroName = '';
  S.home = function () {
    const s = SET(), all = ST.products();
    const best = all.filter(p => p.best).concat(all.filter(p => !p.best)).slice(0, 8);
    const fresh = all.filter(p => p.np && ST.minPrice(p) >= 20).reverse().slice(0, 4);
    const hp = ST.product('rosenbox-herz') || all[0];
    const cats = CAT_EXTRA.cats;
    const occs = ['liebe', 'muttertag', 'hochzeit', 'geburtstag', 'familie', 'ramadan', 'weihnachten', 'kinder'].filter(o => all.some(p => (p.occ || []).includes(o)));
    const camp = S.campaign();
    const revs = ST.reviews().filter(r => r.ok && r.text).slice(0, 3);
    const occOpts = CAT_EXTRA.occ.filter(o => !['fuersie', 'fuerihn', 'kinder'].includes(o));
    const row = (k, v) => `<div><dt>${k}</dt><dd><bdi dir="ltr">${v}</bdi></dd></div>`;
    const cfg = SITE.get(), sl = (cfg.slides && cfg.slides[0]) || {}, lg = C.lang();
    const pickT = (o, fb) => { const v = o && (o[lg] || o.de); return v ? esc(v) : fb; };
    const X = (k, fb) => esc(SITE.tx(k, fb));
    const old = (V5 && V5.homeBlocks) ? V5.homeBlocks() : {};
    const head = (h, href, more) => `<div class="n-head"><h2>${h}</h2><a class="n-more" href="${href}">${more || t('see_all')}${ic('chev')}</a></div>`;
    const occBlock = on => `<section class="n-wrap n-block" id="anlass"><div class="n-occ">
      <div class="n-occ-a">${on.occ ? `<h2>${X('occ_h')}</h2><ul class="n-chips">${occs.map(o => `<li><a href="#/o/${o}">${t('occ_' + o)}</a></li>`).join('')}</ul>` : ''}
        ${on.finder ? `<form class="n-finder" data-form="finder"><label class="n-sr" for="fdOcc">${t('finder_occ')}</label><select class="n-sel" id="fdOcc" name="occ"><option value="">${t('finder_occ')}</option>${occOpts.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select>
          <label class="n-sr" for="fdWho">${t('finder_who')}</label><select class="n-sel" id="fdWho" name="who"><option value="">${t('finder_who')}</option><option value="fuersie">${t('who_her')}</option><option value="fuerihn">${t('who_him')}</option><option value="kinder">${t('who_kids')}</option></select>
          <label class="n-sr" for="fdMax">${t('finder_budget')}</label><input class="n-sel" id="fdMax" name="max" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('finder_budget_ph'))} €">
          <button class="n-btn n-dark">${ic('search')}${t('finder_go')}</button></form>` : ''}</div>
      ${on.gift ? `<div class="n-occ-b"><div><h2>${X('gc_h')}</h2><p>${X('gc_p')}</p></div><a class="n-btn n-white" href="#/gutschein">${t('nav_gift')}${ic('chev')}</a></div>` : ''}
    </div></section>`;
    const B = {
      hero: () => `<section class="n-wrap n-hero">
      <div class="n-hero-copy">
        <p class="n-pill">${ic('clock')}<span>${esc(S.cutoffText())}</span></p>
        <h1>${pickT(sl.t, t('n_hero_h'))}</h1>
        <p class="n-lead">${pickT(sl.p, t('n_hero_p'))}</p>
        <p class="n-acts"><a class="n-btn" href="#/c/alle">${t('n_all')}${ic('chev')}</a><a class="n-btn n-line" href="#so-gehts">${t('n_how')}</a></p>
        <ul class="n-proof"><li>${ic('check')}${t('n_pay')}</li><li>${ic('store')}${t('n_pickup_free')}</li><li>${ic('eye')}${t('n_live')}</li></ul>
      </div>
      <div class="n-stage">
        <canvas id="heroCv" role="img" aria-label="${esc(L(hp.name))}"></canvas>
        <form class="n-namer" onsubmit="return false"><label for="heroName">${t('n_name')}</label><input id="heroName" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${esc(t('n_name_ph'))}" value="${esc(heroName)}"><span aria-hidden="true">${ic('eye')}</span></form>
        <a class="n-tag" id="heroLink" href="#/p/${esc(hp.id)}"><span><b>${esc(L(hp.name))}</b>${S.priceHTML(hp)}</span><span class="n-go">${t('n_design')}</span></a>
      </div>
    </section>`,
      usp: () => `<section class="n-wrap"><ul class="n-trust">${[['clock', 1], ['wand', 2], ['heart', 3], ['chat', 4]].map(([i, n]) => `<li><i>${ic(i)}</i><span><b>${X('feat' + n)}</b><small>${X('feat' + n + 'd')}</small></span></li>`).join('')}</ul></section>`,
      cats: () => `<section class="n-wrap n-block" id="sortiment">${head(X('cats_h'), '#/c/alle')}
      <ul class="n-cats">${cats.map(c => `<li><a class="n-cat" href="#/c/${c}"><span class="n-cat-img"><img src="${esc(S.catImg(c))}" alt="" loading="lazy" width="360" height="360"></span><b>${t('cat_' + c)}</b><small>${t('n_products', { n: all.filter(p => p.cat === c).length })}</small></a></li>`).join('')}</ul></section>`,
      best: () => `<section class="n-wrap n-block">${head(X('best_h'), '#/c/alle')}${S.grid(best)}</section>
    <section class="n-wrap n-block" id="so-gehts"><div class="n-how">
      <div><h2>${t('n_how_h')}</h2><p class="n-lead">${t('n_hero_p')}</p><a class="n-btn" href="#/c/alle">${t('n_all')}${ic('chev')}</a></div>
      <ol class="n-steps">${[['pin', 1], ['eye', 2], ['store', 3]].map(([i, k]) => `<li><span class="n-tic">${ic(i)}</span><div><h3>${t('n_s' + k)}</h3><p>${t('n_s' + k + 't')}</p></div></li>`).join('')}</ol>
    </div></section>`,
      new: () => fresh.length ? `<section class="n-wrap n-block">${head(X('new_h'), '#/c/tassen')}${S.grid(fresh)}</section>` : '',
      camp: () => camp ? `<section class="n-wrap n-block"><div class="n-camp"><div><h2>${esc(camp.title)}</h2><p class="n-lead">${esc(camp.text)}</p></div><a class="n-btn" href="${esc(camp.href)}">${esc(camp.cta)}${ic('chev')}</a></div></section>` : '',
      reviews: () => revs.length ? `<section class="n-wrap n-block"><div class="n-head"><h2>${t('reviews')}</h2></div><div class="n-revs">${revs.map(r => `<article class="n-rev"><p class="n-stars" aria-label="${r.stars} / 5">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</p><p>${esc(r.text)}</p><b>${esc(r.name)}</b></article>`).join('')}</div></section>` : '',
      locs: () => `<section class="n-wrap n-block" id="laden"><div class="n-visit">
      <div class="n-visit-a"><p class="n-pill">${ic('pin')}${esc(s.shop.zip)} ${esc(s.shop.city)}</p><h2>${t('n_visit_h')}</h2><p class="n-lead">${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}</p>
        <p class="n-acts"><a class="n-btn" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shop.street + ', ' + s.shop.zip + ' ' + s.shop.city)}">${ic('route')}${t('route')}</a><a class="n-btn n-line" target="_blank" rel="noopener noreferrer" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')}WhatsApp</a></p></div>
      <div class="n-facts"><section><h3>${t('hours_h')}</h3><dl>${row(t('mon_sat'), esc(s.hours.wd))}${row(t('sunday'), esc(s.hours.sun))}</dl></section>
        <section><h3>${t('deliv_h')}</h3><dl>${row(t('n_pickup'), t('free'))}${row(t('n_courier'), eur(s.shipping.local.price))}${row('DHL', eur(s.shipping.dhl.price))}${row(t('n_freeabove'), eur(s.freeFrom))}</dl></section></div>
    </div></section>${V5.locs && V5.locs().length > 1 && V5.locsHTML ? `<section class="n-wrap n-block">${head(t('v5_branches_h'), '#/filialen', t('v5_branches'))}${V5.locsHTML()}</section>` : ''}`,
      faq: () => `<section class="n-wrap n-block"><div class="n-faq"><h2>${t('faq_h')}</h2><div>${['ship', 'pickup', 'spotify', 'proof', 'arabic', 'photo', 'pay', 'returns', 'custom'].map(q => `<details><summary>${t('faq_' + q)}</summary><p>${t('faqa_' + q, { cut: s.cutoff, free: eur(s.freeFrom), local: eur(s.shipping.local.price), dhl: eur(s.shipping.dhl.price) })}</p></details>`).join('')}</div></div></section>`,
      news: () => `<section class="n-wrap n-block"><div class="n-news"><h2>${X('news_h')}</h2><p>${X('news_p')}</p>
      <form class="n-pillform" data-form="news"><input type="email" name="email" required maxlength="120" autocomplete="email" placeholder="${esc(t('email'))}" aria-label="${esc(t('email'))}"><button class="n-btn">${t('news_btn')}</button></form></div></section>`
    };
    /* optional blocks from the website editor (switched off by default) keep their proven markup */
    ['wall', 'about', 'feats', 'carousel'].forEach(k => { if (old[k]) B[k] = () => `<div class="n-wrap n-old">${old[k]()}</div>`; });
    if (old.mosaic) B.mosaic = () => `<div class="n-wrap n-old">${old.mosaic()}</div>`;
    /* until the owner reorders the sections in the editor, use the designed order */
    const saved = ST.get('site', {}) || {};
    if (!Array.isArray(saved.sections)) {
      const pref = ['hero', 'usp', 'cats', 'best', 'new', 'occ', 'finder', 'gift', 'camp', 'reviews', 'locs', 'faq', 'news'];
      const rank = id => { const i = pref.indexOf(id); return i < 0 ? 99 : i; };
      cfg.sections = cfg.sections.slice().sort((x, y) => rank(x.id) - rank(y.id));
    }
    let out = '', occDone = false; const on = {};
    (cfg.sections || []).forEach(x => { if (x.on) on[x.id] = true; });
    (cfg.sections || []).forEach(x => {
      if (!x.on) return;
      if (x.id === 'occ' || x.id === 'finder' || x.id === 'gift') { if (!occDone) { occDone = true; out += occBlock(on); } return; }
      if (B[x.id]) out += B[x.id]();
    });
    S.page(out, 'home');
    S.heroDraw();
  };

  /* live name on the real product: same renderer as the product page */
  S.heroDraw = function () {
    const cv = $('#heroCv'), inp = $('#heroName'); if (!cv || !inp) return;
    const p = ST.product('rosenbox-herz') || ST.products()[0]; if (!p) return;
    const draw = async () => {
      const D = ENG.blankDesign(p), nf = nameField(p), nm = inp.value.trim();
      if (nm && nf) D.f[nf.id] = nm;
      const w = Math.min(1100, Math.round((cv.parentElement.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1)));
      await ENG.render(cv, p, 0, D, { maxW: w, force: !!nm });
      const a = $('#heroLink'); if (a) a.href = '#/p/' + p.id + (nm ? '?n=' + encodeURIComponent(nm) : '');
    };
    inp.addEventListener('input', C.debounce(() => { heroName = inp.value; draw(); }, 90));
    draw();
  };

  /* ---------------- sheets: menu, search, bag open and close smoothly ---------------- */
  const sheet0 = C.sheet;
  C.sheet = function (o) { $$('.ov').forEach(e => e.remove()); const keep = o && o.noFocus; const ov = sheet0.call(this, Object.assign({}, o, { noFocus: true })); if (!keep) { const f = $('input:not([type=hidden]),select,textarea', ov.panel); if (f) setTimeout(() => f.focus({ preventScroll: true }), 90); } return ov; };
  const search0 = S.searchSheet; S.searchSheet = function () { search0.apply(this, arguments); setTimeout(() => { const i = $('#sq'); if (i) i.focus({ preventScroll: true }); }, 140); };
  C.closeAll = function (now) {
    const list = $$('.ov:not(.out)'); document.body.classList.remove('noscroll');
    if (!list.length || now === true || (C.reduced && C.reduced())) { $$('.ov').forEach(e => e.remove()); return; }
    list.forEach(e => { e.classList.add('out'); e.style.pointerEvents = 'none'; setTimeout(() => e.remove(), 320); });
  };
  /* drag a bottom sheet down to close it */
  (function () {
    let st = null;
    document.addEventListener('pointerdown', e => {
      if (!window.matchMedia('(max-width:760px)').matches) return;
      let h = e.target.closest && e.target.closest('.ov:not(.modal) .ov-head'); if (!h && e.target.classList && e.target.classList.contains('ov-panel') && !e.target.closest('.ov.modal') && e.clientY - e.target.getBoundingClientRect().top < 30) h = e.target; if (!h) return;
      if (e.target.closest('button,a,input')) return;
      const panel = h.closest('.ov-panel'); if (!panel) return;
      st = { y: e.clientY, t: Date.now(), panel, dy: 0 }; panel.style.transition = 'none'; panel.style.animation = 'none';
    });
    document.addEventListener('pointermove', e => { if (!st) return; const top = st.panel.closest('.ov').classList.contains('top'); st.dy = top ? Math.min(0, e.clientY - st.y) : Math.max(0, e.clientY - st.y); st.panel.style.transform = `translateY(${st.dy}px)`; });
    const end = () => {
      if (!st) return; const { panel, dy, t } = st; st = null; const v = Math.abs(dy) / Math.max(1, Date.now() - t);
      if (Math.abs(dy) > 110 || v > .6) { panel.style.transition = 'transform .28s ease-in'; panel.style.transform = `translateY(${dy > 0 ? '100%' : '-100%'})`; setTimeout(() => C.closeAll(true), 240); }
      else { panel.style.transition = 'transform .4s cubic-bezier(.34,1.4,.64,1)'; panel.style.transform = ''; setTimeout(() => { panel.style.transition = ''; panel.style.animation = 'none'; }, 420); }
    };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  })();

  S.menu = function () {
    const ov = C.sheet({ title: t('menu'), start: true, foot: false, kind: 'side menu n-sheet', noFocus: true });
    const s = ST.settings(), cats = CAT_EXTRA.cats;
    const links = [['#/anlass', 'gift', t('nav_occ')], ['#/gutschein', 'cards', t('nav_gift')], ['#/verfolgen', 'truck', t('track_title')], ['#/konto', 'user', t('account')], ['#/wunschliste', 'heart', t('wishlist')], ['#/hilfe', 'chat', t('nav_help')]];
    ov.body.innerHTML = `<button type="button" class="n-msearch" data-act="search">${ic('search')}<span>${esc(t('search_ph'))}</span></button>
      <h3 class="n-mh">${t('categories')}</h3>
      <div class="n-mcats">${cats.map(c => `<a class="n-mcat" href="#/c/${c}"><span class="n-mimg"><img src="${esc(S.catImg(c))}" alt="" loading="lazy" width="240" height="240"></span><b>${t('cat_' + c)}</b></a>`).join('')}</div>
      <a class="n-btn n-dark n-mall" href="#/c/alle">${t('nav_shop')}${ic('chev')}</a>
      <nav class="n-mlinks">${links.map(([h, i, l]) => `<a href="${h}">${ic(i)}<span>${l}</span>${ic('chev', 'chev')}</a>`).join('')}</nav>
      <h3 class="n-mh">${t('language')}</h3>
      <div class="n-mlangs" role="group">${[['de', 'Deutsch'], ['en', 'English'], ['ar', 'العربية']].map(([l, x]) => `<button type="button" data-lang="${l}" aria-pressed="${l === C.lang()}" lang="${l}">${x}</button>`).join('')}</div>
      <div class="n-mvisit"><b>${esc(s.shop.name)}</b><span>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}<br>${t('mon_sat')} <bdi dir="ltr">${esc(s.hours.wd)}</bdi> · ${t('sunday')} <bdi dir="ltr">${esc(s.hours.sun)}</bdi></span>
        <span class="n-mv"><a class="n-btn n-sm n-tq" target="_blank" rel="noopener" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')} WhatsApp</a><a class="n-btn n-sm n-line" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shop.name + ', ' + s.shop.street + ', ' + s.shop.city)}">${ic('route')} ${t('route')}</a></span></div>`;
  };
  S.heroInit = () => { };
})();
