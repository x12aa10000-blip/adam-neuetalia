/* Home page, premium layout (ideas from BLUME2000 and other flower shops):
   big campaign slider, popular quick links, promise bar, product rails with arrows,
   occasion tiles, two promo banners, categories, live name preview, gift finder,
   reviews, our shops, FAQ, newsletter. Every block can be switched/sorted in the admin. */
(function () {
  'use strict';
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };
  K('h_s1_e', 'Handgemacht in Hamburg', 'Handmade in Hamburg', 'صناعة يدوية في هامبورغ');
  K('h_s1_t', 'Rosen, die für immer bleiben', 'Roses that last forever', 'ورد بيضل للأبد');
  K('h_s1_p', 'Echte, haltbare Rosen mit eurem Namen in Gold – live auf dem echten Produkt gestaltet.', 'Real preserved roses with your name in gold – designed live on the real product.', 'ورد طبيعي محفوظ مع اسمكم بالذهب – بتشوفوه مباشرة على المنتج الحقيقي.');
  K('h_s1_b', 'Jetzt gestalten', 'Design now', 'صمّمها هلق');
  K('h_s2_e', 'Für Verliebte', 'For lovers', 'للعشّاق');
  K('h_s2_t', 'Ein Herz, das für euch leuchtet', 'A heart that shines for you', 'قلب بينوّر بأسمائكم');
  K('h_s2_p', 'Rosenherz mit Licht, euren Namen und eurem besonderen Datum.', 'A rose heart with light, your names and your special date.', 'علبة قلب مع ورد وإضاءة، وأسماءكم وتاريخكم المميز.');
  K('h_s2_b', 'Zum Herz', 'See the heart', 'شوف القلب');
  K('h_s3_e', 'Erinnerungen', 'Memories', 'ذكريات');
  K('h_s3_t', 'Euer Foto im Kristall', 'Your photo in crystal', 'صورتكم جوّا الكريستال');
  K('h_s3_p', 'Mit warmem Licht – ein Geschenk, das jeden Abend wieder strahlt.', 'With warm light – a gift that glows again every evening.', 'مع إضاءة دافية – هدية بتلمع كل ليلة من جديد.');
  K('h_s3_b', 'Foto hochladen', 'Upload a photo', 'ارفع صورتك');
  K('h_all', 'Alle Geschenke', 'All gifts', 'كل الهدايا');
  K('h_quick', 'Beliebt', 'Popular', 'الأكثر طلباً');
  K('h_u1', 'Live-Vorschau', 'Live preview', 'معاينة مباشرة');
  K('h_u1d', 'Dein Name direkt auf dem echten Produkt', 'Your name right on the real product', 'اسمك مباشرة على المنتج الحقيقي');
  K('h_u2', 'Handgemacht', 'Handmade', 'شغل يدوي');
  K('h_u2d', 'Mit Liebe in unserem Laden in Hamburg', 'With love in our Hamburg shop', 'بحب بمحلنا بهامبورغ');
  K('h_u3', 'Lieferung am Wunschtag', 'Delivery on your date', 'توصيل باليوم اللي بدك ياه');
  K('h_u3d', 'Kurier in Hamburg, DHL in ganz Deutschland', 'Courier in Hamburg, DHL across Germany', 'مندوب بهامبورغ، و DHL لكل ألمانيا');
  K('h_u4', 'Geschenkfertig', 'Gift-ready', 'جاهزة للإهداء');
  K('h_u4d', 'Verpackung & Grußkarte auf Wunsch', 'Wrapping & greeting card on request', 'تغليف وكرت تهنئة حسب طلبك');
  K('h_occ_h', 'Sag es mit einem Geschenk', 'Say it with a gift', 'قولها بهدية');
  K('h_occ_all', 'Alle Anlässe', 'All occasions', 'كل المناسبات');
  K('h_box_e', 'Neu', 'New', 'جديد');
  K('h_box_t', 'Deine eigene Geschenkbox', 'Your very own gift box', 'بوكس الهدايا تبعك');
  K('h_box_p', 'Box wählen, Geschenke mit Namen sammeln, Grußkarte schreiben – und alles live sehen.', 'Pick a box, collect gifts with names, write a card – and see it all live.', 'اختار البوكس، اجمع هدايا بالأسماء، اكتب كرت – وشوف كل شي مباشرة.');
  K('h_box_b', 'Box gestalten', 'Design a box', 'صمّم بوكسك');
  K('h_gc_e', 'Immer passend', 'Always right', 'دايماً مناسبة');
  K('h_gc_t', 'Geschenkgutschein', 'Gift card', 'بطاقة هدية');
  K('h_gc_p', 'Sofort per E-Mail, mit deiner persönlichen Nachricht.', 'Instantly by e-mail, with your personal message.', 'بتوصل فوراً بالإيميل مع رسالتك.');
  K('h_gc_b', 'Gutschein schenken', 'Give a gift card', 'اهدِ بطاقة');
  K('h_cats_h', 'Stöbern nach Kategorie', 'Browse by category', 'تصفح حسب القسم');
  K('h_fd_h', 'Finde das perfekte Geschenk', 'Find the perfect gift', 'لاقي الهدية المثالية');
  K('h_fd_p', 'Anlass, für wen und dein Budget – wir zeigen dir passende Ideen.', 'Occasion, who it is for and your budget – we show you matching ideas.', 'المناسبة، لمين، والميزانية – ومنفرجيك أفكار مناسبة.');
  K('h_news_code', 'Mit dem Code {c} sparst du {n} % auf deine erste Bestellung.', 'Save {n}% on your first order with the code {c}.', 'مع الكود {c} بتوفّر {n}% على أول طلب.');
  K('h_prev', 'Zurück', 'Previous', 'السابق');
  K('h_next', 'Weiter', 'Next', 'التالي');

  const SLIDE_DEF = [['rosenbox-herz', 'h_s1'], ['herzbox-led', 'h_s2'], ['kristallherz', 'h_s3']];
  const pick = (o, key) => (o && (o[C.lang()] || o.de)) || t(key);
  const img = id => { const p = ST.product(id); return p ? (p.views[0].img || p.views[0].thumb) : ''; };
  const thumb = id => { const p = ST.product(id); return p ? (p.views[0].thumb || p.views[0].img) : ''; };
  const rail = (id, list) => `<div class="rail-w"><button class="rail-nav prev" data-v5="rail" data-r="${id}" data-d="-1" aria-label="${esc(t('h_prev'))}">${ic('back')}</button><div class="prail" id="${id}">${list.map(p => SHOP.card(p)).join('')}</div><button class="rail-nav next" data-v5="rail" data-r="${id}" data-d="1" aria-label="${esc(t('h_next'))}">${ic('chev')}</button></div>`;
  const sh = (title, link, label) => `<div class="sh rv"><h2 class="ttl">${esc(title)}</h2>${link ? `<a class="more" href="${link}">${esc(label || t('see_all'))} ${ic('chev', 'flip')}</a>` : ''}</div>`;

  SHOP.home = function () {
    const cfg = SITE.get(); const old = V5.homeBlocks();
    const all = ST.products();
    const best = all.filter(p => p.best).concat(all.filter(p => !p.best)).slice(0, 12);
    const fresh = all.filter(p => p.np && ST.minPrice(p) >= 20).reverse().slice(0, 10);
    const slides = cfg.slides.slice(0, 3).map((s, i) => { const [pid, k] = SLIDE_DEF[i] || SLIDE_DEF[0]; return { img: s.img ? V5.src(s.img) : `src="${esc(img(pid))}"`, e: pick(s.e, k + '_e'), t: pick(s.t, k + '_t'), p: pick(s.p, k + '_p'), b: pick(s.b, k + '_b'), link: s.link || '#/p/' + pid }; });
    const coupon = ST.coupons().find(c => c.on && c.type === 'pct' && (!c.until || new Date(c.until) > new Date()));
    const B = {
      hero: () => `<section class="hx2"><div class="wrap"><div class="hx2-in" id="hx2" aria-roledescription="carousel">
        ${slides.map((s, i) => `<article class="hx2-s${i ? '' : ' on'}" data-i="${i}" aria-hidden="${i ? 'true' : 'false'}">
          <div class="hx2-txt"><span class="hx2-e">${esc(s.e)}</span>${i ? `<h2 class="hx2-t">${esc(s.t)}</h2>` : `<h1 class="hx2-t">${esc(s.t)}</h1>`}<p>${esc(s.p)}</p>
            <div class="vbtns"><a class="btn big" href="${esc(s.link)}"${i ? ' tabindex="-1"' : ''}>${esc(s.b)}</a><a class="btn ghost big" href="#/c/alle"${i ? ' tabindex="-1"' : ''}>${t('h_all')}</a></div></div>
          <a class="hx2-img" href="${esc(s.link)}" tabindex="-1" aria-hidden="true"><img ${s.img} alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1200" height="1200"></a></article>`).join('')}
        <div class="hx2-nav"><button data-v5="hx" data-d="-1" aria-label="${esc(t('h_prev'))}">${ic('back')}</button><span class="hx2-dots">${slides.map((s, i) => `<button data-v5="hx" data-i="${i}" aria-label="${i + 1}" aria-current="${i === 0}"></button>`).join('')}</span><button data-v5="hx" data-d="1" aria-label="${esc(t('h_next'))}">${ic('chev')}</button></div>
      </div></div></section>`,
      quick: () => { const items = [['#/o/geburtstag', 'occ_geburtstag', 'kette-datum'], ['#/o/liebe', 'occ_liebe', 'rosenbox-herz'], ['#/c/rosen', 'cat_rosen', 'rosenbox-rund'], ['#/box', 'nav_box', 'geschenkbox-liebe'], ['#/o/muttertag', 'occ_muttertag', 'rose-glas'], ['#/c/schmuck', 'cat_schmuck', 'np-kette-herz'], ['#/o/hochzeit', 'occ_hochzeit', 'rosenbox-xxl'], ['#/gutschein', 'nav_gift', '']]; return `<section class="qk"><div class="wrap"><span class="qk-h">${t('h_quick')}</span><nav class="qk-row">${items.map(([h, k, pid]) => `<a href="${h}">${pid ? `<img src="${esc(thumb(pid))}" alt="" width="34" height="34" loading="lazy">` : `<i>${ic('cards')}</i>`}<span>${t(k)}</span></a>`).join('')}</nav></div></section>`; },
      usp: () => `<section class="usp"><div class="wrap"><ul>${[['wand', 1], ['store', 2], ['truck', 3], ['gift', 4]].map(([i, n]) => `<li><i>${ic(i)}</i><span><b>${esc(SITE.tx('h_u' + n))}</b><small>${esc(SITE.tx('h_u' + n + 'd'))}</small></span></li>`).join('')}</ul></div></section>`,
      best: () => `<section class="sec"><div class="wrap">${sh(SITE.tx('best_h'), '#/c/alle')}${rail('rBest', best)}</div></section>`,
      new: () => fresh.length ? `<section class="sec"><div class="wrap">${sh(SITE.tx('new_h'), '#/c/alle')}${rail('rNew', fresh)}</div></section>` : '',
      occ: () => { const os = ['liebe', 'geburtstag', 'muttertag', 'hochzeit']; const used = new Set(best.slice(0, 4).map(p => p.id).concat(SLIDE_DEF.map(x => x[0]))); const oi = o => { const l = all.filter(p => (p.occ || []).includes(o)).sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)); const p = l.find(p => !used.has(p.id)) || l[0]; if (!p) return ''; used.add(p.id); return p.views[0].img || p.views[0].thumb; }; return `<section class="sec"><div class="wrap">${sh(SITE.tx('h_occ_h'), '#/anlass', t('h_occ_all'))}<div class="oc4">${os.map(o => `<a class="rv" href="#/o/${o}"><img src="${esc(oi(o))}" alt="" loading="lazy" width="600" height="800"><span>${t('occ_' + o)}<small>${t('n_products', { n: all.filter(p => (p.occ || []).includes(o)).length })}</small></span></a>`).join('')}</div></div></section>`; },
      promos: () => `<section class="sec"><div class="wrap pr2">
        <a class="pbn rv" href="#/box"><span class="pbn-t"><small>${esc(SITE.tx('h_box_e'))}</small><b>${esc(SITE.tx('h_box_t'))}</b><span>${esc(SITE.tx('h_box_p'))}</span><em class="btn">${ic('box')} ${esc(SITE.tx('h_box_b'))}</em></span><span class="pbn-i"><img src="img/o/box-hero.jpg" alt="" loading="lazy" width="900" height="774"></span></a>
        <a class="pbn alt rv" data-i="1" href="#/gutschein"><span class="pbn-t"><small>${esc(SITE.tx('h_gc_e'))}</small><b>${esc(SITE.tx('h_gc_t'))}</b><span>${esc(SITE.tx('h_gc_p'))}</span><em class="btn">${ic('cards')} ${esc(SITE.tx('h_gc_b'))}</em></span><span class="pbn-i gc"><img src="${SHOP.giftcardImg()}" alt="" loading="lazy"></span></a>
      </div></section>`,
      cats: () => `<section class="sec"><div class="wrap">${sh(SITE.tx('h_cats_h'), '#/c/alle')}<div class="rail cats2">${CAT_EXTRA.cats.map(c => `<a class="circ" href="#/c/${c}"><span class="ph"><img src="${esc(SHOP.catImg(c))}" alt="" loading="lazy"></span><b>${t('cat_' + c)}</b></a>`).join('')}</div></div></section>`,
      finder: () => { const occOpts = CAT_EXTRA.occ.filter(o => !['fuersie', 'fuerihn', 'kinder'].includes(o)); return `<section class="sec"><div class="wrap"><form class="fd2 rv" data-form="finder"><div class="fd2-t"><h2>${ic('sparkle')} ${esc(SITE.tx('h_fd_h'))}</h2><p>${esc(SITE.tx('h_fd_p'))}</p></div>
        <div class="fd2-f"><label><span class="vh">${t('finder_occ')}</span><select class="in" name="occ"><option value="">${t('finder_occ')}</option>${occOpts.map(o => `<option value="${o}">${t('occ_' + o)}</option>`).join('')}</select></label>
        <label><span class="vh">${t('finder_who')}</span><select class="in" name="who"><option value="">${t('finder_who')}</option><option value="fuersie">${t('who_her')}</option><option value="fuerihn">${t('who_him')}</option><option value="kinder">${t('who_kids')}</option></select></label>
        <label class="fd-bud"><span class="vh">${t('finder_budget')}</span><input class="in" name="max" type="number" min="1" step="any" inputmode="decimal" placeholder="${esc(t('finder_budget_ph'))}"><b>€</b></label>
        <button class="btn">${ic('search')} ${t('finder_go')}</button></div></form></div></section>`; },
      news: () => `<section class="sec"><div class="wrap"><div class="news2 rv"><div><h2>${esc(SITE.tx('news_h'))}</h2><p>${esc(SITE.tx('news_p'))}${coupon ? ' ' + esc(t('h_news_code', { c: coupon.code, n: coupon.value })) : ''}</p></div><form data-form="news"><input class="in" type="email" name="email" required placeholder="${esc(t('email'))}" aria-label="${esc(t('email'))}"><button class="btn">${t('news_btn')}</button></form></div></div></section>`
    };
    const blocks = Object.assign({}, old, B);
    SHOP.page(cfg.sections.filter(x => x.on && blocks[x.id]).map(x => blocks[x.id]()).join(''), 'home');
    SHOP.heroInit(); SHOP.wallInit(); SHOP.carouInit(); heroStart();
  };

  /* slider */
  let hxT = null, hxI = 0;
  function hxGo(i) {
    const s = $$('#hx2 .hx2-s'); if (!s.length) return;
    hxI = (i + s.length) % s.length;
    s.forEach((x, k) => { const on = k === hxI; x.classList.toggle('on', on); x.setAttribute('aria-hidden', String(!on)); $$('a', x).forEach(a => { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); }); });
    $$('#hx2 .hx2-dots button').forEach((b, k) => b.setAttribute('aria-current', String(k === hxI)));
  }
  function heroStart() {
    clearInterval(hxT); hxI = 0; const h = $('#hx2'); if (!h) return;
    if (!C.reduced()) hxT = setInterval(() => { if (!document.hidden && !document.body.classList.contains('em-on') && document.body.contains(h) && !h.matches(':hover')) hxGo(hxI + 1); else if (!document.body.contains(h)) clearInterval(hxT); }, 6500);
    let x0 = null; h.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    h.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) hxGo(hxI + ((dx < 0) !== (document.documentElement.dir === 'rtl') ? 1 : -1)); }, { passive: true });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-v5=hx],[data-v5=rail]'); if (!b) return;
    if (b.dataset.v5 === 'hx') { clearInterval(hxT); if (b.dataset.i != null) hxGo(+b.dataset.i); else hxGo(hxI + (+b.dataset.d)); return; }
    const r = document.getElementById(b.dataset.r); if (!r) return;
    const w = (r.children[0] || {}).clientWidth || 260;
    r.scrollBy({ left: (+b.dataset.d) * (w + 18) * 2 * (document.documentElement.dir === 'rtl' ? -1 : 1), behavior: C.reduced() ? 'auto' : 'smooth' });
  });
})();
