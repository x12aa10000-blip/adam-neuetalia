/* Home page, round 8 ("Studio"): the shop's own idea — your name, in gold, on the real thing —
   becomes the first screen. Visitors type a name and see it rendered live on the real product photos,
   then flow through occasions, bestsellers, the box builder, categories, the gift finder,
   new arrivals, gift cards, reviews, our shops, FAQ and the newsletter.
   Uses the Figma palette: pink #FE90BE, purple #6425FE, turquoise #01CAC9 on white.
   Every block stays switchable / sortable in the admin (Website › Startseite). */
(function () {
  'use strict';
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };
  K('s_h1', 'Dein Name, in Gold.', 'Your name, in gold.', 'اسمك، بالذهب.');
  K('s_p', 'Tippe einen Namen und sieh ihn sofort auf echten Geschenken – so, wie wir sie in unserem Laden am Steindamm fertigen.', 'Type a name and see it right away on real gifts – exactly as we make them in our shop on Steindamm.', 'اكتب اسماً وشاهده فوراً على هدايا حقيقية – تماماً كما نصنعها في محلنا بشتايندام.');
  K('s8_rosen', 'Rosenbox', 'Rose box', 'علبة ورد'); K('s8_led', 'Herz mit Licht', 'Light-up heart', 'قلب مضيء'); K('s8_kette', 'Kette', 'Necklace', 'قلادة'); K('s8_hoodie', 'Hoodie', 'Hoodie', 'هودي'); K('s8_flasche', 'Flasche', 'Bottle', 'زجاجة'); K('s8_xxl', 'XXL-Box', 'XXL box', 'علبة XXL');
  K('s_ph', 'Name eingeben', 'Type a name', 'اكتب اسماً');
  K('s_def', 'Lina', 'Lina', 'لينا');
  K('s_go', 'Dieses Geschenk gestalten', 'Design this gift', 'صمّم هذه الهدية');
  K('s_on', 'Dein Name auf', 'Your name on', 'اسمك على');
  K('s_all', 'Alle Geschenke ansehen', 'See all gifts', 'كل الهدايا');
  K('o_h', 'Für jeden Anlass', 'For every occasion', 'لكل مناسبة');
  K('b_h', 'Lieblinge unserer Kunden', 'Our customers’ favourites', 'المفضلة عند زبائننا');
  K('bx_h', 'Packt eure eigene Geschenkbox', 'Pack your own gift box', 'جهّز بوكس هداياك بنفسك');
  K('bx_p', 'Box, Füllung und Schleife wählen, mehrere Geschenke mit Namen hineinlegen, Grußkarte schreiben – und alles live sehen.', 'Choose the box, filling and ribbon, add several named gifts, write a card – and watch it all come together live.', 'اختر البوكس والحشوة والشريطة، وضع عدة هدايا بالأسماء، واكتب بطاقة – وشاهد كل شيء مباشرة.');
  K('bx_b', 'Box gestalten', 'Design your box', 'صمّم بوكسك');
  K('bx_l1', 'Bis zu 8 Geschenke', 'Up to 8 gifts', 'حتى 8 هدايا');
  K('bx_l2', 'Grußkarte gratis', 'Free greeting card', 'بطاقة تهنئة مجاناً');
  K('bx_l3', 'Live-Vorschau', 'Live preview', 'معاينة مباشرة');
  K('c_h', 'Stöbern nach Kategorie', 'Browse by category', 'تصفح حسب القسم');
  K('gc2_h', 'Lass sie selbst wählen', 'Let them choose', 'دعهم يختارون بأنفسهم');
  K('gc2_p', 'Der Geschenkgutschein kommt sofort per E-Mail, mit deiner Nachricht – gültig 3 Jahre, online und im Laden.', 'The gift card arrives instantly by email with your message – valid for 3 years, online and in store.', 'تصل بطاقة الهدية فوراً بالبريد الإلكتروني مع رسالتك – صالحة 3 سنوات في المتجر الإلكتروني والمحل.');
  K('n_h2', 'Neu bei uns', 'New in', 'وصل حديثاً');

  const lang = () => C.lang();
  const nameField = p => p && (p.fields || []).find(f => f.type === 'text' && !f.sf);
  const STUDIO = ['rosenbox-herz', 'herzbox-led', 'kette-datum', 'hoodie-name', 'flasche', 'rosenbox-xxl'];
  const SHORT = { 'rosenbox-herz': 's8_rosen', 'herzbox-led': 's8_led', 'kette-datum': 's8_kette', 'hoodie-name': 's8_hoodie', 'flasche': 's8_flasche', 'rosenbox-xxl': 's8_xxl' };
  const rail = (id, list) => `<div class="rail-w"><button class="rail-nav prev" data-v5="rail" data-r="${id}" data-d="-1" aria-label="${esc(t('h_prev'))}">${ic('back')}</button><div class="prail" id="${id}">${list.map(p => SHOP.card(p)).join('')}</div><button class="rail-nav next" data-v5="rail" data-r="${id}" data-d="1" aria-label="${esc(t('h_next'))}">${ic('chev')}</button></div>`;
  const head = (title, link, label) => `<div class="s8-h rv"><h2>${esc(title)}</h2>${link ? `<a class="s8-more" href="${link}">${esc(label || t('see_all'))} ${ic('chev', 'flip')}</a>` : ''}</div>`;
  const pick = (o, key) => (o && (o[lang()] || o.de)) || t(key);
  const pimg = p => p ? (p.views[0].img || p.views[0].thumb) : '';

  let studioPid = STUDIO[0], studioName = '';
  const _home = SHOP.home;
  SHOP.home = function () {
    const cfg = SITE.get(); const prev = V5.homeBlocks();
    const all = ST.products();
    const studio = STUDIO.map(id => ST.product(id)).filter(p => p && p.active !== false && nameField(p));
    if (!studio.some(p => p.id === studioPid)) studioPid = (studio[0] || {}).id;
    const best = all.filter(p => p.best).concat(all.filter(p => !p.best)).slice(0, 12);
    const fresh = all.filter(p => p.np && ST.minPrice(p) >= 20).reverse().slice(0, 10);
    const s0 = cfg.slides[0] || {};
    const h1 = pick(s0.t && (s0.t[lang()] || s0.t.de) ? s0.t : null, 's_h1');
    const lead = pick(s0.p && (s0.p[lang()] || s0.p.de) ? s0.p : null, 's_p');
    const cnt = o => all.filter(p => (p.occ || []).includes(o)).length;
    const used = new Set(STUDIO);
    const occImg = o => { const l = all.filter(p => (p.occ || []).includes(o)).sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)); const p = l.find(p => !used.has(p.id)) || l[0]; if (!p) return ''; used.add(p.id); return pimg(p); };
    const tile = o => cfg.tiles && cfg.tiles['occ_' + o] && cfg.tiles['occ_' + o].img ? V5.src(cfg.tiles['occ_' + o].img) : `src="${esc(occImg(o))}"`;
    const B = {
      hero: () => `<section class="s8-hero"><div class="wrap s8-hero-in">
        <div class="s8-copy">
          <h1>${esc(h1)}</h1>
          <p class="s8-lead">${esc(lead)}</p>
          <label class="s8-name"><span class="vh">${esc(t('s_ph'))}</span>${ic('edit')}<input id="s8Name" maxlength="14" autocomplete="off" enterkeyhint="done" placeholder="${esc(t('s_ph'))}" value="${esc(studioName)}"></label>
          <div class="s8-picks" role="radiogroup" aria-label="${esc(t('s_on'))}">${studio.map(p => `<button type="button" role="radio" data-s8="${esc(p.id)}" aria-checked="${p.id === studioPid}"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" width="56" height="56"><span>${esc(SHORT[p.id] ? t(SHORT[p.id]) : L(p.name))}</span></button>`).join('')}</div>
          <div class="s8-cta"><a class="btn big" id="s8Go" href="#/p/${esc(studioPid)}">${ic('wand')} ${esc(t('s_go'))}</a><a class="s8-link" href="#/c/alle">${esc(t('s_all'))} ${ic('chev', 'flip')}</a></div>
        </div>
        <a class="s8-stage" id="s8Stage" href="#/p/${esc(studioPid)}" aria-label="${esc(t('s_go'))}"><canvas id="s8Cv" width="900" height="1200"></canvas><span class="s8-tag" id="s8Tag"></span></a>
      </div></section>`,
      usp: () => `<section class="s8-usp"><div class="wrap"><ul>${[['wand', 1], ['store', 2], ['truck', 3], ['gift', 4]].map(([i, n]) => `<li>${ic(i)}<span><b>${esc(SITE.tx('h_u' + n))}</b> ${esc(SITE.tx('h_u' + n + 'd'))}</span></li>`).join('')}</ul></div></section>`,
      occ: () => { const os = ['liebe', 'geburtstag', 'hochzeit', 'muttertag', 'familie']; return `<section class="s8-sec"><div class="wrap">${head(SITE.tx('o_h'), '#/anlass', t('h_occ_all'))}<div class="s8-occ">${os.map((o, i) => `<a class="rv${i === 0 ? ' big' : ''}" href="#/o/${o}"><img ${tile(o)} alt="" loading="lazy" width="800" height="1000"><span><b>${t('occ_' + o)}</b><small>${t('n_products', { n: cnt(o) })}</small></span></a>`).join('')}</div></div></section>`; },
      best: () => `<section class="s8-sec"><div class="wrap">${head(SITE.tx('b_h'), '#/c/alle')}${rail('rBest', best)}</div></section>`,
      promos: () => `<section class="s8-band s8-pink"><div class="wrap s8-band-in">
        <div class="s8-band-t rv"><h2>${esc(SITE.tx('bx_h'))}</h2><p>${esc(SITE.tx('bx_p'))}</p>
          <ul class="s8-ticks">${['bx_l1', 'bx_l2', 'bx_l3'].map(k => `<li>${ic('check')} ${esc(t(k))}</li>`).join('')}</ul>
          <a class="btn big" href="#/box">${ic('box')} ${esc(SITE.tx('bx_b'))}</a></div>
        <a class="s8-band-i rv" href="#/box" tabindex="-1" aria-hidden="true"><img src="img/o/box-hero.jpg" alt="" loading="lazy" width="900" height="774"></a>
      </div></section>`,
      cats: () => `<section class="s8-sec"><div class="wrap">${head(SITE.tx('c_h'), '#/c/alle')}<div class="s8-cats">${CAT_EXTRA.cats.map(c => `<a class="rv" href="#/c/${c}"><span><img src="${esc(SHOP.catImg(c))}" alt="" loading="lazy" width="400" height="400"></span><b>${t('cat_' + c)}</b></a>`).join('')}<a class="rv" href="#/gutschein"><span class="gc"><img src="${SHOP.giftcardImg()}" alt="" loading="lazy"></span><b>${t('nav_gift')}</b></a></div></div></section>`,
      new: () => fresh.length ? `<section class="s8-sec"><div class="wrap">${head(SITE.tx('n_h2'), '#/c/alle')}${rail('rNew', fresh)}</div></section>` : '',
      quick: () => { const items = [['#/o/geburtstag', 'occ_geburtstag', 'kette-datum'], ['#/o/liebe', 'occ_liebe', 'rosenbox-herz'], ['#/c/rosen', 'cat_rosen', 'rosenbox-rund'], ['#/box', 'nav_box', 'geschenkbox-liebe'], ['#/o/muttertag', 'occ_muttertag', 'rose-glas'], ['#/c/schmuck', 'cat_schmuck', 'np-kette-herz'], ['#/o/hochzeit', 'occ_hochzeit', 'rosenbox-xxl'], ['#/gutschein', 'nav_gift', '']]; return `<section class="qk"><div class="wrap"><span class="qk-h">${t('h_quick')}</span><nav class="qk-row">${items.map(([h, k, pid]) => { const p = pid && ST.product(pid); return `<a href="${h}">${p ? `<img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" width="34" height="34" loading="lazy">` : `<i>${ic('cards')}</i>`}<span>${t(k)}</span></a>`; }).join('')}</nav></div></section>`; },
      finder: () => { const occOpts = CAT_EXTRA.occ.filter(o => !['fuersie', 'fuerihn', 'kinder'].includes(o)); return `<section class="s8-sec"><div class="wrap"><form class="s8-finder rv" data-form="finder"><div class="s8-finder-t"><h2>${esc(SITE.tx('h_fd_h'))}</h2><p>${esc(SITE.tx('h_fd_p'))}</p></div>
        <div class="s8-finder-f"><label><span>${t('finder_occ')}</span><select class="in" name="occ"><option value="">${t('all')}</option>${occOpts.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select></label>
        <label><span>${t('finder_who')}</span><select class="in" name="who"><option value="">${t('who_all')}</option><option value="fuersie">${t('who_her')}</option><option value="fuerihn">${t('who_him')}</option><option value="kinder">${t('who_kids')}</option></select></label>
        <label><span>${t('finder_budget')}</span><span class="s8-eur"><input class="in" name="max" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('any'))}"><b>€</b></span></label>
        <button class="btn big">${ic('search')} ${t('finder_go')}</button></div></form></div></section>`; },
      news: () => { const coupon = ST.coupons().find(c => c.on && c.type === 'pct' && (!c.until || new Date(c.until) > new Date())); return `<section class="s8-band s8-ink"><div class="wrap s8-news rv"><div><h2>${esc(SITE.tx('news_h'))}</h2><p>${esc(SITE.tx('news_p'))}${coupon ? ' ' + esc(t('h_news_code', { c: coupon.code, n: coupon.value })) : ''}</p></div><form data-form="news"><input class="in" type="email" name="email" required placeholder="${esc(t('email'))}" aria-label="${esc(t('email'))}"><button class="btn big">${t('news_btn')}</button></form></div></section>`; },
      gift: () => `<section class="s8-band s8-purple"><div class="wrap s8-band-in s8-swap">
        <div class="s8-band-t rv"><h2>${esc(SITE.tx('gc2_h'))}</h2><p>${esc(SITE.tx('gc2_p'))}</p><a class="btn big" href="#/gutschein">${ic('cards')} ${esc(t('gc_cta'))}</a></div>
        <a class="s8-band-i gc rv" href="#/gutschein" tabindex="-1" aria-hidden="true"><img src="${SHOP.giftcardImg()}" alt="" loading="lazy"></a>
      </div></section>`
    };
    const blocks = Object.assign({}, prev, B);
    SHOP.page(cfg.sections.filter(x => x.on && blocks[x.id]).map(x => blocks[x.id]()).join(''), 'home');
    try { SHOP.heroInit(); SHOP.wallInit(); SHOP.carouInit(); } catch (e) { }
    studioInit();
  };

  /* ---------- live studio ---------- */
  let drawing = 0;
  async function studioDraw() {
    const cv = $('#s8Cv'); if (!cv) return; const my = ++drawing;
    const p = ST.product(studioPid); if (!p) return;
    const nm = (studioName || '').trim() || t('s_def');
    const Dd = ENG.blankDesign(p); const nf = nameField(p); if (nf) Dd.f[nf.id] = nf.upper ? nm.toUpperCase() : nm;
    const w = Math.min(1100, Math.round((cv.parentElement.clientWidth || 600) * Math.min(2, devicePixelRatio || 1)));
    const off = document.createElement('canvas');
    try { await ENG.render(off, p, 0, Dd, { maxW: w, force: true }); } catch (e) { return; }
    if (my !== drawing || !document.body.contains(cv)) return;
    cv.width = off.width; cv.height = off.height; cv.getContext('2d').drawImage(off, 0, 0);
    cv.parentElement.classList.add('ready');
    const href = '#/p/' + p.id + (studioName.trim() ? '?n=' + encodeURIComponent(studioName.trim()) : '');
    const go = $('#s8Go'), st = $('#s8Stage'), tag = $('#s8Tag');
    if (go) go.href = href; if (st) st.href = href;
    if (tag) tag.innerHTML = `<b>${esc(L(p.name))}</b>${SHOP.priceHTML(p)}`;
  }
  function studioInit() {
    const inp = $('#s8Name'); if (!inp) return;
    inp.addEventListener('input', C.debounce(() => { studioName = inp.value; studioDraw(); }, 90));
    if ('IntersectionObserver' in window) { const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { o.disconnect(); studioDraw(); } }); o.observe($('#s8Stage')); } else studioDraw();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-s8]'); if (!b) return;
    studioPid = b.dataset.s8; $$('[data-s8]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    studioDraw();
  });
  let rs; window.addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => { if ($('#s8Cv')) studioDraw(); }, 250); });
})();
