/* Router, global event handling and start-up. */
(function () {
  'use strict';
  const APP = {};
  window.APP = APP;

  /* ---------------- routing ---------------- */
  function parse(path) {
    const [p, qs] = path.split('?');
    const q = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' ')); });
    return { parts: p.split('/').filter(Boolean).map(decodeURIComponent), q };
  }
  APP.route = function (path) {
    const { parts, q } = parse(path);
    const [a, b, c] = parts;
    if (a !== 'p') PDP.clear();
    if (a !== 'box' && window.BOX) BOX.leave();
    if (a !== 'admin') C.applyLang();
    switch (a) {
      case undefined: return SHOP.home();
      case 'c': return SHOP.list('c', b || 'alle');
      case 'o': return SHOP.list('o', b);
      case 'anlass': return SHOP.occPage();
      case 'suche': return SHOP.list('s', b || '');
      case 'wunschliste': return SHOP.list('w');
      case 'p': PDP.show(b, q); if (q.review) setTimeout(() => { const d = $('#reviews'); if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }, 120); return;
      case 'gutschein': return SHOP.giftPage();
      case 'box': return BOX.show(b, q);
      case 'hilfe': return SHOP.help(b);
      case 'rechtliches': return SHOP.legal(b);
      case 'warenkorb': return CHECKOUT.page();
      case 'kasse': return CHECKOUT.checkout();
      case 'danke': return CHECKOUT.thanks(b);
      case 'verfolgen': return CHECKOUT.track(b, q);
      case 'freigabe': return CHECKOUT.approval(b, c);
      case 'konto': return CHECKOUT.account(b, q);
      case 'postfach': return CHECKOUT.mailbox(b);
      case 'admin': return ADMIN.show(parts.slice(1));
      default: return SHOP.home();
    }
  };
  C.route(/^(.*)$/, p => APP.route(p));

  /* ---------------- events ---------------- */
  const onPDP = () => C.path().startsWith('/p/');
  const onCO = () => C.path().startsWith('/kasse') || C.path().startsWith('/warenkorb') || !!$('.ov .clines');
  /* if tapping a file field does not open any picker (some in-app browsers), explain what to do */
  document.addEventListener('click', e => {
    const inp = e.target.closest && e.target.closest('input[type=file]'); if (!inp) return;
    let opened = false; const mark = () => { opened = true; };
    window.addEventListener('blur', mark, { once: true }); document.addEventListener('visibilitychange', mark, { once: true });
    setTimeout(() => { window.removeEventListener('blur', mark); if (!opened && !inp.files.length) { const h = $('#wvHint'); if (h) { h.innerHTML = ic('alert') + ' ' + esc(t('wv_hint')); h.hidden = false; } C.toast(t('wv_hint'), 'err'); } }, 1500);
  }, true);
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-dz],[data-a],[data-act],[data-lang],[data-hero],[data-sugg],[data-font],[data-color],[data-opt],[data-sym],[data-phfx],[data-view],[data-cow],[data-coaddr],[data-crop]');
    if (!el) return;
    if (el.dataset.crop) return; // handled inside the crop sheet
    if (el.dataset.dz) { e.preventDefault(); return DESIGNER.onClick(el); }
    if (el.dataset.a) { e.preventDefault(); return ADMIN.onClick(el); }
    if (el.dataset.lang) { C.setLang(el.dataset.lang); SHOP.searchIndex = null; C.dispatch({ keepScroll: true }); return; }
    if (el.dataset.hero != null) { SHOP._heroShow && SHOP._heroShow(+el.dataset.hero); return; }
    if (el.dataset.sugg) { const i = $('#sq'); if (i) { i.value = el.dataset.sugg; i.dispatchEvent(new Event('input')); i.focus(); } return; }
    if (onCO() && CHECKOUT.onClick(el)) return;
    if (onPDP() && PDP.onClick(el, e)) return;
    if (C.path().startsWith('/box') && window.BOX && BOX.onClick(el, e)) return;
    const act = el.dataset.act; if (!act) return;
    switch (act) {
      case 'close': C.closeAll(); return;
      case 'menu': SHOP.menu(); return;
      case 'search': SHOP.searchSheet(); return;
      case 'cart': CHECKOUT.drawer(); return;
      case 'wish': { const on = ST.toggleWish(el.dataset.id); $$(`[data-act=wish][data-id="${el.dataset.id}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); C.toast(on ? t('wish_added') : t('wish_removed')); if (C.path().startsWith('/wunschliste')) C.dispatch({ keepScroll: true }); return; }
      case 'cookie-min': case 'cookie-all': ST.set('cookies', act === 'cookie-all' ? 'all' : 'min'); const ck = $('#cookie'); if (ck) ck.remove(); return;
      case 'cookies': ST.set('cookies', null); SHOP.cookieBanner(); return;
      case 'carou': SHOP.carou(+el.dataset.d); return;
      case 'fset': SHOP.setFilter(el.dataset.k, el.dataset.v); return;
      case 'freset': SHOP.resetFilter(); return;
      case 'ftoggle': { const f = $('#fside'); if (f) { f.classList.toggle('open'); if (f.classList.contains('open')) f.scrollIntoView({ block: 'start', behavior: 'smooth' }); } return; }
      case 'gc-check': { const r = ST.findGiftcard($('#gcCode').value); $('#gcOut').textContent = r.g ? t('gc_bal', { n: eur(r.g.balance) }) : t('gc_' + r.err); return; }
      case 'logout': ST.logout(); SHOP.refreshHeader(); C.go('#/konto'); C.toast(t('logged_out')); return;
      case 'export-me': { const me = ST.me(); const data = { profile: me, orders: ST.orders().filter(o => o.cust.id === me.id || o.cust.email === me.email), emails: ST.emails().filter(m => m.to === me.email) }; C.save('meine-daten.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); return; }
      case 'delete-me': if (await C.confirm(t('delete_q'), t('delete_acc'), t('cancel'))) { ST.deleteMe(); SHOP.refreshHeader(); C.go('#/'); C.toast(t('deleted')); } return;
      case 'addr-del': { const me = ST.me(); const a = (me.addresses || []).slice(); a.splice(+el.dataset.i, 1); ST.updateMe({ addresses: a }); C.dispatch({ keepScroll: true }); return; }
      case 'inv': { const o = ST.order(el.dataset.no); C.toast(t('creating')); const b = await DOCS.invoice(o); C.save(o.invoice + '.pdf', b); return; }
      case 'ocancel': { const o = ST.order(el.dataset.no); if (!o || o.status !== 'neu' || Date.now() > o.cancelUntil) { C.toast(t('cancel_late'), 'err'); return; } if (await C.confirm(t('cancel_q'), t('cancel_order'), t('back'))) { ST.cancelOrder(o.no, 'kunde', 'vom Kunden'); C.toast(t('cancelled_ok')); C.dispatch(); } return; }
      case 'appr-ok': CHECKOUT.approve(el.dataset.no, +el.dataset.i, true); C.dispatch({ keepScroll: true }); return;
      case 'appr-change': {
        const ov = C.sheet({ title: t('appr_change'), kind: 'modal' });
        ov.body.innerHTML = `<label class="fld"><span>${t('appr_what')}</span><textarea class="in" rows="4" id="apx" maxlength="600"></textarea></label>`;
        ov.foot.innerHTML = `<button class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn" id="apxGo">${t('send')}</button>`;
        $('#apxGo', ov).addEventListener('click', () => { const v = $('#apx', ov).value.trim(); if (!v) return; C.closeAll(); CHECKOUT.approve(el.dataset.no, +el.dataset.i, false, v); C.dispatch({ keepScroll: true }); });
        return;
      }
    }
  });
  const isDz = el => Object.keys(el.dataset || {}).some(k => k.startsWith('dz') && k !== 'dzfile');
  document.addEventListener('input', e => {
    const el = e.target;
    if (isDz(el)) return DESIGNER.onInput(el);
    if (el.dataset.ain) return ADMIN.onInput(el);
    if (el.dataset.co && el.type !== 'radio' && el.type !== 'checkbox') { CHECKOUT.onInput(el); return; }
    if (onPDP() && (el.dataset.field || el.dataset.size || el.dataset.opt)) { if (el.tagName === 'SELECT' && el.dataset.field) return; PDP.onInput(el); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.dzfile) { DESIGNER.onFile(el); return; }
    if (isDz(el)) return;
    if (el.dataset.pf || el.dataset.cp) return ADMIN.onChange(el);
    if (el.dataset.upload) { PDP.onFile(el); return; }
    if (el.dataset.filter) { SHOP.setFilter(el.dataset.filter, el.value); return; }
    if (el.dataset.co && (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT')) { CHECKOUT.onInput(el); return; }
    if (onPDP() && el.tagName === 'SELECT' && (el.dataset.field || el.dataset.opt)) { PDP.onInput(el); return; }
    if (el.name === 'amt') { const x = $('[name=amtx]'); if (x) { x.hidden = el.value !== 'x'; if (!x.hidden) x.focus(); } }
  });
  document.addEventListener('submit', async e => {
    const f = e.target; e.preventDefault();
    if (f.dataset.aform) return ADMIN.onSubmit(f);
    const fd = new FormData(f); const g = n => (fd.get(n) || '').toString().trim();
    switch (f.dataset.form) {
      case 'search': { const q = $('#sq').value.trim(); if (q) C.go('#/suche/' + encodeURIComponent(q)); return; }
      case 'finder': { SHOP.setFinder({ occ: g('occ'), who: g('who'), max: g('max') }); C.go(g('occ') ? '#/o/' + g('occ') : '#/c/alle'); return; }
      case 'news': { f.reset(); C.toast(t('news_ok')); return; }
      case 'hero': { const n = $('#heroName').value.trim(); const href = ($('#heroLink') || {}).getAttribute ? $('#heroLink').getAttribute('href') : '#/c/alle'; C.go(n && !href.includes('?') ? href + '?n=' + encodeURIComponent(n) : href); return; }
      case 'giftcard': {
        let amt = g('amt') === 'x' ? +g('amtx') : +g('amt');
        if (!(amt >= 10 && amt <= 500)) { C.toast(t('gc_amount_bad'), 'err'); return; }
        if (!g('to') || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(g('toEmail'))) { C.toast(t('need_fields'), 'err'); return; }
        const p = ST.product('gutschein'); const small = await thumbOf(SHOP.giftcardImg());
        const cart = ST.cart(); cart.push({ id: ST.uid('i'), pid: 'gutschein', D: { f: { to: g('to'), toEmail: g('toEmail'), from: g('from'), msg: g('msg') }, font: {}, color: {}, size: {}, ph: {}, opt: {} }, qty: 1, unit: amt, tax: 0, name: p.name, preview: small, at: Date.now() });
        ST.saveCart(cart); SHOP.refreshHeader(); f.reset(); CHECKOUT.drawer(cart[cart.length - 1].id); return;
      }
      case 'review': { const bought = ST.orders().some(o => o.items.some(i => i.pid === f.dataset.pid) && o.status === 'zugestellt'); ST.addReview({ pid: f.dataset.pid, stars: +g('stars') || 5, name: g('name'), text: g('text'), verified: bought }); f.reset(); C.toast(t('review_thanks')); return; }
      case 'question': ST.addQuestion({ pid: f.dataset.pid, text: g('text'), email: g('email'), lang: C.lang() }); f.reset(); C.toast(t('question_thanks')); return;
      case 'track': C.go('#/verfolgen/' + encodeURIComponent(g('no').toUpperCase()) + '?e=' + encodeURIComponent(g('e'))); return;
      case 'login': { const r = await ST.login(g('email'), g('pw')); if (r.err) { C.toast(t('login_wrong'), 'err'); return; } SHOP.refreshHeader(); C.toast(t('hello', { n: r.c.name.split(' ')[0] })); C.go(f.dataset.next === 'kasse' ? '#/kasse' : '#/konto'); return; }
      case 'register': { if (g('pw').length < 6) { C.toast(t('pw_short'), 'err'); return; } const r = await ST.register({ name: g('name'), email: g('email'), phone: g('phone'), pw: g('pw'), marketing: !!fd.get('marketing') }); if (r.err) { C.toast(t('acc_exists'), 'err'); return; } const w = ST.get('wish', []); if (w.length) ST.updateMe({ wishlist: w }); SHOP.refreshHeader(); C.go('#/konto'); return; }
      case 'addr': { const me = ST.me(); ST.updateMe({ addresses: (me.addresses || []).concat([{ name: g('name'), street: g('street'), zip: g('zip'), city: g('city'), country: 'DE' }]) }); C.dispatch({ keepScroll: true }); C.toast(t('saved')); return; }
      case 'profile': ST.updateMe({ name: g('name'), phone: g('phone'), marketing: !!fd.get('marketing') }); C.toast(t('saved')); C.dispatch({ keepScroll: true }); return;
      case 'complaint': { const no = f.dataset.no; ST.updateOrder(no, o => { o.complaints = (o.complaints || []).concat([{ at: Date.now(), text: g('text'), done: false }]); }); const o = ST.order(no); ST.sendMail('complaint', o, { text: g('text'), toEmail: ST.settings().shop.email }); const em = ST.emails(); em[0].lang = 'de'; ST.set('emails', em); ST.log('reklamation', `${no}: ${g('text').slice(0, 60)}`, 'kunde'); f.reset(); C.toast(t('complaint_thanks')); return; }
    }
  });
  async function thumbOf(src) { const im = await ENG.img(src); const c = ENG.canvas(240, 240); c.getContext('2d').drawImage(im, 0, 0, 240, 240); return c.toDataURL('image/jpeg', .8); }

  /* ---------------- live updates ---------------- */
  ST.onStorageError = () => C.toast(t('storage_full'), 'err');
  ST.onMail = m => { if (m.tpl === 'owner_new') setTimeout(() => ADMIN.ping(m), 400); };
  ST.onExternalChange = k => {
    if (k === 'lastOrderPing') { const p = ST.get('lastOrderPing', null); if (p) { ST.forget('orders'); ST.forget('emails'); ADMIN.ping({ tpl: 'owner_new', no: p.no, lang: 'de' }); } }
    if (k === 'cart' || k === 'session') SHOP.refreshHeader();
    if (['orders', 'emails'].includes(k) && (C.path().startsWith('/verfolgen') || C.path().startsWith('/postfach') || C.path().startsWith('/freigabe'))) C.dispatch({ keepScroll: true });
  };

  /* ---------------- start ---------------- */
  C.applyLang();
  ST.seed();
  if (document.fonts) ['400 16px ui-sans', '500 16px ui-serif'].forEach(f => document.fonts.load(f).catch(() => { }));
  C.dispatch();
})();
