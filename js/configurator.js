/* Product page with live personalisation on the original product photo. */
(function () {
  'use strict';
  const P = {};
  window.PDP = P;
  let CUR = null; // {p, D, vi, qty, editId}
  const IN_APP = /; wv\)|\bwv\b/i.test(navigator.userAgent || '');

  function fieldVisible(p, f, D) {
    if (!f.show) return true;
    const o = (p.opts || []).find(o => o.id === f.show.opt);
    const v = (D.opt && D.opt[f.show.opt]) || (o && o.def);
    if (f.show.gte != null) return +v >= f.show.gte;
    return true;
  }
  const SPOTIFY_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1DB954"/><path d="M6.5 9.3c3.8-1.1 8.1-.8 11.2 1M7.2 12.4c3.1-.9 6.5-.6 9.2.9M7.9 15.3c2.5-.7 5-.5 7.1.7" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  const masterOf = (p, f) => f.sf ? ENG.fieldById(p, f.sf) : f;
  const fontsOf = (p, f) => { const m = masterOf(p, f); return (m && m.fonts) || [m && m.font || 'times']; };
  const zonesFor = (p, fid) => p.views.flatMap((v, vi) => v.zones.map(z => ({ z, vi }))).filter(({ z }) => z.f === fid || ENG.styleField(z) === fid || (z.tpl && z.tpl.includes('{' + fid)));
  const pageOf = (p, fid) => { const r = zonesFor(p, fid); return r.length ? r[0].vi : 0; };

  /* ---------------- encode / decode shared designs ---------------- */
  P.encode = function (D) { const x = { f: D.f, font: D.font, color: D.color, size: D.size, opt: D.opt }; try { return btoa(unescape(encodeURIComponent(JSON.stringify(x)))).replace(/=+$/, ''); } catch (e) { return ''; } };
  P.decode = function (s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } };

  /* ---------------- page ---------------- */
  P.show = function (id, q) {
    const p = ST.product(id);
    if (!p || (!p.active && !q.preview)) { SHOP.page(`<div class="wrap empty"><h1>${t('not_found')}</h1><a class="btn" href="#/c/alle">${t('nav_shop')}</a></div>`); return; }
    if (p.id === 'gutschein') { C.go('#/gutschein'); return; }
    ST.pushRecent(p.id);
    const D = ENG.blankDesign(p);
    for (const o of (p.opts || [])) D.opt[o.id] = o.def;
    let editId = null;
    if (q.edit) { const it = ST.cart().find(i => i.id === q.edit); if (it && it.pid === p.id) { Object.assign(D, JSON.parse(JSON.stringify(it.D))); editId = it.id; } }
    else if (q.d) { const x = P.decode(q.d); if (x) for (const k of ['f', 'font', 'color', 'size', 'opt']) Object.assign(D[k], x[k] || {}); }
    else if (q.n) { const nf = p.fields.find(f => f.type === 'text' && !f.sf); if (nf) D.f[nf.id] = q.n; }
    CUR = { p, D, vi: 0, qty: 1, editId };
    if (editId) { const it = ST.cart().find(i => i.id === editId); CUR.qty = it.qty; }
    const s = ST.settings();
    const prodDays = p.sd ? 0 : (p.prod || 2);
    const ready = ST.readyDate(prodDays), dhl = ST.deliveryDate('dhl', prodDays);
    const mins = ST.minutesToCutoff();
    const sameDay = p.sd && mins > 0 && ST.isWorkday(new Date());
    const wished = ST.wishlist().includes(p.id);
    const reviews = ST.reviews(p.id).filter(r => r.ok);
    const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0;
    const qs = ST.questions(p.id).filter(x => x.answer);
    const related = ST.products().filter(x => x.id !== p.id && (x.occ || []).some(o => (p.occ || []).includes(o))).sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat) || (b.best ? 1 : 0) - (a.best ? 1 : 0)).slice(0, 4);
    const recent = ST.recent().filter(x => x !== p.id).map(x => ST.product(x)).filter(x => x && x.active).slice(0, 4);
    const saleEnd = ST.onSale(p) && p.saleEnd ? p.saleEnd : '';
    SHOP.page(`<div class="wrap pdp-crumb"><a href="#/c/${esc(p.cat)}">${ic('back', 'flip')} ${t('cat_' + p.cat)}</a></div>
    <div class="wrap pdp">
      <div class="stage-col">
        <div class="stage" id="stage"><canvas id="pv" aria-label="${esc(t('live_preview'))}"></canvas>
          <div class="stage-tools"><button class="chip" data-act="orig" aria-pressed="false">${ic('eye')} ${t('show_original')}</button><button class="chip" data-act="zoom">${ic('zoomIn')} ${t('zoom')}</button></div>
          <div class="stage-busy" hidden></div>
        </div>
        ${p.views.length > 1 ? `<div class="thumbs" role="tablist">${p.views.map((v, i) => `<button role="tab" data-view="${i}" aria-selected="${i === 0}"><img src="${esc(v.thumb)}" alt="" width="80" height="80">${v.zones.length ? '' : `<span>${t('example')}</span>`}</button>`).join('')}</div>` : ''}
        <p class="stage-note">${ic('wand')} ${t('live_note')}</p>
      </div>
      <div class="buy-col">
        <div class="ptechs">${SHOP.techTag(p)}${p.fields.length ? `<span class="ptag t-custom">${t('tag_custom')}</span>` : ''}</div>
        <h1>${esc(L(p.name))}</h1>
        <div class="pricebox"><span id="price">${SHOP.priceHTML(p, D)}</span>${ST.onSale(p) ? `<span class="psale2">−${Math.round((1 - p.salePrice / p.price) * 100)} %</span>` : ''}<span class="vat">${t('incl_vat')}</span>${saleEnd ? `<span class="countdown" data-end="${esc(saleEnd)}"></span>` : ''}</div>
        ${reviews.length ? `<a class="stars" href="#reviews">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} <span>${avg.toFixed(1)} · ${t('n_reviews', { n: reviews.length })}</span></a>` : ''}
        <p class="pdesc">${esc(L(p.desc))}</p>
        <form id="cfg" class="cfg" data-form="cfg" novalidate></form>
        ${p.fields.length ? `<button type="button" class="btn ghost block see-btn only-s" data-act="zoom">${ic('eye')} ${t('see_design_long')}</button>` : ''}
        <div class="eta">
          ${sameDay ? `<p class="eta-hot">${ic('bike')} ${t('eta_same', { h: Math.floor(mins / 60), m: mins % 60 })}</p>` : ''}
          <p>${ic('store')} ${t('eta_pickup', { d: C.date(ready) })}</p>
          <p>${ic('truck')} ${t('eta_dhl', { d: C.date(dhl) })}</p>
        </div>
        ${p.stock <= 0 ? `<p class="warn">${t('sold_out_long')}</p>` : p.stock <= 3 ? `<p class="warn">${t('low_stock', { n: p.stock })}</p>` : ''}
        <div class="buyrow">
          <div class="qty" role="group" aria-label="${esc(t('qty'))}"><button type="button" data-act="qm" aria-label="−">${ic('minus')}</button><output id="qty">${CUR.qty}</output><button type="button" data-act="qp" aria-label="+">${ic('plus')}</button></div>
          <button class="btn grow" data-act="add"${p.stock <= 0 ? ' disabled' : ''}>${ic('bag')} ${editId ? t('update_cart') : t('add_cart')}</button>
          <button class="ibtn wishbig${wished ? ' on' : ''}" data-act="wish" data-id="${esc(p.id)}" aria-pressed="${wished}" aria-label="${esc(t('wishlist'))}">${ic('heart')}</button>
        </div>
        <div class="minor"><button class="link" data-act="save-design">${ic('heart')} ${t('save_design')}</button><button class="link" data-act="share-design">${ic('share')} ${t('share_design')}</button></div>
        ${(() => { const c = ST.coupons().find(c => c.on && c.type === 'pct' && (!c.until || new Date(c.until) > new Date())); return c ? `<p class="promo-bar">${ic('gift')} <span>${t('promo_code', { n: c.value })}</span> <b>${esc(c.code)}</b></p>` : ''; })()}
        <ul class="trust"><li>${ic('store')} ${t('trust_made')}</li><li>${ic('eye')} ${t('trust_proof')}</li><li>${ic('gift')} ${t('trust_wrap', { p: eur(s.wrap) })}</li></ul>
      </div>
    </div>
    <div class="wrap pdp-more">
      <section class="tabs" id="details">
        <details open><summary>${t('details')}</summary><dl class="spec"><dt>${t('material')}</dt><dd>${esc(L(p.mat))}</dd><dt>${t('size')}</dt><dd>${esc(L(p.size))}</dd><dt>${t('production')}</dt><dd>${p.sd ? t('prod_same') : t('prod_days', { n: p.prod || 2 })}</dd><dt>${t('technique')}</dt><dd>${esc(P.technique(p))}</dd><dt>${t('art_no')}</dt><dd><bdi dir="ltr">${esc(p.id.toUpperCase())}</bdi></dd></dl></details>
        <details><summary>${t('delivery_returns')}</summary><p>${t('pdp_ship', { free: eur(s.freeFrom), dhl: eur(s.shipping.dhl.price), local: eur(s.shipping.local.price) })}</p><p>${t('pdp_returns')}</p></details>
        <details id="reviews"${reviews.length ? '' : ''}><summary>${t('reviews')} (${reviews.length})</summary>
          ${reviews.length ? reviews.map(r => `<blockquote class="rev"><b>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</b><p>${esc(r.text)}</p><cite>${esc(r.name)} · ${C.date(r.at, { month: 'long', year: 'numeric' })}${r.verified ? ' · ' + t('verified') : ''}</cite>${r.reply ? `<p class="reply"><b>${esc(ST.settings().shop.name)}:</b> ${esc(r.reply)}</p>` : ''}</blockquote>`).join('') : `<p class="muted">${t('no_reviews')}</p>`}
          <form class="mini" data-form="review" data-pid="${esc(p.id)}"><h3>${t('write_review')}</h3><div class="starpick" role="radiogroup" aria-label="${esc(t('stars'))}">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="stars" value="${n}"${n === 5 ? ' checked' : ''}><span>★</span></label>`).join('')}</div>
            <input class="in" name="name" required maxlength="40" placeholder="${esc(t('your_name'))}"><textarea class="in" name="text" required maxlength="600" rows="3" placeholder="${esc(t('review_ph'))}"></textarea><button class="btn ghost sm">${t('send')}</button><p class="muted small">${t('review_note')}</p></form>
        </details>
        <details id="faq"><summary>${t('questions')} (${qs.length})</summary>
          ${qs.length ? qs.map(x => `<div class="qa"><p class="q">${esc(x.text)}</p><p class="a">${esc(x.answer)}</p></div>`).join('') : `<p class="muted">${t('no_questions')}</p>`}
          <form class="mini" data-form="question" data-pid="${esc(p.id)}"><h3>${t('ask_q')}</h3><textarea class="in" name="text" required maxlength="400" rows="2" placeholder="${esc(t('ask_ph'))}"></textarea><input class="in" name="email" type="email" required placeholder="${esc(t('email_for_answer'))}"><button class="btn ghost sm">${t('send')}</button></form>
        </details>
      </section>
      ${related.length ? `<section class="sec-s"><h2>${t('goes_with')}</h2>${SHOP.grid(related)}</section>` : ''}
      ${recent.length ? `<section class="sec-s"><h2>${t('recently')}</h2>${SHOP.grid(recent)}</section>` : ''}
    </div>
    <div class="sticky-buy only-s"><button class="btn ghost sp-eye" data-act="zoom" type="button">${ic('eye')} ${t('see_design')}</button><span id="sprice">${SHOP.priceHTML(p, D)}</span><button class="btn" data-act="add"${p.stock <= 0 ? ' disabled' : ''}>${ic('bag')} ${editId ? t('update_cart') : t('add_cart')}</button></div>`, 'pdp');
    P.fields();
    P.draw(true);
    P.countdown();
    const pre = ENG.neededFonts(p, D); pre.forEach(ENG.loadFont);
    for (const f of p.fields) for (const id of (f.fonts || [])) ENG.loadFont(id);
  };
  P.technique = function (p) {
    const k = new Set(); for (const v of p.views) for (const z of v.zones) { const x = z.t === 'photo' ? 'photo' : (z.fx && z.fx.k) || 'print'; k.add(x); }
    return [...k].map(x => t('tech_' + x)).join(' · ') || t('tech_print');
  };
  P.countdown = function () {
    const el = $('.countdown'); if (!el) return;
    const end = new Date(el.dataset.end);
    const tick = () => { if (!document.body.contains(el)) return clearInterval(P._cd); const ms = end - Date.now(); if (ms <= 0) { el.textContent = ''; return clearInterval(P._cd); } const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); el.textContent = t('sale_ends', { d, h, m }); };
    tick(); clearInterval(P._cd); P._cd = setInterval(tick, 30000);
  };

  /* ---------------- fields UI ---------------- */
  P.fields = function () {
    const { p, D } = CUR; const box = $('#cfg'); if (!box) return;
    let h = '';
    for (const o of (p.opts || [])) {
      const v = D.opt[o.id] || o.def;
      const vimg = c => { const V = p.views.find(w => w.when && w.when.opt === o.id && w.when.eq === c.id); return V ? (V.thumb || V.img) : ''; };
      if (o.choices.some(c => vimg(c))) {
        const cur = o.choices.find(c => c.id === v) || o.choices[0];
        h += `<div class="fld"><span class="lb">${t(o.label)}<small>${esc(L(cur.l))}${cur.price ? ' · +' + eur(cur.price) : ''}</small></span><div class="vchips">${o.choices.map(c => `<button type="button" data-opt="${o.id}" data-val="${esc(c.id)}" aria-pressed="${c.id === v}" title="${esc(L(c.l))}">${vimg(c) ? `<img src="${esc(vimg(c))}" alt="" width="72" height="72" loading="lazy">` : `<i style="background:${esc(c.hex || '#eee')}"></i>`}<span>${esc(L(c.l))}</span>${c.price ? `<small>+${eur(c.price)}</small>` : ''}</button>`).join('')}</div></div>`;
        continue;
      }
      h += `<div class="fld"><span class="lb">${t(o.label)}</span>${o.choices.length > 5 ? `<select class="in" data-opt="${o.id}">${o.choices.map(c => `<option value="${esc(c.id)}"${c.id === v ? ' selected' : ''}>${esc(L(c.l))}${c.price ? ' (+' + eur(c.price) + ')' : ''}</option>`).join('')}</select>` :
        `<div class="seg">${o.choices.map(c => `<button type="button" data-opt="${o.id}" data-val="${esc(c.id)}" aria-pressed="${c.id === v}">${c.hex ? `<i class="odot" style="background:${esc(c.hex)}"></i>` : ''}${esc(L(c.l))}${c.price ? `<small>+${eur(c.price)}</small>` : ''}</button>`).join('')}</div>`}</div>`;
    }
    for (const f of p.fields) {
      if (!fieldVisible(p, f, D)) continue;
      const lab = t(f.label); const val = D.f[f.id] != null ? D.f[f.id] : f.def;
      if (f.type === 'text' || f.type === 'textarea') {
        const master = !f.sf;
        const fonts = master ? (f.fonts || []) : [];
        const curFont = D.font[f.id] || fonts[0];
        h += `<div class="fld" data-fid="${f.id}"><label class="lb" for="f_${f.id}">${lab}<small data-count="${f.id}">${String(val).length}/${f.max || 30}</small></label>
          ${f.type === 'textarea' ? `<textarea class="in" id="f_${f.id}" data-field="${f.id}" maxlength="${f.max || 80}" rows="${f.lines || 2}">${esc(val)}</textarea>` : `<input class="in" id="f_${f.id}" data-field="${f.id}" maxlength="${f.max || 30}" value="${esc(val)}" autocomplete="off">`}
          ${f.upper ? `<p class="hint">${t('upper_hint')}</p>` : ''}
          ${fonts.length > 1 ? `<div class="fonts" role="radiogroup" aria-label="${esc(t('font'))}">${fonts.map(id => `<button type="button" role="radio" data-font="${f.id}" data-val="${id}" aria-checked="${id === curFont}" style="font-family:'${ENG.fam(id)}'">${esc(P.fontSample(f, val, id))}</button>`).join('')}</div>` : ''}
          ${master && f.colors ? `<div class="sws" role="radiogroup" aria-label="${esc(t('color'))}">${f.colors.map((c, i) => `<button type="button" role="radio" class="sw" data-color="${f.id}" data-val="${c.id}" aria-checked="${(D.color[f.id] || f.colors[0].id) === c.id}" style="--c:${c.hex}" title="${esc(L(c.l))}"><span class="vh">${esc(L(c.l))}</span></button>`).join('')}<span class="swl">${esc(L((f.colors.find(c => c.id === (D.color[f.id] || f.colors[0].id)) || f.colors[0]).l))}</span></div>` : ''}
          ${master && f.sz !== false ? `<label class="size"><span>${t('size')}</span><input type="range" min="60" max="160" step="1" value="${Math.round((D.size[f.id] || 1) * 100)}" data-size="${f.id}"><output>${Math.round((D.size[f.id] || 1) * 100)} %</output></label>` : ''}
          <div class="symbols" aria-label="${esc(t('symbols'))}">${ENG.SYMBOLS.map(s => `<button type="button" data-sym="${f.id}" data-val="${s}" aria-label="${s}"><canvas data-symcv="${s}" width="40" height="40"></canvas></button>`).join('')}</div>
        </div>`;
      } else if (f.type === 'spotify') {
        const u = ENG.spotifyUri(val);
        h += `<div class="fld spf" data-fid="${f.id}"><label class="lb" for="f_${f.id}"><span class="sp-ico">${SPOTIFY_ICON}</span> ${lab}${f.optional ? `<small>${t('optional')}</small>` : ''}</label>
          <input class="in" id="f_${f.id}" data-field="${f.id}" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/track/…" value="${esc(val)}">
          <p class="hint" data-sphint="${f.id}">${val && !u ? `<span class="warn">${t('sp_bad')}</span>` : u ? `${ic('check')} ${t('sp_ok')}` : t('sp_how')}</p>
          ${u ? `<div class="sp-real"><img src="${esc(ENG.spotifyCodeUrl(u))}" alt="Spotify Code" width="320" height="80" loading="lazy" referrerpolicy="no-referrer"><small>${t('sp_scan')}</small></div>` : ''}
        </div>`;
      } else if (f.type === 'date') {
        h += `<div class="fld"><label class="lb" for="f_${f.id}">${lab}</label><input class="in" type="date" id="f_${f.id}" data-field="${f.id}" value="${esc(val)}"></div>`;
      } else if (f.type === 'stone') {
        const c = f.choices.find(c => c.id === val) || f.choices[0];
        h += `<div class="fld stone"><label class="lb" for="f_${f.id}">${lab}</label><div class="stonerow"><span class="gem" style="--c:${c.hex}"></span><select class="in" id="f_${f.id}" data-field="${f.id}">${f.choices.map(x => `<option value="${x.id}"${x.id === val ? ' selected' : ''}>${esc(L(x.l))}</option>`).join('')}</select></div></div>`;
      } else if (f.type === 'photo') {
        const ph = D.ph[f.id];
        const warn = ph && ph.low ? `<p class="warn small">${ic('alert')} ${t('photo_low')}</p>` : '';
        h += `<div class="fld photo" data-fid="${f.id}"><span class="lb">${lab}${f.optional ? `<small>${t('optional')}</small>` : ''}</span>
          ${ph && ph.src ? `<div class="phrow"><img class="phthumb" data-thumb="${f.id}" alt="" width="64" height="64"><div class="phbtns"><button type="button" class="btn ghost sm" data-act="ph-edit" data-f="${f.id}">${ic('move')} ${t('photo_edit')}</button><label class="btn ghost sm upl">${ic('upload')} ${t('photo_replace')}<input type="file" accept="image/*" data-upload="${f.id}"></label><button type="button" class="ibtn" data-act="ph-del" data-f="${f.id}" aria-label="${esc(t('remove'))}">${ic('trash')}</button></div></div>${warn}
            ${(f.fx || []).length > 1 ? `<div class="seg sm">${f.fx.map(x => `<button type="button" data-phfx="${f.id}" data-val="${x}" aria-pressed="${(ph.fx || f.fx[0]) === x}">${t('fx_' + x)}</button>`).join('')}</div>` : ''}` :
            `<label class="drop">${ic('camera')}<b>${t('photo_add')}</b><small>${t('photo_hint')}</small><input type="file" accept="image/*" data-upload="${f.id}"></label>`}
        </div>`;
      }
    }
    if (p.fields.some(f => f.type === 'photo')) h += `<p class="hint">${t('photo_privacy')}</p>${IN_APP ? `<p class="hint warn">${ic('alert')} ${t('wv_hint')}</p>` : '<p class="hint warn" id="wvHint" hidden></p>'}`;
    box.innerHTML = h;
    $$('[data-symcv]', box).forEach(c => ENG.drawSymbol(c, c.dataset.symcv));
    $$('[data-thumb]', box).forEach(async img => { const ph = D.ph[img.dataset.thumb]; if (ph) img.src = await ST.photoUrl(ph.src); });
    P.price();
  };
  P.fontSample = function (f, val, id) { const s = String(val || '').split('\n')[0].trim(); return (s && s.length <= 12 ? s : (ENG.isAr(s) ? 'اسم' : (window.FONTMETA[id] || {}).label || 'Abc')); };
  P.price = function () { if (!CUR) return; const h = SHOP.priceHTML(CUR.p, CUR.D); const a = $('#price'), b = $('#sprice'); if (a) a.innerHTML = h; if (b) b.innerHTML = h; };

  /* ---------------- live render ---------------- */
  let raf = 0, busyT = 0, showOrig = false;
  P.draw = function (now) {
    cancelAnimationFrame(raf);
    const go = async () => {
      const cv = $('#pv'); if (!cv || !CUR) return;
      const w = Math.min(1400, Math.round((cv.parentElement.clientWidth || 600) * Math.min(2, window.devicePixelRatio || 1)));
      clearTimeout(busyT); busyT = setTimeout(() => { const b = $('.stage-busy'); if (b) b.hidden = false; }, 250);
      await ENG.render(cv, CUR.p, CUR.vi, CUR.D, { maxW: w, orig: showOrig, force: !showOrig && !!CUR.D._touched });
      clearTimeout(busyT); const b = $('.stage-busy'); if (b) b.hidden = true;
    };
    if (now) go(); else raf = requestAnimationFrame(go);
  };
  const drawSoon = C.debounce(() => P.draw(true), 70);
  function touch() { CUR.D._touched = true; }
  function goView(vi) { if (!CUR) return; vi = ENG.viewFor(CUR.p, CUR.D, vi); if (vi === CUR.vi) return; CUR.vi = vi; $$('[data-view]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.view === vi))); P.draw(true); }
  P.view = vi => goView(+vi);

  /* ---------------- events ---------------- */
  P.onInput = function (el) {
    if (!CUR) return;
    const { p, D } = CUR;
    if (el.dataset.field) {
      const f = ENG.fieldById(p, el.dataset.field); let v = el.value;
      if (f.max && v.length > f.max) v = v.slice(0, f.max);
      D.f[f.id] = v; touch();
      if (f.type === 'spotify') { clearTimeout(P._spT); P._spT = setTimeout(() => { const pos = el.selectionStart; P.fields(); const n = $('#f_' + f.id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } }, 700); }
      const cnt = $(`[data-count="${f.id}"]`); if (cnt) cnt.textContent = `${v.length}/${f.max || 30}`;
      const master = masterOf(p, f);
      $$(`[data-font="${master.id}"]`).forEach(b => { b.textContent = P.fontSample(master, D.f[master.id] != null ? D.f[master.id] : master.def, b.dataset.val); });
      if (f.type === 'stone') { const c = f.choices.find(c => c.id === v); const gem = el.parentElement.querySelector('.gem'); if (gem && c) gem.style.setProperty('--c', c.hex); }
      goView(pageOf(p, f.id));
      if (ENG.isAr(v)) ENG.fontsFor(ENG.fontFor(p, { f: f.id }, D), v).forEach(ENG.loadFont);
      drawSoon(); return;
    }
    if (el.dataset.size) { D.size[el.dataset.size] = el.value / 100; el.nextElementSibling.textContent = el.value + ' %'; touch(); goView(pageOf(p, el.dataset.size)); drawSoon(); return; }
    if (el.dataset.opt && el.tagName === 'SELECT') { D.opt[el.dataset.opt] = el.value; touch(); P.fields(); goView(CUR.vi); drawSoon(); }
  };
  P.onClick = function (el, e) {
    if (!CUR) return false;
    const { p, D } = CUR;
    if (el.dataset.font) { D.font[el.dataset.font] = el.dataset.val; touch(); ENG.loadFont(el.dataset.val).then(() => P.draw(true)); $$(`[data-font="${el.dataset.font}"]`).forEach(b => b.setAttribute('aria-checked', String(b === el))); goView(pageOf(p, el.dataset.font)); return true; }
    if (el.dataset.color) { const f = ENG.fieldById(p, el.dataset.color); D.color[f.id] = el.dataset.val; touch(); $$(`[data-color="${f.id}"]`).forEach(b => b.setAttribute('aria-checked', String(b === el))); const l = el.parentElement.querySelector('.swl'); if (l) l.textContent = L(f.colors.find(c => c.id === el.dataset.val).l); goView(pageOf(p, f.id)); P.draw(true); return true; }
    if (el.dataset.opt && el.dataset.val) { D.opt[el.dataset.opt] = el.dataset.val; touch(); P.fields(); const k = p.views.findIndex(w => w.when && w.when.opt === el.dataset.opt && w.when.eq === el.dataset.val); goView(k >= 0 ? k : CUR.vi); P.draw(true); return true; }
    if (el.dataset.sym) { const inp = $('#f_' + el.dataset.sym); if (!inp) return true; const s = inp.selectionStart != null ? inp.selectionStart : inp.value.length; inp.value = inp.value.slice(0, s) + el.dataset.val + inp.value.slice(inp.selectionEnd || s); inp.focus(); P.onInput(inp); return true; }
    if (el.dataset.phfx) { D.ph[el.dataset.phfx].fx = el.dataset.val; touch(); $$(`[data-phfx="${el.dataset.phfx}"]`).forEach(b => b.setAttribute('aria-pressed', String(b === el))); P.draw(true); return true; }
    if (el.dataset.view != null) { const V = p.views[+el.dataset.view]; if (V && V.when) { D.opt[V.when.opt] = V.when.eq; touch(); P.fields(); P.price(); } goView(+el.dataset.view); P.draw(true); return true; }
    switch (el.dataset.act) {
      case 'qm': CUR.qty = Math.max(1, CUR.qty - 1); $('#qty').textContent = CUR.qty; return true;
      case 'qp': CUR.qty = Math.min(Math.max(1, p.stock), CUR.qty + 1); $('#qty').textContent = CUR.qty; return true;
      case 'orig': showOrig = !showOrig; el.setAttribute('aria-pressed', String(showOrig)); P.draw(true); return true;
      case 'zoom': P.zoom(); return true;
      case 'ph-del': delete D.ph[el.dataset.f]; touch(); P.fields(); P.draw(true); return true;
      case 'ph-edit': P.cropper(el.dataset.f); return true;
      case 'add': P.add(); return true;
      case 'save-design': P.saveDesign(); return true;
      case 'share-design': P.share(); return true;
    }
    return false;
  };
  P.onFile = async function (el) {
    if (!CUR || !el.dataset.upload) return false;
    const f = ENG.fieldById(CUR.p, el.dataset.upload); const file = el.files && el.files[0]; el.value = '';
    if (!file) return true;
    C.toast(t('photo_loading'));
    try {
      const r = await ST.readImage(file, 2000, f.fx && f.fx.includes('ink'));
      const id = await ST.photoPut(r.blob);
      const zs = zonesFor(CUR.p, f.id); const z = zs.length && zs[0].z;
      const need = z ? (z.mm || 60) / 25.4 * 120 : 600;
      CUR.D.ph[f.id] = { src: id, crop: { x: 0, y: 0, s: 1, r: 0 }, fx: (f.fx || [])[0] || 'none', w: r.w, h: r.h, low: Math.min(r.w, r.h) < need * .7 };
      touch(); goView(pageOf(CUR.p, f.id)); P.fields(); await P.draw(true);
      C.toast(t('photo_ok'));
    } catch (e) { C.toast(t('photo_err'), 'err'); }
    return true;
  };

  /* ---------------- photo crop editor ---------------- */
  P.cropper = async function (fid) {
    const { p, D } = CUR; const ph = D.ph[fid]; if (!ph) return;
    const zs = zonesFor(p, fid); if (!zs.length) return;
    const z = zs[0].z; goView(zs[0].vi);
    const [fw, fh] = ENG.flatSize(z); const ar = fw / fh;
    const img = await ENG.img(ph.src);
    const ov = C.sheet({ title: t('photo_edit'), kind: 'modal', wide: true });
    ov.body.innerHTML = `<div class="crop"><div class="crop-stage" style="aspect-ratio:${ar}"><canvas id="cropCv"></canvas><div class="crop-hint">${ic('move')} ${t('crop_hint')}</div></div>
      <div class="crop-tools"><label class="size"><span>${t('zoom')}</span><input type="range" id="cz" min="100" max="400" value="${Math.round((ph.crop.s || 1) * 100)}"></label>
      <label class="size"><span>${t('rotate')}</span><input type="range" id="cr" min="-45" max="45" value="${Math.round(((ph.crop.r || 0) + 45) % 90 - 45)}"></label>
      <div class="row"><button class="btn ghost sm" data-crop="l">${ic('rotateL')} 90°</button><button class="btn ghost sm" data-crop="r">${ic('rotate')} 90°</button><button class="btn ghost sm" data-crop="reset">${t('reset')}</button></div></div></div>`;
    ov.foot.innerHTML = `<button class="btn" data-crop="done">${t('done')}</button>`;
    const cv = $('#cropCv', ov); const st = $('.crop-stage', ov);
    let base90 = Math.round((ph.crop.r || 0) / 90) * 90; let fine = (ph.crop.r || 0) - base90;
    const cr = ph.crop;
    const paint = () => {
      const W = Math.round(st.clientWidth * Math.min(2, devicePixelRatio || 1)), H = Math.round(W / ar);
      cv.width = W; cv.height = H;
      const fakeZ = { b: [0, 0, W, H, 0], clip: z.clip, ar: z.ar };
      const m = ENG.photoFlat(Object.assign({}, fakeZ, { q: null }), img, cr, ph.fx, 1);
      const x = cv.getContext('2d'); x.fillStyle = '#ddd'; x.fillRect(0, 0, W, H); x.drawImage(m.cv, -m.pu * m.W, -m.pv * m.H);
      if (z.clip && z.clip !== 'rect') { x.save(); x.fillStyle = 'rgba(28,24,25,.45)'; x.beginPath(); x.rect(0, 0, W, H); if (z.clip === 'heart') ENG.heartPath(x, 0, 0, W, H); else x.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2); x.fill('evenodd'); x.restore(); }
    };
    const apply = () => { cr.r = base90 + fine; touch(); paint(); drawSoon(); };
    paint();
    let drag = null; const pts = new Map();
    st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, cx: cr.x, cy: cr.y, s: cr.s, d: pts.size === 2 ? dist() : 0 }; });
    const dist = () => { const a = [...pts.values()]; return a.length < 2 ? 0 : Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); };
    st.addEventListener('pointermove', e => {
      if (!drag || !pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const d = dist(); if (!drag.d) { drag.d = d; drag.s = cr.s; } cr.s = Math.max(1, Math.min(4, drag.s * d / drag.d)); $('#cz', ov).value = Math.round(cr.s * 100); }
      else { const r = st.getBoundingClientRect(); cr.x = drag.cx + (e.clientX - drag.x) / r.width; cr.y = drag.cy + (e.clientY - drag.y) / r.height; }
      apply();
    });
    const up = e => { pts.delete(e.pointerId); if (!pts.size) drag = null; else drag = { x: [...pts.values()][0][0], y: [...pts.values()][0][1], cx: cr.x, cy: cr.y, s: cr.s, d: 0 }; };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('wheel', e => { e.preventDefault(); cr.s = Math.max(1, Math.min(4, cr.s * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); $('#cz', ov).value = Math.round(cr.s * 100); apply(); }, { passive: false });
    $('#cz', ov).addEventListener('input', e => { cr.s = e.target.value / 100; apply(); });
    $('#cr', ov).addEventListener('input', e => { fine = +e.target.value; apply(); });
    ov.addEventListener('click', e => { const b = e.target.closest('[data-crop]'); if (!b) return; const k = b.dataset.crop; if (k === 'l') base90 -= 90; if (k === 'r') base90 += 90; if (k === 'reset') { cr.x = 0; cr.y = 0; cr.s = 1; base90 = 0; fine = 0; $('#cz', ov).value = 100; $('#cr', ov).value = 0; } if (k === 'done') { C.closeAll(); P.draw(true); return; } apply(); });
  };

  /* ---------------- zoom view ---------------- */
  P.zoom = async function () {
    const ov = C.sheet({ title: L(CUR.p.name), kind: 'modal', wide: true, foot: false });
    ov.body.innerHTML = `<div class="zoomwrap"><canvas id="zcv"></canvas></div>`;
    await ENG.render($('#zcv', ov), CUR.p, CUR.vi, CUR.D, { maxW: 2000, orig: showOrig, force: !!CUR.D._touched });
  };

  /* ---------------- validation & add ---------------- */
  P.validate = function () {
    const { p, D } = CUR;
    for (const f of p.fields) {
      if (!fieldVisible(p, f, D)) continue;
      if (f.type === 'photo' && !f.optional) {
        const z = zonesFor(p, f.id); if (!z.length) continue;
        if (!D.ph[f.id]) return { f, msg: t('need_photo', { n: t(f.label) }) };
      }
      if (f.type === 'spotify' && !f.optional && !ENG.spotifyUri(D.f[f.id])) return { f, msg: t('sp_need') };
      if (f.type === 'spotify' && !f.optional && f.def && ENG.spotifyUri(D.f[f.id]) === ENG.spotifyUri(f.def)) return { f, msg: t('sp_change') };
      if ((f.type === 'text' || f.type === 'textarea') && !f.optional) { const v = D.f[f.id] != null ? D.f[f.id] : f.def; if (!String(v).trim()) return { f, msg: t('need_text', { n: t(f.label) }) }; }
    }
    return null;
  };
  P.thumb = async function () {
    const c = ENG.canvas(10, 10);
    await ENG.render(c, CUR.p, ENG.viewFor(CUR.p, CUR.D, CUR.vi && !CUR.p.views[CUR.vi].zones.length ? 0 : CUR.vi), CUR.D, { maxW: 420, force: !!CUR.D._touched });
    return c.toDataURL('image/jpeg', .8);
  };
  P.add = async function () {
    const { p, D } = CUR;
    const bad = P.validate();
    if (bad) { C.toast(bad.msg, 'err'); const el = $(`[data-fid="${bad.f.id}"]`) || $('#cfg'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); return; }
    const fill = {}; for (const f of p.fields) if (D.f[f.id] == null && f.type !== 'photo') fill[f.id] = f.def;
    const design = JSON.parse(JSON.stringify(D)); Object.assign(design.f, fill); delete design._touched;
    const item = { id: CUR.editId || ST.uid('i'), pid: p.id, D: design, qty: CUR.qty, unit: ST.unitPrice(p, D), tax: p.tax || 19, name: p.name, preview: await P.thumb(), at: Date.now() };
    const cart = ST.cart(); const i = cart.findIndex(x => x.id === item.id);
    if (i >= 0) cart[i] = item; else cart.push(item);
    ST.saveCart(cart); SHOP.refreshHeader();
    CHECKOUT.drawer(item.id);
    CUR.editId = item.id;
  };
  P.saveDesign = function () {
    const code = ST.saveDesign(CUR.p.id, CUR.D);
    if (ST.me()) { const me = ST.me(); ST.updateMe({ designs: [{ code, pid: CUR.p.id, at: Date.now() }].concat(me.designs || []).slice(0, 40) }); C.toast(t('design_saved_acc')); }
    else C.toast(t('design_saved'));
  };
  P.share = async function () {
    const url = location.href.split('#')[0] + '#/p/' + CUR.p.id + '?d=' + P.encode(CUR.D);
    const hasPh = Object.keys(CUR.D.ph).length;
    try { if (navigator.share) { await navigator.share({ title: L(CUR.p.name), url }); return; } } catch (e) { }
    try { await navigator.clipboard.writeText(url); C.toast(t('link_copied') + (hasPh ? ' ' + t('link_no_photos') : '')); }
    catch (e) { const ov = C.sheet({ title: t('share_design'), kind: 'modal' }); ov.body.innerHTML = `<input class="in" readonly value="${esc(url)}">`; }
  };
  P.current = () => CUR;
  P.clear = () => { CUR = null; showOrig = false; };
})();
