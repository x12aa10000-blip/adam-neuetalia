/* QA round: page titles per page and language (SEO + browser tabs). */
(function () {
  'use strict';
  const BRAND = 'Adam';
  const DESC = { de: 'Personalisierte Geschenke und Blumen vom Steindamm in Hamburg – mit Live-Vorschau auf dem echten Produkt.', en: 'Personalised gifts and flowers from Steindamm in Hamburg – with a live preview on the real product.', ar: 'هدايا وورود مخصصة من شتايندام في هامبورغ – مع معاينة مباشرة على المنتج الحقيقي.' };
  function setTitle() {
    if (C.path().startsWith('/admin')) { document.title = 'Verwaltung · ' + BRAND; return; }
    const h = document.querySelector('#app main h1, #app h1');
    const txt = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    document.title = txt && C.path() !== '/' && C.path() !== '' ? txt.slice(0, 60) + ' · ' + BRAND : BRAND + (C.lang() === 'ar' ? ' · هدايا مخصصة في هامبورغ' : C.lang() === 'en' ? ' · Personalised gifts in Hamburg' : ' · Personalisierte Geschenke in Hamburg');
    const m = document.querySelector('meta[name=description]'); if (m) m.setAttribute('content', DESC[C.lang()] || DESC.de);
  }
  let tm = 0; const later = () => { clearTimeout(tm); tm = setTimeout(setTitle, 250); };
  window.addEventListener('hashchange', later);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-lang]')) later(); });
  window.addEventListener('load', later); later();
})();
