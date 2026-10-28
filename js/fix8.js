/* Round 8 fixes: box builder mobile mini bar, drag-to-scroll strips on desktop, editor navigation helpers. */
(function () {
  'use strict';
  const mq = matchMedia('(max-width:960px)');

  /* ---------- box builder: on phones the big preview stays at the top (not following you);
     once it scrolls away, a slim bar with a small live preview, count and price appears ---------- */
  let bxObs = null;
  function bxMini() {
    const side = $('.bx-side'), stage = $('.bx-stage'); let bar = $('.bx-mini');
    if (!side || !stage || !mq.matches) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('button'); bar.type = 'button'; bar.className = 'bx-mini'; bar.setAttribute('aria-label', t('live_preview'));
      bar.innerHTML = '<canvas width="120" height="90"></canvas><span class="bx-mini-t"></span><b></b><i>' + ic('eye') + '</i>';
      bar.addEventListener('click', () => { const s = $('.bx-stage'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      document.body.appendChild(bar);
    }
    const sum = $('.bx-sum'); if (sum) { const sp = sum.querySelector('span'), b = sum.querySelector('b'); $('.bx-mini-t', bar).textContent = sp ? sp.textContent : ''; $('b', bar).textContent = b ? b.textContent : ''; }
    const src = $('#bxCv'), dst = $('canvas', bar);
    if (src && src.width) { const x = dst.getContext('2d'); x.clearRect(0, 0, 120, 90); const r = Math.min(120 / src.width, 90 / src.height); x.drawImage(src, (120 - src.width * r) / 2, (90 - src.height * r) / 2, src.width * r, src.height * r); }
    if (bxObs) bxObs.disconnect();
    bxObs = new IntersectionObserver(es => { const b = $('.bx-mini'); if (b) b.classList.toggle('on', !es[0].isIntersecting && C.path().startsWith('/box')); }, { threshold: 0.05 });
    bxObs.observe(stage);
  }
  if (window.BOX) {
    const _d = BOX.drawAll; BOX.drawAll = async function () { const r = await _d.apply(this, arguments); try { bxMini(); } catch (e) { } return r; };
  }
  window.addEventListener('hashchange', () => { if (!C.path().startsWith('/box')) { const b = $('.bx-mini'); if (b) b.remove(); } });

  /* ---------- every horizontal strip can be dragged with the mouse on a computer, plus arrow buttons ---------- */
  const STRIP = '.prail,.qk-row,.rail,.chips,.thumbs,.carou-track,.dates,.dz-views';
  const isStrip = el => el && el.scrollWidth > el.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(el).overflowX);
  let dr = null;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || document.body.classList.contains('em-on')) return;
    const s = e.target.closest(STRIP); if (!s || !isStrip(s) || e.target.closest('input,select,textarea')) return;
    dr = { s, x: e.clientX, sl: s.scrollLeft, moved: false };
  });
  document.addEventListener('pointermove', e => {
    if (!dr) return; const dx = e.clientX - dr.x;
    if (!dr.moved && Math.abs(dx) < 6) return;
    if (!dr.moved) { dr.moved = true; dr.s.classList.add('dragging'); }
    dr.s.scrollLeft = dr.sl - dx; e.preventDefault();
  });
  document.addEventListener('pointerup', () => { if (!dr) return; const d = dr; dr = null; d.s.classList.remove('dragging'); if (d.moved) { const stop = ev => { ev.preventDefault(); ev.stopPropagation(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, true), 50); } });
  document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest(STRIP)) e.preventDefault(); });

  /* arrows on strips that have none yet (desktop only) */
  function arrows(root) {
    if (matchMedia('(pointer:coarse)').matches) return;
    (root || document).querySelectorAll(STRIP).forEach(s => {
      if (s.dataset.arw || s.matches('.thumbs,.dates,.dz-views,.chips,.qk-row') || s.closest('.ov,.adm') || s.parentElement.querySelector(':scope > .strip-nav')) return;
      if (s.closest('.rail-w')) return; // already has its own arrows
      if (!isStrip(s)) return;
      s.dataset.arw = '1';
      const wrap = s.parentElement; if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      const nav = document.createElement('div'); nav.className = 'strip-nav';
      nav.innerHTML = `<button type="button" class="sn-p" aria-label="${esc(t('h_prev'))}">${ic('chev')}</button><button type="button" class="sn-n" aria-label="${esc(t('h_next'))}">${ic('chev')}</button>`;
      s.insertAdjacentElement('afterend', nav);
      const rtl = () => getComputedStyle(s).direction === 'rtl';
      const upd = () => { const max = s.scrollWidth - s.clientWidth; const pos = Math.abs(s.scrollLeft); nav.querySelector('.sn-p').disabled = pos < 4; nav.querySelector('.sn-n').disabled = pos > max - 4; nav.hidden = max < 4; };
      nav.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; const dir = b.classList.contains('sn-n') ? 1 : -1; s.scrollBy({ left: dir * (rtl() ? -1 : 1) * s.clientWidth * 0.8, behavior: 'smooth' }); });
      s.addEventListener('scroll', upd, { passive: true }); upd();
    });
  }
  const ao = new MutationObserver(() => { clearTimeout(ao.t); ao.t = setTimeout(() => arrows(), 120); });
  ao.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  window.addEventListener('resize', () => { clearTimeout(ao.t); ao.t = setTimeout(() => arrows(), 200); });
  setTimeout(() => arrows(), 300);
})();
/* header height → CSS variable, so sticky columns never slide under the header */
(function () {
  const set = () => { const h = document.querySelector('.hd'); if (h) document.documentElement.style.setProperty('--hdh', Math.round(h.getBoundingClientRect().height) + 'px'); };
  const ro = new ResizeObserver(set); const watch = () => { const h = document.querySelector('.hd'); if (h && !h._ro) { h._ro = 1; ro.observe(h); set(); } };
  new MutationObserver(watch).observe(document.body, { childList: true, subtree: true }); watch();
})();
/* font sample buttons: shrink the sample text until it fits the button */
(function () {
  const fit = () => document.querySelectorAll('.fonts button').forEach(b => {
    if (!b.clientWidth) return; b.style.fontSize = ''; let fs = parseFloat(getComputedStyle(b).fontSize), n = 0;
    while (b.scrollWidth > b.clientWidth + 1 && fs > 11 && n++ < 14) { fs -= 1; b.style.fontSize = fs + 'px'; }
  });
  let tm; const mo = new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(fit, 80); });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(fit, 120); });
  if (document.fonts) document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => { clearTimeout(tm); tm = setTimeout(fit, 50); });
})();
/* textareas marked .autogrow grow with their text, so long texts are always fully visible */
(function () {
  const grow = el => { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; };
  document.addEventListener('input', e => { if (e.target.matches && e.target.matches('textarea.autogrow, .a-card textarea, .ws-body textarea')) grow(e.target); });
  new MutationObserver(() => document.querySelectorAll('textarea.autogrow:not([data-g])').forEach(t => { t.dataset.g = 1; requestAnimationFrame(() => grow(t)); })).observe(document.body, { childList: true, subtree: true });
})();
/* landscape product photos (e.g. new products from the admin) are shown whole in the square cards */
document.addEventListener('load', e => { const im = e.target; if (im && im.tagName === 'IMG' && im.closest && im.closest('.pimg') && im.naturalWidth / Math.max(1, im.naturalHeight) > 1.15) im.classList.add('wide'); }, true);
