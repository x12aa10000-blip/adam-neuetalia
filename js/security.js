/* Security layer for the static shop (no server yet):
   - limits how often forms can be sent (login, register, reviews, questions, newsletter, coupons, tracking …)
   - cleans every text a visitor sends (control characters, length limits)
   - customer sessions end after 30 days, admin sessions after 12 hours
   - the shop and the admin cannot be shown inside someone else's frame (click-jacking)
   - warns the owner while a demo PIN (1234 / 0000) is still active */
(function () {
  'use strict';
  const D = window.I18N;
  if (D) { D.de.sec_slow = 'Zu viele Versuche. Bitte warte {s} Sekunden.'; D.en.sec_slow = 'Too many attempts. Please wait {s} seconds.'; D.ar.sec_slow = 'محاولات كثيرة. انتظر {s} ثانية من فضلك.'; }

  /* ---------- no framing ---------- */
  try { if (window.top !== window.self) { document.documentElement.style.display = 'none'; window.top.location = window.self.location.href; } } catch (e) { document.documentElement.style.display = 'none'; }

  /* ---------- rate limits: max sends per window ---------- */
  const LIMITS = { login: [5, 60], register: [3, 300], review: [3, 600], question: [3, 600], news: [3, 600], giftcard: [6, 300], track: [10, 300], complaint: [3, 600], checkout: [6, 300], 'cpn': [10, 300], 'gcd': [10, 300], 'gc-check': [10, 300], soc: [6, 300] };
  const KEY = 'an2:rl';
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const write = o => { try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } };
  /** true = allowed; false = blocked (a message was shown) */
  function allow(kind) {
    const lim = LIMITS[kind]; if (!lim) return true;
    const [max, win] = lim; const now = Date.now(); const o = read(); const l = (o[kind] || []).filter(x => now - x < win * 1000);
    if (l.length >= max) { const wait = Math.ceil((win * 1000 - (now - l[0])) / 1000); if (window.C && C.toast) C.toast(t('sec_slow', { s: wait }), 'err'); return false; }
    l.push(now); o[kind] = l; write(o); return true;
  }
  window.SEC = { allow };

  /* ---------- clean what visitors type ---------- */
  const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
  function clean(form) {
    form.querySelectorAll('input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=password]),textarea').forEach(el => {
      const adm = !!el.closest('.adm,.dz');
      let v = String(el.value || '').replace(CTRL, '');
      if (!adm) { if (!el.maxLength || el.maxLength < 0) el.maxLength = el.tagName === 'TEXTAREA' ? 2000 : (el.type === 'email' ? 120 : 200); if (el.tagName !== 'TEXTAREA') v = v.replace(/[ \t]+/g, ' '); v = v.trim().slice(0, el.maxLength); }
      if (v !== el.value) el.value = v;
      if (el.type === 'email') el.value = el.value.toLowerCase();
    });
  }
  document.addEventListener('submit', e => {
    const f = e.target; if (!f || f.tagName !== 'FORM') return;
    clean(f);
    const kind = f.dataset.form || f.dataset.aform || (f.id === 'socDemo' ? 'soc' : '');
    if (kind && !allow(kind === 'cfg' ? '' : kind)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-act="cpn"],[data-act="gcd"],[data-act="gc-check"],[data-act="place"],[data-soc]'); if (!b) return;
    const kind = b.dataset.soc ? 'soc' : b.dataset.act === 'place' ? 'checkout' : b.dataset.act;
    if (!allow(kind)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('input', e => { const el = e.target; if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && CTRL.test(el.value)) { CTRL.lastIndex = 0; el.value = el.value.replace(CTRL, ''); } }, true);

  /* ---------- sessions expire ---------- */
  function expire() {
    try {
      const s = ST.get('session', null); if (s && (!s.at || Date.now() - s.at > 30 * 864e5)) ST.set('session', null);
      const a = ST.get('adminSession', null); if (a && (!a.at || Date.now() - a.at > 12 * 3600e3)) ST.set('adminSession', null);
    } catch (e) { }
  }
  expire(); setInterval(expire, 60e3);

  /* ---------- owner warning while a demo PIN is active ---------- */
  function pinWarn() {
    if (!document.querySelector('#app.adm') || document.querySelector('.sec-warn')) return;
    const a = ST.get('adminSession', null); if (!a || a.role !== 'owner') return;
    const staff = (ST.settings().staff && ST.settings().staff.length) ? ST.settings().staff : [{ pin: '1234' }, { pin: '0000' }];
    if (!staff.some(x => x.pin === '1234' || x.pin === '0000')) return;
    const main = document.getElementById('amain'); if (!main) return;
    const ar = ST.get('adminLang', 'ar') === 'ar';
    main.insertAdjacentHTML('afterbegin', `<div class="sec-warn">${ic('alert')}<span>${ar ? 'لسا الرمز التجريبي (1234 أو 0000) شغّال. غيّره من الإعدادات ← الفريق قبل ما تفتح المتجر للزباين.' : 'Ein Demo-PIN (1234 oder 0000) ist noch aktiv. Bitte unter Einstellungen → Team ändern, bevor der Shop live geht.'}</span><a class="btn sm" href="#/admin/einstellungen">${ar ? 'غيّر الرمز' : 'PIN ändern'}</a></div>`);
  }
  new MutationObserver(pinWarn).observe(document.body, { childList: true, subtree: true });
})();
