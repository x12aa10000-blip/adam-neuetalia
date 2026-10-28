/* Customer side: cart, checkout, confirmation, tracking, design approval, account, demo mailbox. */
(function () {
  'use strict';
  const K = {};
  window.CHECKOUT = K;

  /* ---------------- cart ---------------- */
  const lineHTML = (it, compact) => {
    const p = ST.product(it.pid); const lines = DOCS.lines(it, C.lang());
    return `<div class="cline" data-line="${esc(it.id)}">
      <a class="cthumb" href="${p && p.id === 'geschenkbox' ? '#/box?edit=' + esc(it.id) : p && p.id !== 'gutschein' ? '#/p/' + esc(it.pid) + '?edit=' + esc(it.id) : '#/gutschein'}"><img src="${esc(it.preview || (p && p.views[0] && p.views[0].thumb) || '')}" alt="" width="96" height="96"></a>
      <div class="cinfo"><b>${esc(L(it.name))}</b>
        <ul class="clist">${lines.slice(0, compact ? 3 : 20).map(([a, b]) => `<li><span>${esc(a)}</span> ${esc(b)}</li>`).join('')}</ul>
        <div class="crow"><div class="qty sm" role="group" aria-label="${esc(t('qty'))}"><button type="button" data-act="cq" data-d="-1" data-id="${esc(it.id)}" aria-label="−">${ic('minus')}</button><output>${it.qty}</output><button type="button" data-act="cq" data-d="1" data-id="${esc(it.id)}" aria-label="+">${ic('plus')}</button></div>
          ${p && p.id === 'geschenkbox' ? `<a class="link" href="#/box?edit=${esc(it.id)}">${t('edit')}</a>` : p && p.id !== 'gutschein' ? `<a class="link" href="#/p/${esc(it.pid)}?edit=${esc(it.id)}">${t('edit')}</a>` : ''}<button class="link" data-act="crm" data-id="${esc(it.id)}">${t('remove')}</button></div>
      </div>
      <span class="cprice">${eur(it.unit * it.qty)}</span></div>`;
  };
  function freeBar(sub) {
    const s = ST.settings(); const left = Math.max(0, ST.round2(s.freeFrom - sub)); const pct = Math.min(100, sub / s.freeFrom * 100);
    return `<div class="freebar"><p>${left > 0 ? t('free_left', { n: eur(left) }) : t('free_reached')}</p><span class="bar"><i style="width:${pct}%"></i></span></div>`;
  }
  K.drawer = function (addedId) {
    const cart = ST.cart();
    const ov = C.sheet({ title: addedId ? t('added_title') : t('cart'), noFocus: false });
    if (!cart.length) { ov.body.innerHTML = `<div class="empty"><p>${t('cart_empty')}</p></div>`; ov.foot.innerHTML = `<a class="btn block" href="#/c/alle">${t('nav_shop')}</a>`; return; }
    const sub = ST.totals(cart).sub;
    const inCart = new Set(cart.map(i => i.pid));
    const last = ST.product((cart.find(i => i.id === addedId) || cart[cart.length - 1]).pid);
    const ups = ST.products().filter(p => !inCart.has(p.id) && last && (p.occ || []).some(o => (last.occ || []).includes(o)) && p.cat !== last.cat && p.stock > 0).sort((a, b) => (b.best ? 1 : 0) - (a.best ? 1 : 0)).slice(0, 3);
    ov.body.innerHTML = `${freeBar(sub)}<div class="clines">${cart.map(i => lineHTML(i, true)).join('')}</div>
      ${ups.length ? `<div class="ups"><h3>${t('goes_with')}</h3>${ups.map(p => `<a class="up" href="#/p/${esc(p.id)}"><img src="${esc(p.views[0].thumb)}" alt="" width="64" height="64"><span>${esc(L(p.name))}</span>${SHOP.priceHTML(p)}</a>`).join('')}</div>` : ''}`;
    ov.foot.innerHTML = `<div class="sumline"><span>${t('subtotal')}</span><b>${eur(sub)}</b></div><a class="btn block" href="#/kasse">${t('to_checkout')}</a><div class="two"><a class="btn ghost" href="#/warenkorb">${t('view_cart')}</a><button class="btn ghost" data-act="close">${t('continue_shopping')}</button></div>`;
  };
  K.page = function () {
    const cart = ST.cart();
    if (!cart.length) { SHOP.page(`<div class="wrap narrow empty"><h1>${t('cart')}</h1><p>${t('cart_empty')}</p><a class="btn" href="#/c/alle">${t('nav_shop')}</a></div>`, 'cart'); return; }
    const T = ST.totals(cart, { method: 'dhl' });
    SHOP.page(`<div class="wrap cartp"><div><h1>${t('cart')}</h1>${freeBar(T.sub)}<div class="clines big">${cart.map(i => lineHTML(i)).join('')}</div></div>
      <aside class="sumbox"><h2>${t('summary')}</h2><div class="sumline"><span>${t('subtotal')}</span><b>${eur(T.sub)}</b></div><p class="muted small">${t('ship_calc_next')}</p><a class="btn block" href="#/kasse">${t('to_checkout')}</a>
      <ul class="trust"><li>${ic('store')} ${t('trust_made')}</li><li>${ic('eye')} ${t('trust_proof')}</li></ul></aside></div>`, 'cart');
  };
  K.changeQty = function (id, d) { const c = ST.cart(); const it = c.find(i => i.id === id); if (!it) return; const q0 = it.qty; it.qty = Math.max(1, Math.min(50, it.qty + d)); if (it.pid === 'geschenkbox') c.filter(i => i.D && i.D.boxOf === id).forEach(i => { i.qty = Math.max(1, Math.round(i.qty / q0 * it.qty)); }); ST.saveCart(c); K.refresh(); };
  K.remove = function (id) { ST.saveCart(ST.cart().filter(i => i.id !== id && !(i.D && i.D.boxOf === id))); K.refresh(); C.toast(t('removed')); };
  K.refresh = function () { SHOP.refreshHeader(); if ($('.ov .clines')) K.drawer(); else if (C.path().startsWith('/warenkorb')) K.page(); else if (C.path().startsWith('/kasse')) K.checkout(); };

  /* ---------------- checkout ---------------- */
  let CO = null; // checkout state survives re-render
  const blankCO = () => { const me = ST.me(); const s = ST.settings(); const a = me && me.addresses && me.addresses[0];
    return { name: me ? me.name : '', email: me ? me.email : '', phone: me ? me.phone || '' : '', method: 'dhl', addr: a ? Object.assign({}, a) : { name: '', street: '', zip: '', city: '', country: 'DE' }, sameBill: true, bill: { name: '', street: '', zip: '', city: '', country: 'DE' },
      date: '', window: '', isGift: false, recipient: '', card: '', wrap: false, hidePrices: false, approval: s.approvalDefault, pay: 'paypal', coupon: '', giftcard: '', note: '', account: false, pw: '', marketing: false, agb: false, saveAddr: true }; };
  K.checkout = function () {
    const cart = ST.cart(); if (!cart.length) { C.go('#/warenkorb'); return; }
    if (!CO) CO = blankCO();
    const s = ST.settings(); const me = ST.me();
    const prodDays = ST.prodDaysOf(cart);
    const methods = ['pickup', 'local', 'dhl', 'eu'].filter(m => s.shipping[m] && s.shipping[m].on);
    if (!methods.includes(CO.method)) CO.method = methods[0];
    const T = ST.totals(cart, { method: CO.method, wrap: CO.wrap, coupon: CO.coupon, giftcard: CO.giftcard });
    const est = ST.deliveryDate(CO.method, prodDays);
    const dates = []; { let d = new Date(est); for (let i = 0; dates.length < 8 && i < 20; i++) { if (ST.isWorkday(d)) dates.push(ST.iso(d)); d = new Date(d.getTime() + 864e5); } }
    if (['pickup', 'local'].includes(CO.method) && !dates.includes(CO.date)) CO.date = dates[0];
    if (CO.method === 'local' && !s.shipping.local.windows.includes(CO.window)) CO.window = s.shipping.local.windows[0];
    const pays = Object.keys(s.payments).filter(k => s.payments[k] && (k !== 'cash' || CO.method === 'pickup'));
    if (!pays.includes(CO.pay)) CO.pay = pays[0];
    const hasCustom = cart.some(i => { const p = ST.product(i.pid); return p && !p.virtual && !ENG.isDefault(p, i.D); });
    const addrForm = (k, a, req) => `<div class="grid2">
      <label class="fld full"><span>${t('full_name')}</span><input class="in" data-co="${k}.name" value="${esc(a.name)}" autocomplete="name" ${req}></label>
      <label class="fld full"><span>${t('street')}</span><input class="in" data-co="${k}.street" value="${esc(a.street)}" autocomplete="street-address" ${req}></label>
      <label class="fld"><span>${t('zip')}</span><input class="in" data-co="${k}.zip" value="${esc(a.zip)}" inputmode="numeric" autocomplete="postal-code" ${req}></label>
      <label class="fld"><span>${t('city')}</span><input class="in" data-co="${k}.city" value="${esc(a.city)}" autocomplete="address-level2" ${req}></label>
      ${k === 'addr' && CO.method === 'eu' ? `<label class="fld full"><span>${t('country')}</span><select class="in" data-co="addr.country">${['AT', 'NL', 'BE', 'FR', 'DK', 'PL', 'CH', 'IT', 'ES', 'SE'].map(c => `<option${a.country === c ? ' selected' : ''} value="${c}">${t('cty_' + c)}</option>`).join('')}</select></label>` : ''}</div>`;
    if (CO.method === 'eu' && CO.addr.country === 'DE') CO.addr.country = 'AT';
    if (CO.method !== 'eu') CO.addr.country = 'DE';
    const localBad = CO.method === 'local' && CO.addr.zip && !ST.localZip(CO.addr.zip);
    SHOP.page(`<div class="wrap co">
      <div class="co-main">
        <h1>${t('checkout')}</h1>
        <form data-form="checkout" novalidate id="coForm">
        <section class="co-sec"><h2><span>1</span>${t('co_contact')}</h2>
          ${me ? `<p class="muted">${t('logged_in_as', { e: esc(me.email) })}</p>` : `<p class="muted">${t('co_have_acc')} <a href="#/konto?next=kasse">${t('login')}</a></p>`}
          <div class="grid2"><label class="fld full"><span>${t('full_name')}</span><input class="in" data-co="name" value="${esc(CO.name)}" autocomplete="name" required></label>
          <label class="fld"><span>${t('email')}</span><input class="in" type="email" data-co="email" value="${esc(CO.email)}" autocomplete="email" required></label>
          <label class="fld"><span>${t('phone')} <small>${t('phone_why')}</small></span><input class="in" type="tel" data-co="phone" value="${esc(CO.phone)}" autocomplete="tel" required></label></div>
        </section>

        <section class="co-sec"><h2><span>2</span>${t('co_delivery')}</h2>
          <div class="mopts">${methods.map(m => { const pr = m === 'pickup' ? 0 : m === 'dhl' && T.sub >= s.freeFrom ? 0 : s.shipping[m].price; const d = ST.deliveryDate(m, prodDays);
            return `<label class="mopt"><input type="radio" name="method" value="${m}" data-co="method"${CO.method === m ? ' checked' : ''}><span class="mi">${ic({ pickup: 'store', local: 'bike', dhl: 'truck', eu: 'globe' }[m])}</span><span class="mt"><b>${t('m_' + m)}</b><small>${m === 'pickup' ? t('mo_pickup', { d: C.date(d) }) : m === 'local' ? t('mo_local', { d: C.date(d) }) : t('mo_ship', { d: C.date(d) })}</small></span><em>${pr ? eur(pr) : t('free')}</em></label>`; }).join('')}</div>
          ${CO.method === 'pickup' ? `<div class="pickbox">${ic('store')}<div><b>${esc(s.shop.name)}</b><p>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}<br>${t('mon_sat')} <bdi dir="ltr">${esc(s.hours.wd)}</bdi> · ${t('sunday')} <bdi dir="ltr">${esc(s.hours.sun)}</bdi></p></div></div>` : ''}
          ${['pickup', 'local'].includes(CO.method) ? `<div class="fld"><span class="lb">${CO.method === 'pickup' ? t('pick_date') : t('deliv_date')}</span><div class="dates">${dates.map(d => `<label><input type="radio" name="date" value="${d}" data-co="date"${CO.date === d ? ' checked' : ''}><span><small>${C.date(d, { weekday: 'short' })}</small><b>${C.date(d, { day: 'numeric' })}</b><small>${C.date(d, { month: 'short' })}</small></span></label>`).join('')}</div></div>` : ''}
          ${CO.method === 'local' ? `<div class="fld"><span class="lb">${t('time_window')}</span><div class="seg">${s.shipping.local.windows.map(w => `<button type="button" data-cow="${w}" aria-pressed="${CO.window === w}"><bdi dir="ltr">${w}</bdi></button>`).join('')}</div></div>` : ''}
          ${CO.method !== 'pickup' ? `<h3 class="sub">${t('ship_addr')}</h3>${addrForm('addr', CO.addr, 'required')}${localBad ? `<p class="warn">${t('local_zip_bad')}</p>` : CO.method === 'local' ? `<p class="hint">${t('local_zip_hint')}</p>` : ''}` : ''}
          ${me && me.addresses && me.addresses.length > 1 && CO.method !== 'pickup' ? `<div class="seg sm">${me.addresses.map((a, i) => `<button type="button" data-coaddr="${i}">${esc(a.street)}</button>`).join('')}</div>` : ''}
          <label class="check"><input type="checkbox" data-co="isGift"${CO.isGift ? ' checked' : ''}><span>${t('is_gift')}</span></label>
          ${CO.isGift ? `<div class="giftbox">
            ${CO.method !== 'pickup' ? `<p class="hint">${t('gift_hint')}</p>` : ''}
            <label class="fld"><span>${t('gift_card')} <small>${t('optional')}</small></span><textarea class="in" rows="3" maxlength="240" data-co="card" placeholder="${esc(t('gift_card_ph'))}">${esc(CO.card)}</textarea></label>
            <label class="check"><input type="checkbox" data-co="wrap"${CO.wrap ? ' checked' : ''}><span>${t('gift_wrap')} <small>+${eur(s.wrap)}</small></span></label>
            <label class="check"><input type="checkbox" data-co="hidePrices"${CO.hidePrices ? ' checked' : ''}><span>${t('hide_prices')}</span></label></div>` : ''}
        </section>

        ${hasCustom ? `<section class="co-sec"><h2><span>3</span>${t('co_proof')}</h2>
          <label class="check big"><input type="checkbox" data-co="approval"${CO.approval ? ' checked' : ''}><span><b>${t('proof_opt')}</b><small>${t('proof_opt_d')}</small></span></label></section>` : ''}

        <section class="co-sec"><h2><span>${hasCustom ? 4 : 3}</span>${t('co_payment')}</h2>
          <div class="pays">${pays.map(k => `<label class="pay"><input type="radio" name="pay" value="${k}" data-co="pay"${CO.pay === k ? ' checked' : ''}><span class="pl pl-${k}">${t('pay_' + k)}</span><small>${t('payd_' + k)}</small></label>`).join('')}</div>
          ${CO.method === 'pickup' ? '' : `<label class="check"><input type="checkbox" data-co="sameBill"${CO.sameBill ? ' checked' : ''}><span>${t('same_bill')}</span></label>`}
          ${CO.method === 'pickup' || !CO.sameBill ? `<h3 class="sub">${t('bill_addr')}</h3>${addrForm('bill', CO.bill, 'required')}` : ''}
          <label class="fld"><span>${t('order_note')} <small>${t('optional')}</small></span><textarea class="in" rows="2" maxlength="400" data-co="note">${esc(CO.note)}</textarea></label>
          ${me ? '' : `<label class="check"><input type="checkbox" data-co="account"${CO.account ? ' checked' : ''}><span>${t('create_acc')}</span></label>${CO.account ? `<label class="fld"><span>${t('password')}</span><input class="in" type="password" data-co="pw" minlength="6" value="${esc(CO.pw)}" autocomplete="new-password"></label>` : ''}`}
          <label class="check"><input type="checkbox" data-co="marketing"${CO.marketing ? ' checked' : ''}><span>${t('marketing_opt')}</span></label>
        </section>
        </form>
      </div>
      <aside class="co-side"><div class="sumbox sticky">
        <h2>${t('summary')}</h2>
        <div class="mini-lines">${cart.map(i => `<div class="ml"><img src="${esc(i.preview || '')}" alt="" width="56" height="56"><span>${esc(L(i.name))}<small>${esc(DOCS.linesText(i, C.lang()).slice(0, 70))}</small></span><b>${i.qty > 1 ? i.qty + ' × ' : ''}${eur(i.unit)}</b></div>`).join('')}</div>
        <div class="codes"><div class="row"><input class="in" id="cpn" placeholder="${esc(t('coupon'))}" value="${esc(CO.coupon)}"><button type="button" class="btn ghost sm" data-act="cpn">${t('apply')}</button></div>
          <div class="row"><input class="in" id="gcd" placeholder="${esc(t('giftcard_code'))}" value="${esc(CO.giftcard)}"><button type="button" class="btn ghost sm" data-act="gcd">${t('apply')}</button></div></div>
        <dl class="tot"><dt>${t('subtotal')}</dt><dd>${eur(T.sub)}</dd><dt>${t('shipping')}</dt><dd>${T.ship ? eur(T.ship) : t('free')}</dd>${T.wrap ? `<dt>${t('gift_wrap')}</dt><dd>${eur(T.wrap)}</dd>` : ''}${T.discount ? `<dt>${t('discount')} <button type="button" class="link" data-act="cpn-x">${esc(CO.coupon.toUpperCase())} ×</button></dt><dd>−${eur(T.discount)}</dd>` : ''}${T.gift ? `<dt>${t('giftcard')} <button type="button" class="link" data-act="gcd-x">×</button></dt><dd>−${eur(T.gift)}</dd>` : ''}<dt class="big">${t('total')}</dt><dd class="big">${eur(T.total)}</dd></dl>
        <p class="muted small">${t('incl_vat_x', { v: Object.keys(T.vat).map(r => r + ' %: ' + eur(T.vat[r])).join(' · ') || '0' })}</p>
        ${T.freeLeft > 0 && CO.method === 'dhl' ? `<p class="hint">${t('free_left', { n: eur(T.freeLeft) })}</p>` : ''}
        <p class="eta-sum">${ic('calendar')}<span>${['pickup', 'local'].includes(CO.method) ? t('eta_chosen', { d: C.date(CO.date) }) : t('eta_est', { d: C.date(est) })}${CO.approval && hasCustom ? '<br><small>' + t('eta_proof') + '</small>' : ''}</span></p>
        <label class="check"><input type="checkbox" data-co="agb"${CO.agb ? ' checked' : ''}><span>${t('agb_accept')}</span></label>
        <button class="btn block big" data-act="place">${t('place_order')} · ${eur(T.total)}</button>
        <p class="muted small center">${ic('check')} ${t('secure_note')}</p>
      </div></aside></div>`, 'checkout');
  };
  const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; while (ks.length > 1) x = x[ks.shift()]; x[ks[0]] = v; };
  const RERENDER = ['method', 'isGift', 'wrap', 'approval', 'sameBill', 'account', 'pay', 'addr.country'];
  K.onInput = function (el) {
    if (!CO || !el.dataset.co) return false;
    const k = el.dataset.co; const v = el.type === 'checkbox' ? el.checked : el.value;
    setPath(CO, k, v);
    if (RERENDER.includes(k) || (k === 'addr.zip' && CO.method === 'local' && String(v).length >= 5)) { const y = scrollY; K.checkout(); scrollTo(0, y); }
    return true;
  };
  K.onClick = function (el) {
    if (el.dataset.cow) { CO.window = el.dataset.cow; $$('[data-cow]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); return true; }
    if (el.dataset.coaddr != null) { const me = ST.me(); CO.addr = Object.assign({}, me.addresses[+el.dataset.coaddr]); const y = scrollY; K.checkout(); scrollTo(0, y); return true; }
    switch (el.dataset.act) {
      case 'cq': K.changeQty(el.dataset.id, +el.dataset.d); return true;
      case 'crm': K.remove(el.dataset.id); return true;
      case 'cpn': { const v = $('#cpn').value; const sub = ST.totals(ST.cart()).sub; const r = ST.findCoupon(v, sub); if (r.err) { C.toast(t('cpn_' + r.err, { n: eur(r.min || 0) }), 'err'); return true; } CO.coupon = r.c.code; C.toast(t('cpn_ok')); rr(); return true; }
      case 'cpn-x': CO.coupon = ''; rr(); return true;
      case 'gcd': { const r = ST.findGiftcard($('#gcd').value); if (r.err) { C.toast(t('gc_' + r.err), 'err'); return true; } CO.giftcard = r.g.code; C.toast(t('gc_ok', { n: eur(r.g.balance) })); rr(); return true; }
      case 'gcd-x': CO.giftcard = ''; rr(); return true;
      case 'place': K.place(); return true;
    }
    return false;
  };
  const rr = () => { const y = scrollY; K.checkout(); scrollTo(0, y); };
  function validate() {
    const bad = [];
    const em = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!CO.name.trim()) bad.push('name'); if (!em.test(CO.email.trim())) bad.push('email'); if (String(CO.phone).replace(/\D/g, '').length < 6) bad.push('phone');
    if (CO.method !== 'pickup') { for (const f of ['name', 'street', 'zip', 'city']) if (!String(CO.addr[f]).trim()) bad.push('addr.' + f); if (CO.method === 'local' && !ST.localZip(CO.addr.zip)) bad.push('addr.zip'); }
    if (CO.method === 'pickup' || !CO.sameBill) for (const f of ['name', 'street', 'zip', 'city']) if (!String(CO.bill[f]).trim()) bad.push('bill.' + f);
    if (CO.account && !ST.me() && String(CO.pw).length < 6) bad.push('pw');
    if (!CO.agb) bad.push('agb');
    return bad;
  }
  K.place = async function () {
    $$('[data-co]').forEach(el => { if (el.type !== 'radio' && el.type !== 'checkbox') setPath(CO, el.dataset.co, el.value); });
    const bad = validate();
    $$('.co .bad').forEach(e => e.classList.remove('bad'));
    if (bad.length) {
      bad.forEach(k => { const el = $(`[data-co="${k}"]`); if (el) (el.closest('.fld,.check') || el).classList.add('bad'); });
      const first = $(`[data-co="${bad[0]}"]`); if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => first.focus({ preventScroll: true }), 300); }
      C.toast(bad[0] === 'agb' ? t('need_agb') : bad[0] === 'addr.zip' && CO.method === 'local' ? t('local_zip_bad') : t('need_fields'), 'err'); return;
    }
    const ok = await K.pay(CO.pay, ST.totals(ST.cart(), { method: CO.method, wrap: CO.wrap, coupon: CO.coupon, giftcard: CO.giftcard }).total);
    if (!ok) return;
    if (CO.account && !ST.me()) { const r = await ST.register({ name: CO.name, email: CO.email, phone: CO.phone, pw: CO.pw, marketing: CO.marketing }); if (r.err === 'exists') C.toast(t('acc_exists'), 'err'); }
    const bill = CO.method === 'pickup' || !CO.sameBill ? CO.bill : CO.addr;
    const r = ST.placeOrder({ name: CO.name.trim(), email: CO.email.trim(), phone: CO.phone.trim(), method: CO.method, addr: CO.method === 'pickup' ? null : Object.assign({}, CO.addr, { name: CO.addr.name || CO.name }), bill: Object.assign({}, bill),
      date: ['pickup', 'local'].includes(CO.method) ? CO.date : '', window: CO.method === 'local' ? CO.window : '', recipient: CO.isGift && CO.method !== 'pickup' ? CO.addr.name : '', isGift: CO.isGift, card: CO.isGift ? CO.card : '', wrap: CO.isGift && CO.wrap, hidePrices: CO.isGift && CO.hidePrices,
      approval: CO.approval, pay: CO.pay, coupon: CO.coupon, giftcard: CO.giftcard, note: CO.note, lang: C.lang(), marketing: CO.marketing, saveAddr: CO.saveAddr });
    if (r.err) { C.toast(t('cart_empty'), 'err'); return; }
    CO = null; SHOP.refreshHeader();
    ST.set('lastOrderMine', { no: r.o.no, email: r.o.cust.email });
    C.go('#/danke/' + r.o.no);
  };
  /** demo payment: no real payment data is asked for */
  K.pay = function (method, total) {
    if (['vorkasse', 'cash'].includes(method)) return Promise.resolve(true);
    return new Promise(res => {
      const ov = C.sheet({ title: t('pay_' + method), kind: 'modal' });
      ov.body.innerHTML = `<div class="paydemo"><span class="pl pl-${method} big">${t('pay_' + method)}</span><p class="paysum">${eur(total)}</p><p class="muted">${t('pay_demo_p')}</p></div>`;
      ov.foot.innerHTML = `<button class="btn ghost" data-r="0">${t('cancel')}</button><button class="btn" data-r="1">${t('pay_demo_btn')}</button>`;
      let done = false;
      ov.addEventListener('click', e => { const b = e.target.closest('[data-r],[data-act=close]'); if (!b || done) return; done = true;
        if (b.dataset.r !== '1') { C.closeAll(); res(false); return; }
        b.disabled = true; b.innerHTML = `<span class="spin"></span> ${t('paying')}`; setTimeout(() => { C.closeAll(); res(true); }, 1100); });
    });
  };

  /* ---------------- confirmation ---------------- */
  K.thanks = function (no) {
    const o = ST.order(no); const mine = ST.get('lastOrderMine', null);
    if (!o || !mine || mine.no !== no) { C.go('#/verfolgen'); return; }
    const s = ST.settings();
    SHOP.page(`<div class="wrap narrow thanks">
      <div class="okmark">${ic('check')}</div>
      <h1>${t('thanks_h', { n: esc(o.cust.name.split(' ')[0]) })}</h1>
      <p class="lead">${t('thanks_p', { no: o.no, e: esc(o.cust.email) })}</p>
      <div class="when f-sage"><span>${ic(o.ship.method === 'pickup' ? 'store' : o.ship.method === 'local' ? 'bike' : 'truck')}</span><div><b>${o.ship.method === 'pickup' ? t('thx_pickup') : o.ship.method === 'local' ? t('thx_local') : t('thx_ship')}</b><p>${C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' })}${o.ship.window ? ' · ' + esc(o.ship.window) : ''}</p></div></div>
      ${o.pay.method === 'vorkasse' ? `<div class="bankbox"><h2>${t('bank_h')}</h2><dl><dt>${t('bank_amount')}</dt><dd>${eur(o.totals.total)}</dd><dt>IBAN</dt><dd><bdi dir="ltr">${esc(s.shop.iban)}</bdi></dd><dt>${t('bank_name')}</dt><dd>${esc(s.shop.bank)}</dd><dt>${t('bank_ref')}</dt><dd>${o.no}</dd></dl></div>` : ''}
      ${o.approval ? `<p class="hint">${ic('eye')} ${t('thx_proof')}</p>` : ''}
      <ol class="steps-line">${['s_received', o.approval ? 's_proof' : null, 's_making', o.ship.method === 'pickup' ? 's_ready' : 's_shipped', 's_done'].filter(Boolean).map((k, i) => `<li class="${i === 0 ? 'on' : ''}"><span></span>${t(k)}</li>`).join('')}</ol>
      <div class="vbtns center"><a class="btn" href="#/verfolgen/${o.no}?e=${encodeURIComponent(o.cust.email)}">${t('track_order')}</a><a class="btn ghost" href="#/postfach">${ic('mail')} ${t('see_emails')}</a></div>
      <p class="muted small center">${t('thx_cancel', { min: s.cancelMinutes })}</p>
      ${ST.me() ? '' : `<p class="center"><a class="link" href="#/konto">${t('thx_acc')}</a></p>`}
    </div>`, 'thanks');
  };

  /* ---------------- tracking ---------------- */
  const STEPS = o => ['neu', o.approval ? 'freigabe' : null, 'produktion', 'bereit', o.ship.method === 'pickup' ? null : 'unterwegs', 'zugestellt'].filter(Boolean);
  const stLabel = (st, o) => t('st_' + st + (st === 'bereit' ? '_' + o.ship.method : '') + (st === 'zugestellt' && o.ship.method === 'pickup' ? '_pickup' : ''));
  K.stLabel = stLabel;
  K.track = function (no, q) {
    q = q || {};
    const mine = ST.get('lastOrderMine', null); const me = ST.me();
    const o = no ? ST.order(no) : null;
    const allowed = o && ((q.e && q.e.toLowerCase() === o.cust.email) || (me && me.id === o.cust.id) || (mine && mine.no === o.no));
    if (!o || !allowed) {
      SHOP.page(`<div class="wrap narrow track"><h1>${t('track_title')}</h1><p class="lead">${t('track_lead')}</p>
        <form class="trackform" data-form="track"><label class="fld"><span>${t('order_no')}</span><input class="in" name="no" placeholder="AN-10041" value="${esc(no || '')}" required></label><label class="fld"><span>${t('email')}</span><input class="in" name="e" type="email" required value="${esc(q.e || '')}"></label><button class="btn">${t('track_btn')}</button></form>
        ${no ? `<p class="warn">${t('track_nf')}</p>` : ''}
        ${me ? `<p><a class="link" href="#/konto/bestellungen">${t('my_orders')}</a></p>` : ''}</div>`, 'track');
      return;
    }
    const steps = STEPS(o); const cur = o.status === 'storniert' ? -1 : steps.indexOf(o.status);
    const canCancel = o.status === 'neu' && Date.now() < o.cancelUntil;
    const pendingAppr = o.items.filter(i => i.approval && i.approval.status !== 'ok');
    const ev = o.history.slice().reverse();
    SHOP.page(`<div class="wrap track-d">
      <div class="td-head"><div><p class="muted">${t('order_no')} <b><bdi>${o.no}</bdi></b> · <bdi>${C.date(o.created, { day: 'numeric', month: 'long', year: 'numeric' })}</bdi></p><h1>${o.status === 'storniert' ? t('st_storniert') : stLabel(o.status, o)}</h1>
        <p class="lead">${o.status === 'storniert' ? '' : o.status === 'zugestellt' ? t('td_done') : t('td_eta', { d: C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' }) }) + (o.ship.window ? ' · ' + esc(o.ship.window) : '')}</p></div></div>
      ${o.status !== 'storniert' ? `<ol class="progress">${steps.map((s, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><span></span><b>${stLabel(s, o)}</b>${(o.history.find(h => h.st === s) || {}).at ? `<small>${C.dt(o.history.find(h => h.st === s).at)}</small>` : ''}</li>`).join('')}</ol>` : ''}
      ${pendingAppr.length && o.status === 'freigabe' ? `<div class="callout f-blush"><b>${t('td_appr')}</b><p>${t('td_appr_p')}</p><a class="btn" href="#/freigabe/${o.no}/${pendingAppr[0].approval.token}">${t('td_appr_btn')}</a></div>` : ''}
      ${o.tracking ? `<div class="callout"><b>${t('tracking_no')}: <bdi dir="ltr">${esc(o.tracking.code)}</bdi></b><a class="btn ghost sm" target="_blank" rel="noopener" href="${DOCS.trackUrl(o.tracking.code)}">${ic('truck')} ${t('ml_sh_btn')}</a></div>` : ''}
      <div class="td-grid">
        <section><h2>${t('items')}</h2><div class="clines">${o.items.map(it => `<div class="cline ro"><span class="cthumb"><img src="${esc(it.preview || '')}" alt="" width="96" height="96"></span><div class="cinfo"><b>${esc(L(it.name))}</b><ul class="clist">${DOCS.lines(it, C.lang()).map(([a, b]) => `<li><span>${esc(a)}</span> ${esc(b)}</li>`).join('')}</ul><small class="muted">${t('qty')}: ${it.qty}</small></div><span class="cprice">${eur(it.unit * it.qty)}</span></div>`).join('')}</div>
          <dl class="tot"><dt>${t('shipping')}</dt><dd>${o.totals.ship ? eur(o.totals.ship) : t('free')}</dd>${o.totals.wrap ? `<dt>${t('gift_wrap')}</dt><dd>${eur(o.totals.wrap)}</dd>` : ''}${o.totals.discount ? `<dt>${t('discount')}</dt><dd>−${eur(o.totals.discount)}</dd>` : ''}${o.totals.gift ? `<dt>${t('giftcard')}</dt><dd>−${eur(o.totals.gift)}</dd>` : ''}<dt class="big">${t('total')}</dt><dd class="big">${eur(o.totals.total)}</dd></dl></section>
        <aside>
          <div class="infobox"><h3>${t('m_' + o.ship.method)}</h3>${o.ship.addr ? `<p>${[o.ship.addr.name, o.ship.addr.street, o.ship.addr.zip + ' ' + o.ship.addr.city].map(esc).join('<br>')}</p>` : `<p>${esc(ST.settings().shop.street)}, ${esc(ST.settings().shop.city)}</p>`}</div>
          <div class="infobox"><h3>${t('payment')}</h3><p>${t('pay_' + o.pay.method)} · ${o.pay.status === 'bezahlt' ? t('paid') : o.pay.status === 'erstattet' ? t('refunded') : t('unpaid')}</p><button class="link" data-act="inv" data-no="${o.no}">${ic('download')} ${t('invoice_pdf')}</button></div>
          <div class="infobox"><h3>${t('history')}</h3><ul class="hist">${ev.map(h => `<li><b>${h.st === 'storniert' ? t('st_storniert') : stLabel(h.st, o)}</b><small>${C.dt(h.at)}</small></li>`).join('')}</ul></div>
          ${canCancel ? `<button class="btn ghost block" data-act="ocancel" data-no="${o.no}">${t('cancel_order')}</button><p class="muted small">${t('cancel_until', { t: new Date(o.cancelUntil).toLocaleTimeString(C.loc(), { hour: '2-digit', minute: '2-digit' }) })}</p>` : ''}
          ${['bereit', 'unterwegs', 'zugestellt'].includes(o.status) ? `<details class="infobox"><summary>${t('problem')}</summary><form class="mini" data-form="complaint" data-no="${o.no}"><textarea class="in" name="text" rows="3" required maxlength="800" placeholder="${esc(t('problem_ph'))}"></textarea><button class="btn ghost sm">${t('send')}</button></form></details>` : ''}
          ${o.status === 'zugestellt' ? `<div class="infobox f-blush"><h3>${t('review_ask')}</h3><a class="btn sm" href="#/p/${esc(o.items[0].pid)}?review=1">${t('write_review')}</a></div>` : ''}
        </aside></div></div>`, 'track');
  };

  /* ---------------- design approval ---------------- */
  K.approval = async function (no, token) {
    const o = ST.order(no);
    const it = o && o.items.find(i => i.approval && i.approval.token === token);
    if (!o || !it) { SHOP.page(`<div class="wrap narrow empty"><h1>${t('not_found')}</h1></div>`); return; }
    const items = o.items.filter(i => i.approval);
    const done = items.every(i => i.approval.status === 'ok');
    SHOP.page(`<div class="wrap appr"><h1>${t('appr_h')}</h1><p class="lead">${t('appr_p', { no: o.no })}</p>
      ${items.map((i, k) => `<section class="appr-item"><div class="appr-img"><canvas data-appr="${k}"></canvas></div><div><h2>${esc(L(i.name))}</h2><ul class="clist">${DOCS.lines(i, C.lang()).map(([a, b]) => `<li><span>${esc(a)}</span> ${esc(b)}</li>`).join('')}</ul>
        ${i.approval.comments.length ? `<div class="thread">${i.approval.comments.map(c => `<p class="${c.by === 'shop' ? 'shop' : ''}"><b>${c.by === 'shop' ? esc(ST.settings().shop.name) : t('you')}</b> ${esc(c.text)}</p>`).join('')}</div>` : ''}
        ${i.approval.status === 'ok' ? `<p class="okline">${ic('check')} ${t('appr_done')}</p>` : `<div class="appr-act" data-k="${k}"><button class="btn" data-act="appr-ok" data-no="${o.no}" data-i="${o.items.indexOf(i)}">${ic('check')} ${t('appr_ok')}</button><button class="btn ghost" data-act="appr-change" data-no="${o.no}" data-i="${o.items.indexOf(i)}">${ic('edit')} ${t('appr_change')}</button></div>`}
      </div></section>`).join('')}
      ${done ? `<div class="callout f-sage"><b>${t('appr_all')}</b><a class="btn ghost sm" href="#/verfolgen/${o.no}?e=${encodeURIComponent(o.cust.email)}">${t('track_order')}</a></div>` : ''}</div>`, 'appr');
    for (const c of $$('[data-appr]')) { const i = items[+c.dataset.appr]; const p = ST.product(i.pid); if (p) await ENG.render(c, p, 0, i.D, { maxW: 1000, force: true }); }
  };
  K.approve = function (no, idx, ok, msg) {
    const o = ST.updateOrder(no, o => { const a = o.items[idx].approval; a.status = ok ? 'ok' : 'change'; if (msg) a.comments.push({ by: 'kunde', text: msg, at: Date.now() }); });
    ST.log('freigabe', `${no}: Artikel ${idx + 1} ${ok ? 'freigegeben' : 'Änderung gewünscht'}`, 'kunde');
    ST.sendMail('approved', o, { ok, msg: msg || '', toEmail: ST.settings().shop.email });
    const em = ST.emails(); if (em[0] && em[0].tpl === 'approved') { em[0].lang = 'de'; ST.set('emails', em); }
    C.toast(ok ? t('appr_thx') : t('appr_change_thx'));
  };

  /* ---------------- account ---------------- */
  K.account = function (tab, q) {
    const me = ST.me();
    if (!me) {
      const mode = tab === 'registrieren' ? 'reg' : 'login';
      SHOP.page(`<div class="wrap acc-auth"><div class="auth-art"><img src="img/p/p37.jpg" alt="" width="420" height="483"></div><div class="auth-box"><p class="muted">${t('auth_welcome')}</p><h1>${mode === 'login' ? t('login') : t('register')}</h1>
        <div class="tabs2" role="tablist"><a role="tab" href="#/konto" aria-selected="${mode === 'login'}">${t('login')}</a><a role="tab" href="#/konto/registrieren" aria-selected="${mode === 'reg'}">${t('register')}</a></div>
        ${mode === 'login' ? `<form class="authf" data-form="login" data-next="${esc((q && q.next) || '')}"><label class="fld"><span>${t('email')}</span><input class="in" name="email" type="email" autocomplete="email" required></label><label class="fld"><span>${t('password')}</span><input class="in" name="pw" type="password" autocomplete="current-password" required></label><button class="btn block">${t('login')}</button><p class="muted small">${t('demo_acc_note')}</p></form>` :
        `<form class="authf" data-form="register"><label class="fld"><span>${t('full_name')}</span><input class="in" name="name" autocomplete="name" required></label><label class="fld"><span>${t('email')}</span><input class="in" name="email" type="email" autocomplete="email" required></label><label class="fld"><span>${t('phone')}</span><input class="in" name="phone" type="tel" autocomplete="tel"></label><label class="fld"><span>${t('password')}</span><input class="in" name="pw" type="password" minlength="6" autocomplete="new-password" required></label><label class="check"><input type="checkbox" name="marketing"><span>${t('marketing_opt')}</span></label><button class="btn block">${t('register')}</button></form>`}
        <div class="acc-benefits"><p>${ic('truck')} ${t('acc_b1')}</p><p>${ic('heart')} ${t('acc_b2')}</p><p>${ic('bag')} ${t('acc_b3')}</p></div></div></div>`, 'acc');
      return;
    }
    tab = tab || 'bestellungen';
    const orders = ST.orders().filter(o => o.cust.id === me.id || o.cust.email === me.email);
    const tabs = [['bestellungen', t('my_orders')], ['designs', t('my_designs')], ['adressen', t('addresses')], ['profil', t('profile')]];
    let body = '';
    if (tab === 'bestellungen') body = orders.length ? `<div class="olist">${orders.map(o => `<a class="orow" href="#/verfolgen/${o.no}"><span class="othumbs">${o.items.slice(0, 3).map(i => `<img src="${esc(i.preview || '')}" alt="" width="56" height="56">`).join('')}</span><span><b>${o.no}</b><small>${C.date(o.created, { day: 'numeric', month: 'long', year: 'numeric' })} · ${o.items.length} ${t('items_n')}</small></span><span class="badge st-${o.status}">${o.status === 'storniert' ? t('st_storniert') : stLabel(o.status, o)}</span><b>${eur(o.totals.total)}</b></a>`).join('')}</div>` : `<p class="muted">${t('no_orders')}</p><a class="btn" href="#/c/alle">${t('nav_shop')}</a>`;
    if (tab === 'designs') { const ds = (me.designs || []).map(d => Object.assign({}, d, ST.design(d.code) || {})).filter(d => d.D && ST.product(d.pid)); body = ds.length ? `<div class="pgrid">${ds.map(d => { const p = ST.product(d.pid); return `<article class="pcard"><a class="pimg" href="#/p/${esc(p.id)}?d=${PDP.encode(d.D)}"><canvas data-dz="${esc(d.code)}"></canvas></a><a class="pmeta" href="#/p/${esc(p.id)}?d=${PDP.encode(d.D)}"><span class="pname">${esc(L(p.name))}</span><span class="muted small">${C.date(d.at)}</span></a></article>`; }).join('')}</div>` : `<p class="muted">${t('no_designs')}</p>`; }
    if (tab === 'adressen') body = `<div class="addrs">${(me.addresses || []).map((a, i) => `<div class="infobox"><p>${[a.name, a.street, a.zip + ' ' + a.city].map(esc).join('<br>')}</p><button class="link" data-act="addr-del" data-i="${i}">${t('remove')}</button></div>`).join('') || `<p class="muted">${t('no_addr')}</p>`}</div>
      <form class="mini" data-form="addr"><h3>${t('add_addr')}</h3><div class="grid2"><label class="fld full"><span>${t('full_name')}</span><input class="in" name="name" required value="${esc(me.name)}"></label><label class="fld full"><span>${t('street')}</span><input class="in" name="street" required></label><label class="fld"><span>${t('zip')}</span><input class="in" name="zip" required></label><label class="fld"><span>${t('city')}</span><input class="in" name="city" required></label></div><button class="btn ghost sm">${t('save')}</button></form>`;
    if (tab === 'profil') body = `<form class="mini" data-form="profile"><div class="grid2"><label class="fld full"><span>${t('full_name')}</span><input class="in" name="name" required value="${esc(me.name)}"></label><label class="fld"><span>${t('email')}</span><input class="in" value="${esc(me.email)}" disabled></label><label class="fld"><span>${t('phone')}</span><input class="in" name="phone" value="${esc(me.phone || '')}"></label></div><label class="check"><input type="checkbox" name="marketing"${me.marketing ? ' checked' : ''}><span>${t('marketing_opt')}</span></label><button class="btn ghost sm">${t('save')}</button></form>
      <div class="dsgvo"><h3>${t('privacy')}</h3><p class="muted">${t('dsgvo_p')}</p><div class="vbtns"><button class="btn ghost sm" data-act="export-me">${ic('download')} ${t('export_data')}</button><button class="btn ghost sm danger" data-act="delete-me">${ic('trash')} ${t('delete_acc')}</button></div></div>`;
    SHOP.page(`<div class="wrap acc"><div class="acc-head"><h1>${t('hello', { n: esc(me.name.split(' ')[0]) })}</h1><button class="btn ghost sm" data-act="logout">${ic('logout')} ${t('logout')}</button></div>
      <nav class="chips">${tabs.map(([k, l]) => `<a href="#/konto/${k}"${k === tab ? ' aria-current="page"' : ''}>${l}</a>`).join('')}<a href="#/wunschliste">${t('wishlist')}</a><a href="#/postfach">${t('mailbox')}</a></nav>
      <div class="acc-body">${body}</div></div>`, 'acc');
    $$('[data-dz]').forEach(async c => { const d = ST.design(c.dataset.dz); const p = d && ST.product(d.pid); if (p) await ENG.render(c, p, 0, d.D, { maxW: 600, force: true }); });
  };

  /* ---------------- demo mailbox ---------------- */
  K.mailbox = function (id) {
    const me = ST.me(); const mine = ST.get('lastOrderMine', null);
    const mails = ST.emails().filter(m => m.tpl !== 'owner_new' && m.tpl !== 'complaint' && m.tpl !== 'approved' && ((me && m.to === me.email) || (mine && m.to === mine.email)));
    const cur = mails.find(m => m.id === id) || null;
    SHOP.page(`<div class="wrap mailbox"><h1>${t('mailbox')}</h1><p class="lead">${t('mailbox_p')}</p>
      ${mails.length ? `<div class="mb"><ul class="mb-list">${mails.map(m => { const x = DOCS.mail(m); return `<li><a href="#/postfach/${m.id}"${cur && cur.id === m.id ? ' aria-current="true"' : ''}><b>${esc(x.subject)}</b><small>${esc(m.to)} · ${C.ago(m.at)}</small></a></li>`; }).join('')}</ul>
        <div class="mb-view">${cur ? `<h2>${esc(DOCS.mail(cur).subject)}</h2><div class="mailframe">${DOCS.mail(cur).html}</div>` : `<p class="muted">${t('mailbox_pick')}</p>`}</div></div>` : `<p class="muted">${t('mailbox_empty')}</p>`}</div>`, 'mailbox');
  };
})();
