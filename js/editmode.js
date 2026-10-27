/* Edit mode: when the owner is logged in to the admin, the shop shows a pencil button.
   In edit mode the owner can click ANY text to change it (per language), ANY picture to replace it,
   or hide any part. Changes are stored as "original → new" and applied on every page. */
(function () {
  'use strict';
  const EM = {};
  window.EDITMODE = EM;
  const KEY = 'siteEdits';
  const get = () => { const e = ST.get(KEY, null) || {}; e.t = e.t || {}; e.img = e.img || {}; e.hide = e.hide || {}; return e; };
  const save = e => ST.set(KEY, JSON.parse(JSON.stringify(e)));
  const lang = () => C.lang();
  const W = (de, ar) => lang() === 'ar' ? ar : de;
  const isAdmin = () => !!ST.get('adminSession', null);
  const on = () => isAdmin() && !!ST.get('editMode', false);
  const shopView = () => { const a = $('#app'); return a && !a.classList.contains('adm'); };
  const SKIP = 'script,style,textarea,input,select,option,.em-bar,.em-ui,.ov.em-dlg';

  /* ---------------- apply saved changes ---------------- */
  let busy = false;
  function apply(root) {
    if (!shopView()) return;
    const e = get(); const T = e.t[lang()] || {}; const H = new Set(e.hide[lang()] || []);
    const tw = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; return !p || p.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    const list = []; while (tw.nextNode()) list.push(tw.currentNode);
    for (const n of list) {
      if (n._em === n.nodeValue) continue;
      const orig = n._orig != null && n._em === n.nodeValue ? n._orig : n.nodeValue.trim();
      if (!orig) continue;
      n._orig = orig;
      if (T[orig] != null) { const v = n.nodeValue.replace(n.nodeValue.trim() || orig, T[orig]); if (v !== n.nodeValue) n.nodeValue = v; }
      n._em = n.nodeValue;
      const el = n.parentElement;
      if (el) el.classList.toggle('em-hidden', H.has(orig));
    }
    const r = root && root.querySelectorAll ? root : document;
    r.querySelectorAll('img').forEach(im => {
      const o = im.dataset.emo || im.getAttribute('src'); if (!o || o.startsWith('data:image/gif')) return;
      const nw = e.img[o];
      if (nw) { if (!im.dataset.emo) im.dataset.emo = o; if (im.dataset.emset !== nw) { im.dataset.emset = nw; if (nw.startsWith('idb:')) ST.photoUrl(nw).then(u => { if (u) im.src = u; }); else im.src = nw; } }
    });
    r.querySelectorAll('[placeholder]').forEach(el => { const o = el.dataset.emph || el.getAttribute('placeholder'); if (T[o] != null) { el.dataset.emph = o; el.setAttribute('placeholder', T[o]); } });
  }
  const obs = new MutationObserver(() => { if (busy) return; busy = true; try { apply(document.body); bar(); } finally { obs.takeRecords(); busy = false; } });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ---------------- floating bar ---------------- */
  function bar() {
    const show = isAdmin() && shopView();
    let b = $('.em-bar');
    if (!show) { if (b) b.remove(); document.body.classList.remove('em-on'); return; }
    document.body.classList.toggle('em-on', on());
    if (!b) { b = document.createElement('div'); b.className = 'em-bar'; document.body.appendChild(b); }
    const html = on()
      ? `<span>${ic('edit')} ${W('Bearbeiten: Text oder Bild antippen', 'وضع التعديل: اكبس على أي نص أو صورة')}</span><button type="button" data-em="list">${W('Alle Änderungen', 'كل التعديلات')}</button><button type="button" data-em="off" class="em-done">${ic('check')} ${W('Fertig', 'خلصت')}</button>`
      : `<button type="button" data-em="on" class="em-start">${ic('edit')} ${W('Website bearbeiten', 'عدّل الموقع')}</button>`;
    if (b._h !== html + lang()) { b.innerHTML = html; b._h = html + lang(); }
  }

  /* ---------------- clicking in edit mode ---------------- */
  function textNodeAt(x, y, target) {
    let n = null;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); n = r && r.startContainer; }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); n = p && p.offsetNode; }
    if (n && n.nodeType === 3 && n.nodeValue.trim() && target.contains(n)) return n;
    const tw = document.createTreeWalker(target, NodeFilter.SHOW_TEXT); while (tw.nextNode()) if (tw.currentNode.nodeValue.trim() && !tw.currentNode.parentElement.closest(SKIP)) return tw.currentNode;
    return null;
  }
  document.addEventListener('click', ev => {
    const c = ev.target.closest('[data-em]');
    if (c && c.closest('.em-bar')) { ev.preventDefault(); ev.stopPropagation(); const k = c.dataset.em; if (k === 'on') { ST.set('editMode', true); C.toast(W('Tippe auf einen Text oder ein Bild', 'اكبس على أي نص أو صورة لتعدلها')); } if (k === 'off') ST.set('editMode', false); if (k === 'list') EM.list(); bar(); return; }
    if (!on() || !shopView()) return;
    if (ev.target.closest('.em-bar,.ov,.cookie,#toast')) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    const img = ev.target.closest('img') || (ev.target.querySelector && ev.target.tagName !== 'BODY' && ev.target.children.length === 1 && ev.target.querySelector(':scope > img'));
    if (img) return EM.editImg(img);
    const n = textNodeAt(ev.clientX, ev.clientY, ev.target);
    if (n) return EM.editText(n);
    const ph = ev.target.closest('[placeholder]'); if (ph) return EM.editPh(ph);
    C.toast(W('Hier gibt es keinen Text. Tippe direkt auf das Wort.', 'هون ما في نص. اكبس على الكلمة نفسها.'));
  }, true);
  // links and forms must not react while editing
  ['submit', 'input', 'change'].forEach(t => document.addEventListener(t, ev => { if (on() && shopView() && !ev.target.closest('.ov,.em-bar')) { if (t === 'submit') ev.preventDefault(); ev.stopImmediatePropagation(); } }, true));

  function dlg(title) { const ov = C.sheet({ title, kind: 'modal' }); ov.classList.add('em-dlg'); return ov; }
  EM.editText = function (n) {
    const orig = n._orig != null ? n._orig : n.nodeValue.trim();
    const e = get(); const T = e.t[lang()] = e.t[lang()] || {}; const cur = T[orig] != null ? T[orig] : orig;
    const hidden = (e.hide[lang()] || []).includes(orig);
    const ov = dlg(W('Text ändern', 'تعديل النص'));
    ov.body.innerHTML = `<p class="hint">${W('Gilt für die Sprache', 'التعديل للغة')} <b>${lang().toUpperCase()}</b>. ${W('Der gleiche Text wird überall im Shop geändert.', 'نفس النص بيتغير بكل مكان بالمتجر.')}</p>
      <label class="fld"><span>${W('Neuer Text', 'النص الجديد')}</span><textarea class="in" rows="4" id="emTx" dir="auto">${esc(cur)}</textarea></label>
      ${T[orig] != null ? `<p class="hint">${W('Original', 'الأصلي')}: ${esc(orig)}</p>` : ''}`;
    ov.foot.innerHTML = `<button class="btn ghost danger" data-r="hide">${ic('eye')} ${hidden ? W('Wieder zeigen', 'رجّع أظهره') : W('Ausblenden', 'إخفاء')}</button>${T[orig] != null ? `<button class="btn ghost" data-r="reset">${ic('rotateL')} ${W('Original', 'رجّع الأصلي')}</button>` : ''}<button class="btn" data-r="save">${ic('check')} ${W('Speichern', 'حفظ')}</button>`;
    setTimeout(() => { const t = $('#emTx', ov); t.focus(); t.select(); }, 60);
    ov.addEventListener('click', ev => {
      const b = ev.target.closest('[data-r]'); if (!b) return;
      const e2 = get(); const T2 = e2.t[lang()] = e2.t[lang()] || {}; const Hl = e2.hide[lang()] = e2.hide[lang()] || [];
      if (b.dataset.r === 'save') { const v = $('#emTx', ov).value; if (v.trim() && v !== orig) T2[orig] = v; else delete T2[orig]; }
      if (b.dataset.r === 'reset') delete T2[orig];
      if (b.dataset.r === 'hide') { const i = Hl.indexOf(orig); if (i >= 0) Hl.splice(i, 1); else Hl.push(orig); }
      save(e2); C.closeAll(); refresh(); C.toast(W('Gespeichert ✓', 'تم الحفظ ✓'));
    });
  };
  EM.editPh = function (el) {
    const orig = el.dataset.emph || el.getAttribute('placeholder');
    const ov = dlg(W('Platzhalter ändern', 'تعديل النص داخل الخانة'));
    ov.body.innerHTML = `<label class="fld"><span>${W('Neuer Text', 'النص الجديد')}</span><input class="in" id="emTx" dir="auto" value="${esc(el.getAttribute('placeholder'))}"></label>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-r="reset">${W('Original', 'رجّع الأصلي')}</button><button class="btn" data-r="save">${W('Speichern', 'حفظ')}</button>`;
    ov.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (!b) return; const e = get(); const T = e.t[lang()] = e.t[lang()] || {}; const v = $('#emTx', ov).value; if (b.dataset.r === 'save' && v.trim() && v !== orig) T[orig] = v; else delete T[orig]; save(e); C.closeAll(); el.setAttribute('placeholder', T[orig] || orig); refresh(); });
  };
  EM.editImg = function (im) {
    const orig = im.dataset.emo || im.getAttribute('src'); const e = get();
    const ov = dlg(W('Bild ändern', 'تغيير الصورة'));
    ov.body.innerHTML = `<div class="em-imgpv"><img src="${esc(im.currentSrc || im.src)}" alt=""></div><p class="hint">${W('Das neue Bild erscheint überall, wo dieses Bild benutzt wird.', 'الصورة الجديدة بتظهر بكل مكان مستعملة فيه هالصورة.')}</p>`;
    ov.foot.innerHTML = `${e.img[orig] ? `<button class="btn ghost" data-r="reset">${ic('rotateL')} ${W('Original', 'رجّع الأصلي')}</button>` : ''}<label class="btn up-btn">${ic('upload')} ${W('Neues Bild wählen', 'اختار صورة جديدة')}<input type="file" accept="image/*" id="emFile"></label>`;
    ov.addEventListener('click', ev => { const b = ev.target.closest('[data-r=reset]'); if (!b) return; const e2 = get(); delete e2.img[orig]; save(e2); C.closeAll(); location.reload(); });
    $('#emFile', ov).addEventListener('change', async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      C.toast(W('Bild wird geladen …', 'عم تنحمل الصورة …'));
      try { const png = /png|webp|svg/.test(f.type); const r = await ST.readImage(f, 1600, png); const id = await ST.photoPut(r.blob); const e2 = get(); e2.img[orig] = id; save(e2); C.closeAll(); refresh(); C.toast(W('Gespeichert ✓', 'تم الحفظ ✓')); }
      catch (er) { C.toast(W('Bild konnte nicht geladen werden', 'ما قدرنا نحمل الصورة'), 'err'); }
    });
  };
  EM.list = function () {
    const e = get(); const T = e.t[lang()] || {}; const H = e.hide[lang()] || [];
    const ov = dlg(W('Alle Änderungen', 'كل التعديلات'));
    const rows = Object.entries(T).map(([o, v]) => `<li><span><s>${esc(o.slice(0, 80))}</s><br><b>${esc(v.slice(0, 120))}</b></span><button class="ibtn" data-x="t" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('')
      + H.map(o => `<li><span>${W('Ausgeblendet', 'مخفي')}: <b>${esc(o.slice(0, 80))}</b></span><button class="ibtn" data-x="h" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('')
      + Object.keys(e.img).map(o => `<li><span>${W('Bild', 'صورة')}: ${esc(o.split('/').pop())}</span><button class="ibtn" data-x="i" data-k="${esc(o)}" aria-label="x">${ic('trash')}</button></li>`).join('');
    ov.body.innerHTML = rows ? `<p class="hint">${W('Sprache', 'اللغة')}: ${lang().toUpperCase()}</p><ul class="em-list">${rows}</ul>` : `<p class="muted">${W('Noch keine Änderungen.', 'لسا ما في تعديلات.')}</p>`;
    ov.foot.innerHTML = `<button class="btn" data-act="close">${W('Schließen', 'إغلاق')}</button>`;
    ov.addEventListener('click', ev => { const b = ev.target.closest('[data-x]'); if (!b) return; const e2 = get(); const k = b.dataset.k; if (b.dataset.x === 't') delete (e2.t[lang()] || {})[k]; if (b.dataset.x === 'h') e2.hide[lang()] = (e2.hide[lang()] || []).filter(x => x !== k); if (b.dataset.x === 'i') delete e2.img[k]; save(e2); location.reload(); });
  };
  function refresh() { const y = scrollY; $$('.em-hidden').forEach(x => x.classList.remove('em-hidden')); C.dispatch({ keepScroll: true }); setTimeout(() => { apply(document.body); scrollTo(0, y); }, 30); }
  EM.apply = apply;
  window.addEventListener('hashchange', bar);
  setTimeout(() => { apply(document.body); bar(); }, 0);
})();
