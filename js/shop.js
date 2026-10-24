/* Storefront: layout, home, listings, search, gift cards, help & legal pages. */
(function () {
  'use strict';
  const S = {};
  window.SHOP = S;
  const app = () => $('#app');
  const CATS = () => CAT_EXTRA.cats;
  const OCCS = () => CAT_EXTRA.occ;

  /* ---------------- virtual gift card product ---------------- */
  S.giftcardImg = function () {
    if (S._gci) return S._gci;
    const W = 1000, H = 640, c = ENG.canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#151112'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#b8924f'); g.addColorStop(.5, '#f1dcaa'); g.addColorStop(1, '#a8824a');
    x.strokeStyle = g; x.lineWidth = 2; x.strokeRect(34, 34, W - 68, H - 68); x.lineWidth = 1; x.strokeRect(46, 46, W - 92, H - 92);
    x.fillStyle = g; x.textAlign = 'center';
    x.font = '500 78px "ui-serif", Georgia, serif'; x.fillText('Adam & Neuetalia', W / 2, 270);
    x.font = '400 22px "ui-sans", sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '9px'; x.fillText('GESCHENKGUTSCHEIN', W / 2, 340); if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.font = '500 46px "ui-serif-i", Georgia, serif'; x.fillText('für ein Lächeln', W / 2, 440);
    x.font = '400 18px "ui-sans", sans-serif'; x.fillStyle = '#9e938c'; x.fillText('Steindamm 62 · Hamburg', W / 2, 560);
    const url = c.toDataURL('image/jpeg', .92);
    if (document.fonts && document.fonts.status !== 'loaded') { document.fonts.ready.then(() => { S._gci = null; }); return url; }
    S._gci = url; return S._gci;
  };
  const GIFT = { id: 'gutschein', virtual: 1, hidden: 1, cat: 'gutschein', occ: [], price: 25, tax: 0, prod: 0, sd: 1, stock: 9999, active: true,
    name: { de: 'Geschenkgutschein', en: 'Gift card', ar: 'بطاقة هدية' }, desc: { de: '', en: '', ar: '' }, fields: [], views: [] };
  const origProducts = ST.products;
  ST.products = function (all) { const l = origProducts(all); if (all && !l.some(p => p.id === 'gutschein')) { GIFT.views = [{ img: S.giftcardImg(), thumb: S.giftcardImg(), w: 900, h: 900, zones: [] }]; l.push(GIFT); } return l; };
  const origProduct = ST.product;
  ST.product = id => id === 'gutschein' ? (GIFT.views.length ? GIFT : (GIFT.views = [{ img: S.giftcardImg(), thumb: S.giftcardImg(), w: 900, h: 900, zones: [] }], GIFT)) : ST.products(true).find(p => p.id === id);

  /* ---------------- formatting helpers ---------------- */
  S.priceHTML = function (p, D) {
    const sale = ST.onSale(p);
    const now = D ? ST.unitPrice(p, D) : ST.minPrice(p);
    const from = !D && ST.hasFromPrice(p);
    const was = D ? ST.round2(p.price + ST.optPrice(p, D)) : p.price;
    return `<span class="price${sale ? ' sale' : ''}">${from ? `<span class="from">${t('from')}</span> ` : ''}${eur(now)}${sale ? ` <s>${eur(was)}</s>` : ''}</span>`;
  };
  /* main technique of a product → small coloured tag on the card (Figma: طباعة / ليزر / تطريز) */
  S.techTag = function (p) {
    const ks = []; for (const v of p.views || []) for (const z of v.zones || []) ks.push(z.t === 'photo' ? 'print' : (z.fx && z.fx.k) || 'print');
    const k = ks.includes('emb') ? 'emb' : ks.includes('engrave') ? 'laser' : ks.includes('foil') || ks.includes('gold3d') ? 'foil' : ks.length ? 'print' : '';
    return k ? `<span class="ptag t-${k}">${t('tag_' + k)}</span>` : '';
  };
  S.starsOf = function (p) { const r = ST.reviews(p.id).filter(r => r.ok); if (!r.length) return ''; const a = r.reduce((s, x) => s + x.stars, 0) / r.length; return `<span class="pstars" aria-label="${a.toFixed(1)} / 5">${'★'.repeat(Math.round(a))}${'☆'.repeat(5 - Math.round(a))}<small>${a.toFixed(1)}</small></span>`; };
  S.card = function (p, opt) {
    opt = opt || {};
    const wished = ST.wishlist().includes(p.id);
    const v = p.views[0];
    const alt = p.views[1] && !p.views[1].when && p.views[1].thumb;
    return `<article class="pcard${opt.big ? ' big' : ''}">
      <a class="pimg" href="#/p/${esc(p.id)}" aria-label="${esc(L(p.name))}"><img src="${esc(v.thumb || v.img)}" alt="" loading="lazy" width="560" height="560">${alt ? `<img class="alt" src="${esc(alt)}" alt="" loading="lazy">` : ''}${p.stock <= 0 ? `<span class="soldout">${t('sold_out')}</span>` : ''}</a>
      <span class="ptags">${S.techTag(p)}${(p.fields || []).length ? `<span class="ptag t-custom">${t('tag_custom')}</span>` : ''}</span>
      <button class="wish${wished ? ' on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wished}" aria-label="${esc(t('wishlist'))}">${ic('heart')}</button>
      <a class="pmeta" href="#/p/${esc(p.id)}"><span class="pname">${esc(L(p.name))}</span>${S.priceHTML(p)}<span class="pvat">${t('vat_short', { n: p.tax || 19 })}</span></a>
      <div class="prow2">${S.starsOf(p) || '<span></span>'}<a class="padd" href="#/p/${esc(p.id)}" aria-label="${esc(t('personalise'))}">${ic('plus')}</a></div>
    </article>`;
  };
  S.grid = list => `<div class="pgrid">${list.map(p => S.card(p)).join('')}</div>`;
  S.catImg = function (cat) { const p = ST.products().find(p => p.cat === cat && p.best) || ST.products().find(p => p.cat === cat); return p ? p.views[0].thumb : ''; };

  /* ---------------- shell ---------------- */
  const LOGO = () => `<a class="logo" href="#/" aria-label="Adam &amp; Neuetalia"><small>Adam &amp;</small><b><i>N</i>EUETALI<em>A</em></b></a>`;
  S.header = function () {
    const n = ST.cartCount(); const me = ST.me(); const s = ST.settings();
    const mins = ST.minutesToCutoff();
    const bar = mins > 0 && ST.isWorkday(new Date()) ? t('bar_today', { t: s.cutoff }) : t('bar_pickup');
    const path = C.path();
    const on = h => path.startsWith(h.slice(1)) ? ' class="on"' : '';
    return `<div class="topbar"><div class="wrap"><span>${ic('gift')} ${esc(t('top_welcome'))}</span><span>${ic('bike')} ${esc(bar)}</span></div></div>
    <header class="hd"><div class="wrap hd-in">
      <button class="ibtn only-s" data-act="menu" aria-label="${esc(t('menu'))}">${ic('menu')}</button>
      ${LOGO()}
      <button class="hd-search" data-act="search">${ic('search')}<span>${esc(t('search_ph'))}</span></button>
      <nav class="nav hide-s" aria-label="${esc(t('menu'))}"><a href="#/c/alle"${on('#/c/')}>${t('nav_ready')}</a><a href="#/box"${on('#/box')}>${t('nav_box')}</a><a href="#/anlass"${on('#/anlass')}>${t('nav_occ')}</a><a href="#/gutschein"${on('#/gutschein')}>${t('nav_gift')}</a></nav>
      <div class="hd-tools">
        <button class="ibtn only-s" data-act="search" aria-label="${esc(t('search'))}">${ic('search')}</button>
        <a class="hd-act hide-s" href="#/konto">${ic('user')}<span>${me ? esc(me.name.split(' ')[0]) : t('login')}<small>${me ? t('account') : t('register')}</small></span></a>
        <a class="hd-act hide-s" href="#/wunschliste" aria-label="${esc(t('wishlist'))}">${ic('heart')}</a>
        <button class="hd-act" data-act="cart" aria-label="${esc(t('cart'))}">${ic('bag')}<span class="hide-s">${t('cart')}</span>${n ? `<i class="cnt">${n}</i>` : ''}</button>
        <div class="langs hide-s" role="group" aria-label="Sprache · Language · اللغة">${[['de', 'DE'], ['en', 'EN'], ['ar', 'ع']].map(([l, x]) => `<button data-lang="${l}" aria-pressed="${l === C.lang()}" lang="${l}">${x}</button>`).join('')}</div>
      </div></div></header>`;
  };
  S.footer = function () {
    const s = ST.settings();
    const logos = [['', 'Lastschrift'], ['', 'American Express'], ['', 'GLS'], ['', 'Online-Überweisung'], ['kl', 'Klarna.'], ['', 'dpd'], ['', 'Vorkasse'], ['visa', 'VISA'], ['', 'Hermes'], ['', 'Rechnung'], ['pp', 'PayPal'], ['dhl', 'DHL']];
    return `<footer class="ft">
      <div class="wrap ft-main">
        <div class="ft-brand">${LOGO()}<p>${t('ft_about')}</p>
          <div class="langs" role="group" aria-label="Sprache · Language · اللغة">${[['de', 'Deutsch'], ['en', 'English'], ['ar', 'العربية']].map(([l, x]) => `<button data-lang="${l}" aria-pressed="${l === C.lang()}" lang="${l}">${x}</button>`).join('')}</div></div>
        <div><h3>${t('ft_links')}</h3><div class="ft-links">
          <a href="#/c/alle">${t('nav_ready')}</a><a href="#/box">${t('nav_box')}</a><a href="#/anlass">${t('nav_occ')}</a><a href="#/gutschein">${t('nav_gift')}</a>
          <a href="#/verfolgen">${t('track_title')}</a><a href="#/hilfe">${t('nav_help')}</a><a href="#/hilfe/rueckgabe">${t('ft_returns')}</a><a href="#/hilfe/versand">${t('help_ship')}</a>
          <a href="#/konto">${t('account')}</a><a href="#/wunschliste">${t('wishlist')}</a></div>
          <h3 style="margin-top:22px">${t('ft_paydeliv')}</h3><div class="ft-logos">${logos.map(([c, x]) => `<span class="${c}">${esc(x)}</span>`).join('')}</div></div>
        <div class="ft-visit"><h3>${t('ft_visit')}</h3><p>${esc(s.shop.name)}<br>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}</p><p>${t('mon_sat')} <bdi dir="ltr">${esc(s.hours.wd)}</bdi><br>${t('sunday')} <bdi dir="ltr">${esc(s.hours.sun)}</bdi></p><p><a href="tel:${esc(s.shop.phone.replace(/\s/g, ''))}"><bdi dir="ltr">${esc(s.shop.phone)}</bdi></a> · <a href="mailto:${esc(s.shop.email)}">${esc(s.shop.email)}</a></p>
          <div class="vbtns" style="margin-top:12px"><a class="btn teal sm" target="_blank" rel="noopener" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')} WhatsApp</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shop.name + ', ' + s.shop.street + ', ' + s.shop.city)}">${ic('route')} ${t('route')}</a></div></div>
      </div>
      <div class="ft-bar"><div class="wrap"><span>${esc(s.shop.name)} · ${esc(s.shop.street)} · ${esc(s.shop.zip)} ${esc(s.shop.city)}</span><span class="ft-soc"><a href="https://www.instagram.com/neuetalia" target="_blank" rel="noopener" aria-label="Instagram">IG</a><a href="https://www.tiktok.com/@neuetalia" target="_blank" rel="noopener" aria-label="TikTok">TT</a><a href="https://www.facebook.com/neuetalia" target="_blank" rel="noopener" aria-label="Facebook">f</a><a href="https://wa.me/${esc(s.shop.wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">WA</a></span><span>${ic('mail')} ${esc(s.shop.email)}</span></div></div>
      <div class="wrap ft-legal"><a href="#/rechtliches/impressum">${t('imprint')}</a><a href="#/rechtliches/datenschutz">${t('privacy')}</a><a href="#/rechtliches/agb">${t('terms')}</a><a href="#/rechtliches/widerruf">${t('withdrawal')}</a><a href="#/rechtliches/versand">${t('ship_pay')}</a><button data-act="cookies">${t('cookie_settings')}</button><a href="#/admin">${t('admin_area')}</a><span style="margin-inline-start:auto">© 2026 ${esc(s.shop.name)} · ${t('demo_note')}</span></div>
    </footer>`;
  };
  S.tabbar = function () {
    const n = ST.cartCount(); const p = C.path();
    const cur = k => (k === 'home' ? p === '/' : k === 'wish' ? p.startsWith('/wunschliste') : '') ? ' on' : '';
    return `<nav class="tabbar" aria-label="${esc(t('menu'))}">
      <button data-act="menu">${ic('grid')}<span>${t('tab_cats')}</span></button>
      <a href="#/wunschliste" class="${cur('wish')}">${ic('heart')}<span>${t('wishlist')}</span></a>
      <a href="#/" class="home${cur('home')}"><i>${ic('home')}</i><span>${t('tab_home')}</span></a>
      <button data-act="search">${ic('search')}<span>${t('search')}</span></button>
      <button data-act="cart">${ic('bag')}<span>${t('cart')}</span>${n ? `<i class="cnt">${n}</i>` : ''}</button></nav>`;
  };
  S.page = function (html, cls) {
    app().className = 'shop pg-' + (cls || 'x');
    app().innerHTML = S.header() + `<main id="main" class="main">${html}</main>` + S.footer() + S.tabbar();
    S.after();
  };
  S.refreshHeader = function () {
    const h = $('header.hd'); if (h) { const tmp = document.createElement('div'); tmp.innerHTML = S.header(); h.replaceWith(tmp.querySelector('header')); }
    const tb = $('nav.tabbar'); if (tb) { const tmp = document.createElement('div'); tmp.innerHTML = S.tabbar(); tb.replaceWith(tmp.querySelector('nav')); }
  };
  S.after = function () {
    if (!ST.get('cookies', null)) S.cookieBanner();
    S.reveal();
  };
  /* entrance animation for section parts */
  let io = null;
  S.reveal = function () {
    if (!('IntersectionObserver' in window) || C.reduced()) return;
    if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv:not(.shown)').forEach((el, i) => { el.style.setProperty('--d', ((+el.dataset.i || 0) * 80) + 'ms'); el.classList.add('pre'); io.observe(el); });
  };

  /* ---------------- cookie banner (only necessary storage) ---------------- */
  S.cookieBanner = function () {
    if ($('#cookie')) return;
    const d = document.createElement('div'); d.id = 'cookie'; d.className = 'cookie';
    d.innerHTML = `<p>${t('cookie_text')} <a href="#/rechtliches/datenschutz">${t('privacy')}</a></p><div><button class="btn ghost sm" data-act="cookie-min">${t('cookie_needed')}</button><button class="btn sm" data-act="cookie-all">${t('cookie_ok')}</button></div>`;
    document.body.appendChild(d);
  };

  /* ---------------- menu & search sheets ---------------- */
  S.menu = function () {
    const ov = C.sheet({ title: t('menu'), start: true, foot: false, kind: 'side menu', noFocus: true });
    const s = ST.settings();
    const links = [['#/anlass', 'gift', t('nav_occ')], ['#/gutschein', 'cards', t('nav_gift')], ['#/verfolgen', 'truck', t('track_title')], ['#/konto', 'user', t('account')], ['#/wunschliste', 'heart', t('wishlist')], ['#/hilfe', 'chat', t('nav_help')]];
    ov.panel.insertAdjacentHTML('afterbegin', `<a class="m-logo" href="#/">Adam <i>&amp;</i> Neuetalia</a>`);
    ov.body.innerHTML = `<button class="m-search" data-act="search">${ic('search')} ${esc(t('search_ph'))}</button>
      <p class="m-h">${t('categories')}</p>
      <div class="m-cats">${CATS().map(c => `<a class="m-cat" href="#/c/${c}"><img src="${esc(S.catImg(c))}" alt="" loading="lazy"><span>${t('cat_' + c)}</span></a>`).join('')}<a class="m-cat all" href="#/c/alle"><span>${t('nav_shop')} →</span></a></div>
      <nav class="m-links">${links.map(([h, i, l]) => `<a href="${h}">${ic(i)}<span>${l}</span>${ic('chev', 'chev')}</a>`).join('')}</nav>
      <p class="m-h">${t('language')}</p>
      <div class="m-langs" role="group">${[['de', 'Deutsch'], ['en', 'English'], ['ar', 'العربية']].map(([l, x]) => `<button data-lang="${l}" aria-pressed="${l === C.lang()}" lang="${l}">${x}</button>`).join('')}</div>
      <div class="m-visit"><b>${esc(s.shop.name)}</b><span>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}<br>${t('mon_sat')} <bdi dir="ltr">${esc(s.hours.wd)}</bdi> · ${t('sunday')} <bdi dir="ltr">${esc(s.hours.sun)}</bdi></span>
        <div class="vbtns"><a class="btn gold" target="_blank" rel="noopener" href="https://wa.me/${esc(s.shop.wa)}">${ic('chat')} WhatsApp</a><a class="btn line-l" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shop.name + ', ' + s.shop.street + ', ' + s.shop.city)}">${ic('route')} ${t('route')}</a></div></div>`;
  };
  S.searchIndex = null;
  function index() {
    if (S.searchIndex) return S.searchIndex;
    S.searchIndex = ST.products().map(p => {
      const hay = ['de', 'en', 'ar'].map(l => [L(p.name, l), t('cat_' + p.cat, null, l), ...(p.occ || []).map(o => t('occ_' + o, null, l)), L(p.mat, l)].join(' ')).join(' ');
      return { p, words: C.norm(hay).split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1), hay: C.norm(hay) };
    });
    return S.searchIndex;
  }
  S.search = function (q) {
    q = C.norm(q).trim(); if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const out = [];
    for (const e of index()) {
      let score = 0, ok = true;
      for (const tm of terms) {
        if (e.hay.includes(tm)) { score += 3; continue; }
        const tol = tm.length > 6 ? 2 : tm.length > 3 ? 1 : 0;
        const best = Math.min(99, ...e.words.map(w => C.lev(tm, w.slice(0, tm.length + 1))));
        if (best <= tol) score += 1; else { ok = false; break; }
      }
      if (ok) out.push([score + (e.p.best ? .5 : 0), e.p]);
    }
    return out.sort((a, b) => b[0] - a[0]).map(x => x[1]);
  };
  S.searchSheet = function () {
    const ov = C.sheet({ title: t('search'), kind: 'top', foot: false });
    ov.body.innerHTML = `<form class="sform" role="search" data-form="search"><input class="in big" id="sq" type="search" autocomplete="off" placeholder="${esc(t('search_ph'))}" aria-label="${esc(t('search'))}"><button class="btn">${t('search')}</button></form><div id="sres" class="sres"></div>`;
    const inp = $('#sq', ov); setTimeout(() => inp.focus(), 50);
    const draw = C.debounce(() => {
      const r = S.search(inp.value).slice(0, 6);
      $('#sres', ov).innerHTML = inp.value.trim() ? (r.length ? r.map(p => `<a class="srow" href="#/p/${esc(p.id)}"><img src="${esc(p.views[0].thumb)}" alt="" width="56" height="56"><span>${esc(L(p.name))}<small>${t('cat_' + p.cat)}</small></span>${S.priceHTML(p)}</a>`).join('') + `<a class="srow all" href="#/suche/${encodeURIComponent(inp.value.trim())}">${t('see_all_results')} ${ic('chev', 'flip')}</a>` : `<p class="muted">${t('no_results')}</p>`) :
        `<div class="sugg">${['Rosenbox', 'Kette', 'Foto', 'Gravur', 'Hoodie', 'Lampe'].map(w => `<button data-sugg="${w}">${w}</button>`).join('')}</div>`;
    }, 120);
    inp.addEventListener('input', draw); draw();
  };

  /* ---------------- HOME ---------------- */
  const HERO = ['rosenbox-herz', 'rosenbox-rund', 'rose-glas', 'rosen-tasche'];
  const WALL = ['rosenbox-herz', 'flasche', 'hoodie-name', 'rosen-acrylbox'];
  let heroTimer = null, heroIdx = 0, heroName = '';
  const nameField = p => p && p.fields.find(f => f.type === 'text' && !f.sf);
  S.home = function () {
    const s = ST.settings();
    const all = ST.products();
    const best = all.filter(p => p.best).concat(all.filter(p => !p.best)).slice(0, 12);
    const fresh = all.filter(p => p.np).slice(0, 8);
    const camp = S.campaign();
    const occs = ['liebe', 'muttertag', 'hochzeit', 'geburtstag', 'familie', 'ramadan'];
    const used = new Set(); const occImg = o => { const list = all.filter(p => (p.occ || []).includes(o)).sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)); const p = list.find(p => !used.has(p.views[0].img)) || list[0]; if (!p) return ''; used.add(p.views[0].img); return p.views[0].thumb || p.views[0].img; };
    const img = id => { const p = ST.product(id); return p ? (p.views[0].thumb || p.views[0].img) : ''; };
    const wall = WALL.map(id => ST.product(id)).filter(p => p && p.active);
    const revs = ST.reviews().filter(r => r.ok && r.text).slice(0, 3);
    const car = ['np-kissen-herz', 'rosenbox-herz', 'np-songtasse', 'geschenkbox-liebe', 'np-kette-herz', 'rose-glas', 'np-uhr-herz', 'collage-box'].map(id => ST.product(id)).filter(Boolean);
    const occOpts = CAT_EXTRA.occ.filter(o => !['fuersie', 'fuerihn', 'kinder'].includes(o));
    S.page(`
    <section class="hm"><div class="wrap hm-grid">
      <form class="finder rv" data-form="finder">
        <h2>${ic('sparkle')} ${t('finder_h')}</h2>
        <label class="vh" for="fdOcc">${t('finder_occ')}</label><select class="in" id="fdOcc" name="occ"><option value="">${t('finder_occ')}</option>${occOpts.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select>
        <label class="vh" for="fdWho">${t('finder_who')}</label><select class="in" id="fdWho" name="who"><option value="">${t('finder_who')}</option><option value="fuersie">${t('who_her')}</option><option value="fuerihn">${t('who_him')}</option><option value="kinder">${t('who_kids')}</option></select>
        <label class="fd-bud"><span class="vh">${t('finder_budget')}</span><input class="in" id="fdMax" name="max" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('finder_budget_ph'))}"><b>€</b></label>
        <button class="btn">${ic('search')} ${t('finder_go')}</button>
        <p class="finder-pop">${t('finder_pop')}</p>
        <nav class="chips finder-chips">${['geburtstag', 'liebe', 'hochzeit', 'muttertag', 'ramadan', 'kinder'].map(o => `<a href="#/o/${o}">${t('occ_' + o)}</a>`).join('')}</nav>
        <a class="finder-box" href="#/box"><img src="img/o/box-hero.jpg" alt="" loading="lazy" width="120" height="103"><span><b>${t('nav_box')}</b><small>${t('tile_custom_p')}</small></span>${ic('chev', 'flip')}</a>
      </form>
      <a class="tile t-her rv" data-i="1" href="#/o/fuersie"><img src="${esc(img('rosenbox-herz'))}" alt="" loading="eager"><b>${t('who_her')}</b></a>
      <a class="tile t-him rv" data-i="2" href="#/o/fuerihn"><img src="${esc(img('np-tasse-fussball'))}" alt="" loading="eager"><b>${t('who_him')}</b></a>
      <a class="tile promo rv" href="#/c/alle"><img src="${esc(img('geschenkbox-liebe'))}" alt=""><span class="tx"><small>Special gift</small><strong>${t('tile_gifts')}</strong><p>${t('tile_gifts_p')}</p><span class="btn sm">${t('shop_now')}</span></span></a>
      <a class="tile t-kids rv" data-i="1" href="#/o/kinder"><img src="${esc(img('np-tasse-emoji'))}" alt="" loading="lazy"><b>${t('who_kids')}</b></a>
      <a class="tile t-all rv" data-i="2" href="#/c/alle"><img src="${esc(img('np-kissen-satin'))}" alt="" loading="lazy"><b>${t('who_all')}</b></a>
      <a class="tile custom rv" href="#/box"><img src="img/o/box-hero.jpg" alt="" loading="lazy"><span class="tx"><strong>${t('tile_custom')}</strong><span class="muted small">${t('tile_custom_p')}</span><span class="btn purple sm">${ic('box')} ${t('nav_box')}</span></span></a>
    </div></section>

    <section class="sec cats-sec"><div class="wrap">
      <div class="sh rv"><h2 class="ttl">${t('cats_h')}</h2><a class="more hide-s" href="#/c/alle">${t('see_all')}</a></div>
      <div class="rail">${CATS().map(c => `<a class="circ" href="#/c/${c}"><span class="ph"><img src="${esc(S.catImg(c))}" alt="" loading="lazy"></span><b>${t('cat_' + c)}</b></a>`).join('')}<a class="circ" href="#/gutschein"><span class="ph"><img src="${S.giftcardImg()}" alt="" loading="lazy"></span><b>${t('nav_gift')}</b></a></div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sh rv"><h2 class="ttl">${t('best_h')}</h2><a class="more" href="#/c/alle">${t('see_all')}</a></div>
      <div class="prail">${best.map(p => S.card(p)).join('')}</div>
    </div></section>

    ${wall.length ? `<section class="wall" style="margin-top:clamp(52px,7vw,96px)"><div class="wrap">
      <div class="sh"><div><span class="eyb">${t('wall_eyb')}</span><h2>${t('wall_h')}</h2></div></div>
      <p class="lead">${t('wall_p')}</p>
      <div class="wall-try"><div class="hx-row"><input id="wallName" maxlength="12" autocomplete="off" placeholder="${esc(t('hero_ph'))}" value="${esc(heroName)}"></div></div>
      <div class="wall-grid">${wall.map((p, i) => `<a href="#/p/${esc(p.id)}" data-wall="${i}"><canvas data-wcv="${i}"></canvas><span><b>${esc(L(p.name))}</b>${S.priceHTML(p)}</span></a>`).join('')}</div>
    </div></section>` : ''}

    ${fresh.length ? `<section class="sec"><div class="wrap">
      <div class="sh rv"><h2 class="ttl">${t('new_h')}</h2><a class="more" href="#/c/tassen">${t('see_all')}</a></div>
      <div class="prail">${fresh.map(p => S.card(p)).join('')}</div>
    </div></section>` : ''}

    <section class="sec"><div class="wrap feats">
      <div class="feat rv"><i>${ic('truck')}</i><b>${t('feat1')}</b><small>${t('feat1d')}</small></div>
      <div class="feat rv" data-i="1"><i>${ic('wand')}</i><b>${t('feat2')}</b><small>${t('feat2d')}</small></div>
      <div class="feat rv" data-i="2"><i>${ic('heart')}</i><b>${t('feat3')}</b><small>${t('feat3d')}</small></div>
      <div class="feat rv" data-i="3"><i>${ic('chat')}</i><b>${t('feat4')}</b><small>${t('feat4d')}</small></div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sh rv"><h2 class="ttl">${t('occ_h')}</h2><a class="more" href="#/anlass">${t('see_all')}</a></div>
      <div class="occ2">${occs.map(o => `<a href="#/o/${o}" class="rv"><img src="${esc(occImg(o))}" alt="" loading="lazy"><b>${t('occ_' + o)}<small>${t('n_products', { n: all.filter(p => (p.occ || []).includes(o)).length })}</small></b></a>`).join('')}</div>
    </div></section>

    <section class="sec"><div class="wrap team rv">
      <h2>${t('team_h')}</h2>
      <h3>${t('team_h1')}</h3><p>${t('team_p1')}</p>
      <h3>${t('team_h2')}</h3><p>${t('team_p2')}</p>
      <h3>${t('team_h3')}</h3><p>${t('team_p3')}</p>
      <h3>${t('team_h4')}</h3><p>${t('team_p4')}</p>
    </div>
    ${car.length ? `<div class="carou"><button class="carou-nav prev" data-act="carou" data-d="-1" aria-label="‹">${ic('back')}</button><div class="carou-track" id="carou">${car.map(p => `<a href="#/p/${esc(p.id)}" aria-label="${esc(L(p.name))}"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" loading="lazy"></a>`).join('')}</div><button class="carou-nav next" data-act="carou" data-d="1" aria-label="›">${ic('chev')}</button></div>` : ''}
    ${revs.length ? `<div class="wrap"><div class="revs">${revs.map(r => `<article class="revc"><header><span class="av">${esc((r.name || '?').trim().charAt(0).toUpperCase())}</span><span><b>${esc(r.name)}</b><br><span class="pstars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span></span></header><p>${esc(r.text)}</p></article>`).join('')}</div></div>` : ''}
    </section>

    ${camp ? `<section class="split blush rev" style="margin-top:clamp(52px,7vw,96px)"><div class="sp-img"><img src="${esc(occImg('liebe'))}" alt="" loading="lazy"></div><div class="sp-txt rv"><span class="eyb">${t('camp_eyb')}</span><h2>${esc(camp.title)}</h2><p class="lead">${esc(camp.text)}</p><div><a class="btn" href="${camp.href}">${esc(camp.cta)}</a></div></div></section>` : ''}

    <section class="split dark" style="margin-top:14px"><div class="sp-img"><div class="gc-card"><img src="${S.giftcardImg()}" alt="" loading="lazy"></div></div><div class="sp-txt rv"><span class="eyb" style="color:#ffd1e5">${t('nav_gift')}</span><h2>${t('gc_h')}</h2><p class="lead">${t('gc_p')}</p><div><a class="btn" href="#/gutschein">${t('gc_cta')}</a></div></div></section>

    <section class="sec"><div class="wrap"><div class="news rv"><h2>${t('news_h')}</h2><p>${t('news_p')}</p><form data-form="news"><input class="in" type="email" name="email" required placeholder="${esc(t('email'))}" aria-label="${esc(t('email'))}"><button class="btn">${t('news_btn')}</button></form></div></div></section>
    `, 'home');
    S.heroInit();
    S.wallInit();
    S.carouInit();
  };
  S.carouInit = function () {
    const tr = $('#carou'); if (!tr) return;
    const mark = () => { const r = tr.getBoundingClientRect(); const mid = r.left + r.width / 2; let best = null, bd = 1e9; for (const a of tr.children) { const b = a.getBoundingClientRect(); const d = Math.abs(b.left + b.width / 2 - mid); if (d < bd) { bd = d; best = a; } } for (const a of tr.children) a.classList.toggle('on', a === best); };
    tr.addEventListener('scroll', C.debounce(mark, 60), { passive: true });
    requestAnimationFrame(() => { const k = Math.floor(tr.children.length / 2); const a = tr.children[k]; if (a) tr.scrollLeft = a.offsetLeft - (tr.clientWidth - a.clientWidth) / 2; mark(); });
  };
  S.carou = function (d) { const tr = $('#carou'); if (!tr) return; const w = (tr.children[0] || {}).clientWidth || 260; tr.scrollBy({ left: d * (w + 16) * (document.documentElement.dir === 'rtl' ? -1 : 1), behavior: C.reduced() ? 'auto' : 'smooth' }); };
  S.wallInit = function () {
    const inp = $('#wallName'); if (!inp) return;
    const draw = async () => {
      const name = (inp.value || '').trim();
      for (const c of $$('[data-wcv]')) {
        const p = ST.product(WALL.filter(id => { const x = ST.product(id); return x && x.active; })[+c.dataset.wcv]); if (!p) continue;
        const D = ENG.blankDesign(p); const nf = nameField(p); if (name && nf) D.f[nf.id] = name;
        const w = Math.min(700, Math.round((c.parentElement.clientWidth || 300) * Math.min(2, devicePixelRatio || 1)));
        await ENG.render(c, p, 0, D, { maxW: w, force: !!name });
        c.parentElement.href = '#/p/' + p.id + (name ? '?n=' + encodeURIComponent(name) : '');
      }
    };
    const lazyDraw = () => { if ('IntersectionObserver' in window) { const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { o.disconnect(); draw(); } }, { rootMargin: '400px' }); o.observe($('.wall-grid')); } else draw(); };
    lazyDraw();
    inp.addEventListener('input', C.debounce(draw, 120));
  };
  S.cutoffText = function () {
    const m = ST.minutesToCutoff(); const s = ST.settings();
    if (m > 0 && ST.isWorkday(new Date())) return t('cutoff_left', { h: Math.floor(m / 60), m: m % 60 });
    return t('cutoff_tomorrow', { d: C.date(ST.readyDate(0)), t: s.cutoff });
  };
  S.heroInit = function () {
    clearInterval(heroTimer); heroIdx = 0;
    const a = $('#heroA'), b = $('#heroB'); if (!a) return;
    const inp = $('#heroName'); inp.value = heroName;
    const draw = async (cv, i) => {
      const p = ST.product(HERO[i]); if (!p) return;
      const D = ENG.blankDesign(p); const nf = nameField(p);
      if (heroName.trim() && nf) D.f[nf.id] = heroName.trim();
      const w = Math.min(1100, Math.round((a.parentElement.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1)));
      await ENG.render(cv, p, 0, D, { maxW: w });
    };
    const cap = i => { if (!$('#heroCap')) return; const p = ST.product(HERO[i]); $('#heroCap').textContent = L(p.name); $('#heroPrice').innerHTML = S.priceHTML(p); $('#heroLink').href = '#/p/' + p.id + (heroName.trim() ? '?n=' + encodeURIComponent(heroName.trim()) : ''); $$('[data-hero]').forEach((d, k) => d.setAttribute('aria-selected', String(k === i))); };
    const show = async (i, instant) => {
      const front = a.classList.contains('off') ? b : a, back = front === a ? b : a;
      await draw(back, i);
      if (instant) { front.classList.add('off'); back.classList.remove('off'); } else { back.classList.remove('off'); front.classList.add('off'); }
      heroIdx = i; cap(i);
    };
    draw(a, 0).then(() => cap(0));
    const tick = () => { if (document.hidden) return; show((heroIdx + 1) % HERO.length); };
    if (!C.reduced()) heroTimer = setInterval(tick, 5600);
    const redraw = C.debounce(() => { heroName = inp.value; const front = a.classList.contains('off') ? b : a; draw(front, heroIdx).then(() => cap(heroIdx)); }, 90);
    inp.addEventListener('input', () => { clearInterval(heroTimer); redraw(); if (!C.reduced()) heroTimer = setInterval(tick, 7000); });
    S._heroShow = i => { clearInterval(heroTimer); show(i); };
  };
  S.bestInit = function () {
    const img = $('#bestImg'); if (!img) return;
    const set = a => { if (!a || a.classList.contains('on')) return; $$('.blist a').forEach(x => x.classList.toggle('on', x === a)); img.classList.add('fade'); setTimeout(() => { img.src = a.dataset.img; img.onload = () => img.classList.remove('fade'); }, 160); };
    $$('.blist a').forEach(a => { a.addEventListener('mouseenter', () => set(a)); a.addEventListener('focus', () => set(a)); });
    if ('IntersectionObserver' in window && window.innerWidth < 860) {
      const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(e.target); }), { rootMargin: '-45% 0px -45% 0px' });
      $$('.blist a').forEach(a => o.observe(a));
    }
  };
  S.campaign = function () {
    const s = ST.settings(); if (!s.campaign.on) return null;
    const d = new Date(); const m = d.getMonth() + 1, day = d.getDate();
    let key = s.campaign.key;
    if (key === 'auto') key = (m === 1 || (m === 2 && day <= 14)) ? 'valentin' : (m === 4 || (m === 5 && day <= 10)) ? 'muttertag' : (m === 11 || m === 12) ? 'weihnachten' : (m === 2 && day > 14) || m === 3 ? 'ramadan' : 'herbst';
    const occ = { valentin: 'liebe', muttertag: 'muttertag', weihnachten: 'weihnachten', ramadan: 'ramadan', herbst: 'liebe' }[key] || 'liebe';
    return { title: t('camp_' + key), text: t('camp_' + key + '_p'), cta: t('camp_cta'), href: '#/o/' + occ };
  };

  /* ---------------- LISTING ---------------- */
  let F = { sort: 'rec', occ: '', max: 0, who: '' };
  S.list = function (kind, val) {
    let list = ST.products(), title = t('nav_shop'), sub = '';
    if (kind === 'c' && val !== 'alle') { list = list.filter(p => p.cat === val); title = t('cat_' + val); sub = t('catd_' + val); }
    if (kind === 'o') { list = list.filter(p => (p.occ || []).includes(val)); title = t('occ_' + val); sub = t('occd'); }
    if (kind === 's') { list = S.search(val); title = t('results_for', { q: val }); }
    if (kind === 'w') { const w = ST.wishlist(); list = w.map(id => ST.product(id)).filter(Boolean); title = t('wishlist'); sub = list.length ? '' : t('wish_empty'); }
    const all = list;
    if (F.occ && kind !== 'o') list = list.filter(p => (p.occ || []).includes(F.occ));
    if (F.who) list = list.filter(p => (p.occ || []).includes(F.who));
    if (F.max) list = list.filter(p => ST.minPrice(p) <= F.max);
    if (F.sort === 'low') list = list.slice().sort((a, b) => ST.minPrice(a) - ST.minPrice(b));
    else if (F.sort === 'high') list = list.slice().sort((a, b) => ST.minPrice(b) - ST.minPrice(a));
    else if (F.sort === 'new') list = list.slice().reverse();
    else if (kind !== 's' && kind !== 'w') list = list.slice().sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0));
    const chips = `<nav class="chips" aria-label="${esc(t('categories'))}"><a href="#/c/alle"${kind === 'c' && val === 'alle' ? ' aria-current="page"' : ''}>${t('all')}</a>${CATS().map(c => `<a href="#/c/${c}"${kind === 'c' && val === c ? ' aria-current="page"' : ''}>${t('cat_' + c)}</a>`).join('')}</nav>`;
    const occs = CAT_EXTRA.occ.filter(o => (kind === 'o' ? ST.products() : all).some(p => (p.occ || []).includes(o)));
    const maxAll = Math.ceil(Math.max(20, ...ST.products().map(p => ST.minPrice(p))) / 10) * 10;
    const cur = F.max || maxAll;
    const side = kind === 'w' ? '' : `<aside class="fside" id="fside"><h2>${t('filter')} ${ic('filter')}</h2>
      <details open><summary>${t('nav_occ')}</summary>${occs.map(o => kind === 'o' ? `<a href="#/o/${o}"${val === o ? ' aria-current="page"' : ''}>${t('occ_' + o)}<small>${ST.products().filter(p => (p.occ || []).includes(o)).length}</small></a>` : `<button type="button" class="fo" data-act="fset" data-k="occ" data-v="${F.occ === o ? '' : o}" aria-pressed="${F.occ === o}">${t('occ_' + o)}<small>${all.filter(p => (p.occ || []).includes(o)).length}</small></button>`).join('')}</details>
      <details open><summary>${t('price_range')}</summary><div class="prange"><input type="range" min="5" max="${maxAll}" step="1" value="${Math.min(cur, maxAll)}" data-filter="max" aria-label="${esc(t('price_to'))}" oninput="this.nextElementSibling.lastElementChild.textContent=this.value+' €'"><output><b>${eur(0)}</b><b>${eur(Math.min(cur, maxAll))}</b></output><label class="fd-bud"><span class="vh">${t('price_to')}</span><input class="in" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('finder_budget_ph'))}" value="${F.max || ''}" data-filter="maxx"><b>€</b></label></div></details>
      <details${kind === 'c' ? ' open' : ''}><summary>${t('categories')}</summary>${CATS().map(c => `<a href="#/c/${c}"${kind === 'c' && val === c ? ' aria-current="page"' : ''}>${t('cat_' + c)}<small>${ST.products().filter(p => p.cat === c).length}</small></a>`).join('')}</details>
      ${F.occ || F.max || F.who ? `<div style="padding:8px 16px 0"><button class="btn ghost sm block" data-act="freset">${t('reset')}</button></div>` : ''}
    </aside>`;
    S.page(`<div class="wrap lhead"><h1>${esc(title)}</h1>${sub ? `<p class="lead">${esc(sub)}</p>` : ''}${kind !== 'w' ? chips : ''}</div>
    <div class="wrap${side ? ' lwrap' : ''}">${side}<div>
      ${kind !== 'w' ? `<div class="ltools"><button class="btn ghost sm fbtn" data-act="ftoggle">${ic('filter')} ${t('filter')}</button>
        <label class="sel"><span class="vh">${t('sort')}</span><select data-filter="sort">${['rec', 'low', 'high', 'new'].map(v => `<option value="${v}"${F.sort === v ? ' selected' : ''}>${t('sort_' + v)}</option>`).join('')}</select></label>
        <span class="count">${t('n_products', { n: list.length })}</span></div>` : ''}
      ${list.length ? S.grid(list) : `<div class="empty"><p>${kind === 'w' ? t('wish_empty') : t('no_results')}</p><a class="btn" href="#/c/alle">${t('nav_shop')}</a></div>`}
    </div></div>`, 'list');
  };
  S.setFilter = function (k, v) { if (k === 'maxx') { F.max = +v > 0 ? +v : 0; C.dispatch({ keepScroll: true }); return; } F[k] = k === 'max' ? (+v >= +((($('[data-filter=max]') || {}).max) || 1e9) ? 0 : +v) : v; C.dispatch({ keepScroll: true }); };
  S.setFinder = function (o) { F = { sort: 'rec', occ: o.occ || '', max: +o.max || 0, who: o.who || '' }; };
  S.resetFilter = function () { F = { sort: F.sort, occ: '', max: 0, who: '' }; C.dispatch({ keepScroll: true }); };
  S.occPage = function () {
    S.page(`<div class="wrap lhead"><h1>${t('nav_occ')}</h1><p class="lead">${t('occ_lead')}</p></div>
      <div class="wrap occ-grid">${OCCS().map((o, i) => { const p = ST.products().find(p => (p.occ || []).includes(o) && p.best) || ST.products().find(p => (p.occ || []).includes(o)); return p ? `<a class="otile rv" data-i="${i % 3}" href="#/o/${o}"><img src="${esc(p.views[0].thumb)}" alt="" loading="lazy"><b>${t('occ_' + o)}</b><small>${t('n_products', { n: ST.products().filter(x => (x.occ || []).includes(o)).length })}</small></a>` : ''; }).join('')}</div>`, 'list');
  };

  /* ---------------- GIFT CARDS ---------------- */
  S.giftPage = function () {
    const amounts = [25, 50, 75, 100, 150];
    S.page(`<div class="wrap gcp">
      <div class="gcp-img"><img src="${S.giftcardImg()}" alt="" width="900" height="900"></div>
      <form class="gcp-form" data-form="giftcard">
        <h1>${t('gc_title')}</h1><p class="lead">${t('gc_lead')}</p>
        <fieldset><legend>${t('gc_amount')}</legend><div class="seg">${amounts.map((a, i) => `<label><input type="radio" name="amt" value="${a}"${i === 1 ? ' checked' : ''}><span>${eur(a)}</span></label>`).join('')}<label><input type="radio" name="amt" value="x"><span>${t('gc_other')}</span></label></div>
          <input class="in" name="amtx" type="number" min="5" step="any" inputmode="decimal" placeholder="${esc(t('gc_other_ph'))}" hidden></fieldset>
        <label class="fld"><span>${t('gc_to')}</span><input class="in" name="to" required maxlength="40"></label>
        <label class="fld"><span>${t('gc_to_email')}</span><input class="in" name="toEmail" type="email" required></label>
        <label class="fld"><span>${t('gc_from')}</span><input class="in" name="from" maxlength="40"></label>
        <label class="fld"><span>${t('gc_msg')}</span><textarea class="in" name="msg" maxlength="240" rows="3"></textarea></label>
        <p class="muted small">${t('gc_note')}</p>
        <button class="btn block">${ic('bag')} ${t('add_cart')}</button>
        <div class="gc-check"><h2>${t('gc_balance')}</h2><div class="row"><input class="in" id="gcCode" placeholder="GS-XXXX-XXXX-XXXX"><button class="btn ghost" type="button" data-act="gc-check">${t('check')}</button></div><p id="gcOut" class="muted"></p></div>
      </form></div>`, 'gift');
  };

  /* ---------------- HELP & LEGAL ---------------- */
  S.help = function (topic) {
    const s = ST.settings();
    const qs = ['ship', 'pickup', 'local', 'prod', 'proof', 'change', 'returns', 'photo', 'pay', 'gift'];
    S.page(`<div class="wrap narrow help">
      <h1>${t('nav_help')}</h1><p class="lead">${t('help_lead')}</p>
      <div class="faq">${qs.map(q => `<details id="q-${q}"${(topic === 'versand' && q === 'ship') || (topic === 'rueckgabe' && q === 'returns') ? ' open' : ''}><summary>${t('faq_' + q)}</summary><p>${t('faqa_' + q, { cut: s.cutoff, free: eur(s.freeFrom), local: eur(s.shipping.local.price), dhl: eur(s.shipping.dhl.price), eu: eur(s.shipping.eu.price), min: s.cancelMinutes })}</p></details>`).join('')}</div>
      <div class="help-contact f-sage"><h2>${t('help_contact')}</h2><p>${t('help_contact_p')}</p><div class="vbtns"><a class="btn" href="https://wa.me/${esc(s.shop.wa)}" target="_blank" rel="noopener">${ic('chat')} WhatsApp</a><a class="btn ghost" href="mailto:${esc(s.shop.email)}">${ic('mail')} ${esc(s.shop.email)}</a></div></div>
    </div>`, 'help');
    if (topic) setTimeout(() => { const el = $('details[open]'); if (el) el.scrollIntoView({ block: 'center' }); }, 60);
  };
  S.legal = function (page) {
    const s = ST.settings(); const sh = s.shop;
    const body = {
      impressum: `<h1>${t('imprint')}</h1><p><b>${esc(sh.owner)}</b><br>${esc(sh.street)}<br>${esc(sh.zip)} ${esc(sh.city)}</p><p>${t('phone')}: <bdi dir="ltr">${esc(sh.phone)}</bdi><br>E-Mail: ${esc(sh.email)}</p><p>USt-IdNr.: ${esc(sh.taxId)}</p><p class="note">${t('legal_demo')}</p>`,
      datenschutz: `<h1>${t('privacy')}</h1><p>${t('privacy_p1')}</p><p>${t('privacy_p2')}</p><p>${t('privacy_p3')}</p><p class="note">${t('legal_demo')}</p>`,
      agb: `<h1>${t('terms')}</h1><p>${t('terms_p1')}</p><p>${t('terms_p2')}</p><p>${t('terms_p3')}</p><p class="note">${t('legal_demo')}</p>`,
      widerruf: `<h1>${t('withdrawal')}</h1><p>${t('withdraw_p1')}</p><p><b>${t('withdraw_custom')}</b></p><p>${t('withdraw_p2')}</p><p class="note">${t('legal_demo')}</p>`,
      versand: `<h1>${t('ship_pay')}</h1><table class="tbl"><tr><th>${t('m_pickup')}</th><td>${t('free')}</td></tr><tr><th>${t('m_local')}</th><td>${eur(s.shipping.local.price)}</td></tr><tr><th>${t('m_dhl')}</th><td>${eur(s.shipping.dhl.price)} · ${t('free_from', { n: eur(s.freeFrom) })}</td></tr><tr><th>${t('m_eu')}</th><td>${eur(s.shipping.eu.price)}</td></tr></table><p>${t('pay_list')}</p>`
    }[page] || '';
    S.page(`<div class="wrap narrow legal">${body}</div>`, 'legal');
  };
})();
