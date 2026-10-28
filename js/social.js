/* Sign in / create account with Google, Apple (shown on iPhone, iPad and Mac) or Facebook.
   Real sign-in works as soon as the owner enters the IDs in Admin › Settings
   (Google Client-ID, Facebook App-ID, Apple Services-ID). Without IDs the buttons run a clearly
   marked demo, because a static demo site has no server to confirm the login. */
(function () {
  'use strict';
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };
  K('so_google', 'Weiter mit Google', 'Continue with Google', 'المتابعة باستخدام Google');
  K('so_apple', 'Weiter mit Apple', 'Continue with Apple', 'المتابعة باستخدام Apple');
  K('so_fb', 'Weiter mit Facebook', 'Continue with Facebook', 'المتابعة باستخدام Facebook');
  K('so_or', 'oder mit E-Mail', 'or with email', 'أو بالبريد الإلكتروني');
  K('so_demo_h', 'Anmelden mit {p}', 'Sign in with {p}', 'تسجيل الدخول باستخدام {p}');
  K('so_demo_p', 'Demo-Version: Im fertigen Shop öffnet sich hier das echte {p}-Fenster. Für die Demo gib einfach Name und E-Mail ein.', 'Demo version: in the live shop the real {p} window opens here. For the demo just enter a name and email.', 'نسخة تجريبية: في المتجر النهائي تُفتح هنا نافذة {p} الحقيقية. للتجربة أدخل الاسم والبريد الإلكتروني فقط.');
  K('so_go', 'Anmelden', 'Sign in', 'تسجيل الدخول');
  K('so_ok', 'Angemeldet mit {p}', 'Signed in with {p}', 'تم تسجيل الدخول باستخدام {p}');
  K('so_err', 'Anmeldung mit {p} hat nicht geklappt. Bitte erneut versuchen.', 'Sign-in with {p} did not work. Please try again.', 'لم ينجح تسجيل الدخول باستخدام {p}. حاول مرة أخرى.');

  const isApple = () => /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const cfg = () => (ST.settings().social || {});
  const LOGO = {
    google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.9a4.8 4.8 0 0 0-4.1 2.5c-1.8 3-.5 7.6 1.2 10 .8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.6-4zM14 5.3a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1 0 2.2-.6 2.9-1.4z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>'
  };
  const NAME = { google: 'Google', apple: 'Apple', fb: 'Facebook' };

  function block() {
    const ps = ['google'].concat(isApple() ? ['apple'] : []).concat(['fb']);
    return `<div class="soc-login">${ps.map(p => `<button type="button" class="soc-btn soc-${p}" data-soc="${p}">${LOGO[p]}<span>${t(p === 'fb' ? 'so_fb' : 'so_' + p)}</span></button>`).join('')}<p class="soc-or"><span>${t('so_or')}</span></p></div>`;
  }
  function inject() {
    const box = document.querySelector('.auth-box'); if (!box || box.querySelector('.soc-login')) return;
    const form = box.querySelector('form.authf'); if (!form) return;
    form.insertAdjacentHTML('beforebegin', block());
  }
  new MutationObserver(() => { if (document.querySelector('.auth-box form.authf') && !document.querySelector('.soc-login')) inject(); }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

  /* log the customer in (or create the account) after the provider confirmed name + email */
  function finish(provider, name, email) {
    email = String(email || '').trim().toLowerCase(); if (!email) { C.toast(t('so_err', { p: NAME[provider] }), 'err'); return; }
    const list = ST.customers(); let c = list.find(x => x.email === email);
    if (!c) { c = { id: ST.uid('c'), created: Date.now(), addresses: [], wishlist: [], designs: [], email, name: name || email.split('@')[0], phone: '', marketing: false }; list.push(c); ST.log('kunde', `Konto erstellt (${NAME[provider]}): ${email}`); }
    c.providers = Array.from(new Set((c.providers || []).concat(provider)));
    if (!c.name && name) c.name = name;
    ST.saveCustomers(list); ST.set('session', { id: c.id, at: Date.now(), via: provider });
    C.closeAll(); if (SHOP.refreshHeader) SHOP.refreshHeader();
    C.toast(t('so_ok', { p: NAME[provider] }));
    const nx = document.querySelector('form.authf[data-next]'); const next = nx && nx.dataset.next;
    C.go(next ? '#' + next.replace(/^#/, '') : '#/konto');
  }
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const jwt = tok => { try { return JSON.parse(decodeURIComponent(escape(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return {}; } };

  async function real(p) {
    const s = cfg();
    if (p === 'google' && s.googleId) {
      await loadScript('https://accounts.google.com/gsi/client');
      return new Promise((res, rej) => {
        const cl = google.accounts.oauth2.initTokenClient({ client_id: s.googleId, scope: 'openid email profile', callback: async r => { if (!r || !r.access_token) return rej(); try { const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + r.access_token } })).json(); finish('google', u.name, u.email); res(); } catch (e) { rej(e); } } });
        cl.requestAccessToken();
      });
    }
    if (p === 'fb' && s.facebookId) {
      await loadScript('https://connect.facebook.net/de_DE/sdk.js');
      FB.init({ appId: s.facebookId, version: 'v19.0', cookie: false, xfbml: false });
      return new Promise((res, rej) => FB.login(r => { if (!r.authResponse) return rej(); FB.api('/me', { fields: 'name,email' }, u => { finish('fb', u.name, u.email); res(); }); }, { scope: 'email' }));
    }
    if (p === 'apple' && s.appleId) {
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/de_DE/appleid.auth.js');
      AppleID.auth.init({ clientId: s.appleId, scope: 'name email', redirectURI: location.origin + location.pathname, usePopup: true });
      const r = await AppleID.auth.signIn(); const u = jwt(r.authorization.id_token); const n = r.user && r.user.name ? (r.user.name.firstName + ' ' + r.user.name.lastName).trim() : '';
      finish('apple', n, u.email); return;
    }
    return 'demo';
  }
  function demo(p) {
    const ov = C.sheet({ title: t('so_demo_h', { p: NAME[p] }), kind: 'modal' });
    ov.body.innerHTML = `<div class="soc-demo"><span class="soc-demo-i soc-${p}">${LOGO[p]}</span><p class="muted">${esc(t('so_demo_p', { p: NAME[p] }))}</p>
      <form id="socDemo" novalidate><label class="fld"><span>${t('full_name')}</span><input class="in" name="name" autocomplete="name" required></label><label class="fld"><span>${t('email')}</span><input class="in" name="email" type="email" autocomplete="email" required></label></form></div>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">${t('cancel')}</button><button class="btn" form="socDemo" type="submit">${t('so_go')}</button>`;
    const f = ov.querySelector('#socDemo');
    f.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); const n = f.name.value.trim(), m = f.email.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { f.email.closest('.fld').classList.add('bad'); f.email.focus(); return; } finish(p, n, m); }, true);
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-soc]'); if (!b) return; e.preventDefault();
    const p = b.dataset.soc; b.disabled = true;
    try { const r = await real(p); if (r === 'demo') demo(p); }
    catch (er) { C.toast(t('so_err', { p: NAME[p] }), 'err'); }
    finally { b.disabled = false; }
  });

  /* admin: fields for the IDs in Settings */
  if (window.ADMIN && ADMIN.settings) {
    const _s = ADMIN.settings; ADMIN.settings = function () {
      _s.apply(this, arguments);
      const sec = document.querySelectorAll('.settings .a-card')[2] || document.querySelector('.settings .a-card'); if (!sec || sec.querySelector('[name="social.googleId"]')) return;
      const s = cfg(); const ar = ST.get('adminLang', 'ar') === 'ar';
      sec.insertAdjacentHTML('beforeend', `<h3 class="sub" style="margin-top:18px">${ar ? 'تسجيل الدخول بحسابات Google وApple وFacebook' : 'Anmelden mit Google, Apple und Facebook'}</h3>
        <p class="hint">${ar ? 'لما تحط الأرقام هون، الزبون بيقدر يسجّل دخول بحسابه الحقيقي. بدونها الأزرار بتشتغل كتجربة.' : 'Sobald die IDs eingetragen sind, melden sich Kunden mit ihrem echten Konto an. Ohne IDs laufen die Knöpfe als Demo.'}</p>
        <div class="grid3"><label class="fld"><span>Google Client-ID</span><input class="in no-tr" dir="ltr" name="social.googleId" value="${esc(s.googleId || '')}" placeholder="…apps.googleusercontent.com"></label>
        <label class="fld"><span>Facebook App-ID</span><input class="in no-tr" dir="ltr" name="social.facebookId" value="${esc(s.facebookId || '')}"></label>
        <label class="fld"><span>Apple Services-ID</span><input class="in no-tr" dir="ltr" name="social.appleId" value="${esc(s.appleId || '')}" placeholder="com.neuetalia.web"></label></div>`);
    };
  }
})();
