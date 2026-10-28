/* Owner tool: create a product or edit any product's personalisation.
   On the product photo the owner places text fields and photo fields (move, resize, rotate),
   and decides for every text field which fonts and colours the customer may choose. */
(function () {
  'use strict';
  const Z = {};
  window.DESIGNER = Z;
  const A = () => window.ADMIN;
  const T = (k, v) => t(k, v, 'de');
  const AL = () => (ST.get('adminLang', 'ar') === 'ar' ? 'ar' : 'de'); // admin language (Arabic by default)
  const clone = o => JSON.parse(JSON.stringify(o));
  const L3 = (de, en, ar) => ({ de, en: en || de, ar: ar || de });

  /* colour presets the owner can allow (print / engraving colours + real foils) */
  const COLORS = [
    { id: 'black', hex: '#222222', l: L3('Schwarz', 'Black', 'أسود') }, { id: 'white', hex: '#ffffff', l: L3('Weiß', 'White', 'أبيض') },
    { id: 'gold', hex: '#c9a24a', l: L3('Gold', 'Gold', 'ذهبي') }, { id: 'silver', hex: '#b8bec4', l: L3('Silber', 'Silver', 'فضي') },
    { id: 'rosegold', hex: '#d8a08c', l: L3('Roségold', 'Rose gold', 'ذهبي وردي') }, { id: 'red', hex: '#c0122f', l: L3('Rot', 'Red', 'أحمر') },
    { id: 'pink', hex: '#e0569a', l: L3('Pink', 'Pink', 'زهري') }, { id: 'rosa', hex: '#f4a6c6', l: L3('Rosa', 'Light pink', 'وردي فاتح') },
    { id: 'purple', hex: '#6425fe', l: L3('Lila', 'Purple', 'بنفسجي') }, { id: 'navy', hex: '#1f3264', l: L3('Navy', 'Navy', 'كحلي') },
    { id: 'blue', hex: '#2c7be5', l: L3('Blau', 'Blue', 'أزرق') }, { id: 'turq', hex: '#01cac9', l: L3('Türkis', 'Turquoise', 'فيروزي') },
    { id: 'green', hex: '#2f7d4f', l: L3('Grün', 'Green', 'أخضر') }, { id: 'brown', hex: '#6b4226', l: L3('Braun', 'Brown', 'بني') },
    { id: 'grey', hex: '#777777', l: L3('Grau', 'Grey', 'رمادي') }, { id: 'yellow', hex: '#f5c400', l: L3('Gelb', 'Yellow', 'أصفر') },
    { id: 'foil-gold', hex: '#d4af37', foil: 'gold', fx: 'foil', l: L3('Goldfolie', 'Gold foil', 'ورق ذهب') },
    { id: 'foil-silver', hex: '#c9ced3', foil: 'silver', fx: 'foil', l: L3('Silberfolie', 'Silver foil', 'ورق فضة') },
    { id: 'foil-rose', hex: '#d8a08c', foil: 'rose', fx: 'foil', l: L3('Roségoldfolie', 'Rose gold foil', 'ورق ذهبي وردي') }
  ];
  const TECH = [['print', 'Druck'], ['engrave', 'Lasergravur'], ['foil', 'Goldfolie / Prägung'], ['emb', 'Stickerei'], ['glow', 'Leuchtend (LED)'], ['raised', 'Erhaben / 3D-Schrift'], ['gold3d', 'Gold 3D']];
  const SHAPES = [['rect', 'Rechteck'], ['round', 'Abgerundet'], ['circle', 'Kreis'], ['ellipse', 'Oval'], ['heart', 'Herz'], ['poly', 'Eigene Form (Punkte)']];
  const r3 = v => Math.round(v * 1000) / 1000;
  const POLY = {
    rect: () => { const o = []; for (let i = 0; i < 4; i++) o.push([i / 4, 0]); for (let i = 0; i < 4; i++) o.push([1, i / 4]); for (let i = 0; i < 4; i++) o.push([1 - i / 4, 1]); for (let i = 0; i < 4; i++) o.push([0, 1 - i / 4]); return o; },
    circle: () => Array.from({ length: 20 }, (_, i) => { const a = i / 20 * Math.PI * 2 - Math.PI / 2; return [r3(.5 + .5 * Math.cos(a)), r3(.5 + .5 * Math.sin(a))]; }),
    heart: () => Array.from({ length: 24 }, (_, i) => { const t = i / 24 * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); return [r3(.5 + x / 34), r3((y + 17) / 30)]; }),
    star: () => Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? .21 : .5; return [r3(.5 + rr * Math.cos(a)), r3(.52 + rr * Math.sin(a))]; }),
    hexagon: () => Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return [r3(.5 + .5 * Math.cos(a)), r3(.5 + .5 * Math.sin(a))]; })
  };
  let pSel = -1;
  const PHFX = [['none', 'Original'], ['bw', 'Schwarz-Weiß'], ['sepia', 'Sepia'], ['engrave', 'Gravur-Look']];
  const LABELS = [['f_name', 'Name'], ['f_text', 'Text'], ['f_name1', 'Name 1'], ['f_name2', 'Name 2'], ['f_date', 'Datum'], ['f_title', 'Titel'], ['f_quote', 'Spruch'], ['f_initials', 'Initialen'], ['f_photo', 'Foto'], ['f_photo1', 'Foto 1'], ['f_photo2', 'Foto 2']];
  const KIND_L = { script: 'Schreibschrift', hand: 'Handschrift', serif: 'Klassisch', sans: 'Modern', slab: 'Slab', arabic: 'Arabisch' };
  const DEF_FONTS = ['greatvibes', 'playfair', 'montserrat', 'ruqaa'];
  const DEF_COLORS = () => ['black', 'white', 'gold'].map(id => clone(COLORS.find(c => c.id === id)));

  let P = null, isNew = false, vi = 0, sel = -1, orig = null, dirty = false;
  const V = () => P.views[vi];
  const field = id => (P.fields || []).find(f => f.id === id);
  const sfOf = z => z.sf || z.f || ((/\{(\w+)/.exec(z.tpl || '') || [])[1]) || null;
  const newId = (pre) => { let i = 1; while (field(pre + i)) i++; return pre + i; };

  /* ---------------- open ---------------- */
  Z.show = function (id) {
    if (!id || id === 'neu') {
      isNew = true;
      P = { id: 'eigen-' + ST.uid(''), cat: 'gravur', occ: ['geburtstag', 'liebe'], price: 29.9, prod: 2, tax: 19, stock: 25, active: true,
        name: L3('', '', ''), desc: L3('', '', ''), mat: L3('', '', ''), size: L3('', '', ''), fields: [], views: [] };
    } else {
      const p = ST.product(id); if (!p || p.virtual) return C.go('#/admin/produkte');
      isNew = false; P = clone(p);
    }
    orig = JSON.stringify(P); vi = 0; sel = -1; dirty = false;
    Z.render();
  };
  Z.render = function () {
    const title = isNew ? 'Neues Produkt' : esc(L(P.name, AL()));
    A().shell('produkte', `<a class="link back" href="#/admin/produkte${isNew ? '' : '/' + esc(P.id)}">${ic('back')} ${isNew ? 'Produkte' : 'Zurück zum Produkt'}</a>
      <div class="a-head"><h1>${ic('wand')} ${title}</h1><div class="vbtns">${!isNew && !P.custom ? `<button class="btn ghost sm" data-dz="reset">${ic('rotateL')} Original wiederherstellen</button>` : ''}${!isNew ? `<a class="btn ghost sm" href="#/p/${esc(P.id)}?preview=1" target="_blank" rel="noopener">${ic('eye')} Im Shop testen</a>` : ''}<button class="btn sm" data-dz="save">${ic('check')} Speichern</button></div></div>
      <p class="muted small" style="margin:-8px 0 16px">Lege auf dem Produktfoto fest, wo Kunden <b>Text</b> schreiben oder ein <b>Foto</b> einsetzen können. Felder verschieben, an einer Seite oder Ecke ziehen (nur diese Seite bewegt sich), oben drehen. Rechts bestimmst du Schriften, Farben und Technik.</p>
      <div class="dz">
        <div class="dz-l">
          ${P.views.length ? `<div class="dz-views">${P.views.map((v, i) => `<button class="dz-vt" data-dz="view" data-i="${i}" aria-pressed="${i === vi}"><img src="${esc(v.thumb || v.img)}" alt=""><span>${i + 1}${v.zones.length ? ' · ' + v.zones.length + ' Felder' : ' · Beispiel'}</span></button>`).join('')}<label class="dz-vt add">${ic('plus')}<span>Foto hinzufügen</span><input type="file" accept="image/*" data-dzfile="add"></label></div>` : ''}
          <div class="dz-stage" id="dzStage">${P.views.length ? `<canvas id="dzCv"></canvas><div class="dz-ov" id="dzOv"></div>` : `<label class="drop dz-first">${ic('camera')}<b>Produktfoto hochladen</b><small>Am besten ein klares Foto ohne Text, gern quadratisch</small><input type="file" accept="image/*" data-dzfile="first"></label>`}</div>
          ${P.views.length ? `<div class="dz-tools"><button class="btn sm" data-dz="addtext">${ic('text')} Textfeld hinzufügen</button><button class="btn teal sm" data-dz="addphoto">${ic('image')} Fotofeld hinzufügen</button><button class="btn ghost sm" data-dz="addspotify"><b style="color:#1DB954">●</b> Spotify-Code</button>${sel >= 0 ? `<button class="btn ghost sm" data-dz="dup">${ic('copy')} Duplizieren</button><button class="btn ghost sm danger" data-dz="del">${ic('trash')} Feld löschen</button>` : ''}${P.views.length > 1 ? `<button class="btn ghost sm" data-dz="delview">${ic('trash')} Dieses Foto entfernen</button>` : ''}</div>` : ''}
        </div>
        <div class="dz-r">${isNew || P.custom ? basicsHTML() : ''}${selHTML()}${listHTML()}</div>
      </div>`);
    Z.paint();
    loadFontsForPanel();
  };
  function basicsHTML() {
    return `<section class="a-card"><h2>Produkt</h2>
      <div class="grid3">${['de', 'en', 'ar'].map(l => `<label class="fld"><span>Name ${l.toUpperCase()}</span><input class="in" data-dzp="name.${l}" value="${esc(P.name[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}></label>`).join('')}</div>
      <div class="grid3">${['de', 'en', 'ar'].map(l => `<label class="fld"><span>Beschreibung ${l.toUpperCase()}</span><textarea class="in" rows="3" data-dzp="desc.${l}"${l === 'ar' ? ' dir="rtl"' : ''}>${esc(P.desc[l] || '')}</textarea></label>`).join('')}</div>
      <div class="grid3"><label class="fld"><span>Preis € *</span><input class="in" type="number" step="0.1" min="0" data-dzp="price" value="${P.price}"></label><label class="fld"><span>Kategorie</span><select class="in" data-dzp="cat">${CAT_EXTRA.cats.map(c => `<option value="${c}"${P.cat === c ? ' selected' : ''}>${t('cat_' + c, null, AL())}</option>`).join('')}</select></label><label class="fld"><span>Fertigung (Tage)</span><input class="in" type="number" min="0" max="20" data-dzp="prod" value="${P.prod || 2}"></label></div>
      <fieldset class="occs"><legend>Anlässe</legend>${CAT_EXTRA.occ.map(o => `<label class="check"><input type="checkbox" data-dzocc="${o}"${(P.occ || []).includes(o) ? ' checked' : ''}><span>${t('occ_' + o, null, AL())}</span></label>`).join('')}</fieldset></section>`;
  }
  function listHTML() {
    const zs = []; P.views.forEach((v, i) => v.zones.forEach((z, k) => { if (['text', 'photo', 'cal', 'spcode'].includes(z.t)) zs.push({ z, i, k }); }));
    return `<section class="a-card"><h2>Alle Felder <small class="muted">${zs.length}</small></h2>${zs.length ? `<div class="dz-list">${zs.map(({ z, i, k }) => { const f = field(sfOf(z)); return `<button data-dz="pick" data-v="${i}" data-k="${k}" aria-pressed="${i === vi && k === sel}">${ic(z.t === 'photo' ? 'image' : 'text')}<span><b>${esc(f ? labelOf(f) : z.tpl || '–')}</b><small>Foto ${i + 1} · ${z.t === 'photo' ? 'Kundenfoto' : z.tpl ? 'Vorlage ' + esc(z.tpl) : (f && f.fonts ? f.fonts.length + ' Schriften' : 'Text') + (f && f.colors ? ' · ' + f.colors.length + ' Farben' : '')}</small></span></button>`; }).join('')}</div>` : '<p class="muted">Noch keine Felder. Füge links ein Text- oder Fotofeld hinzu.</p>'}</section>`;
  }
  function labelOf(f) { return f.lab ? (f.lab[AL()] || f.lab.de) : t(f.label, null, AL()); }
  function selHTML() {
    const z = sel >= 0 && V() && V().zones[sel]; if (!z) return '';
    const f = field(sfOf(z));
    if (z.t === 'photo') {
      const sh = z.clip === 'heart' ? 'heart' : z.clip === 'circle' ? 'circle' : z.clip === 'ellipse' ? 'ellipse' : z.clip && z.clip.round != null ? 'round' : z.clip && z.clip.poly ? 'poly' : 'rect';
      return `<section class="a-card dz-sel"><h2>${ic('image')} Fotofeld</h2>
        ${labHTML(f)}
        <div class="grid2"><label class="fld"><span>Form</span><select class="in" data-dzz="shape">${SHAPES.map(([k, l]) => `<option value="${k}"${sh === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fld"><span>Breite im Druck (mm)</span><input class="in" type="number" min="5" max="1000" data-dzz="mm" value="${z.mm || 60}"></label></div>
        ${sh === 'poly' ? `<div class="dz-poly"><p class="hint">${ic('sparkle')} Ziehe die Punkte auf dem Foto, bis die Form passt. <b>Doppelklick auf eine Linie</b> = neuer Punkt, <b>Doppelklick auf einen Punkt</b> = Punkt löschen.</p>
          <div class="row"><button type="button" class="btn sm" data-dz="padd">${ic('plus')} Punkt hinzufügen</button><button type="button" class="btn sm ghost" data-dz="pdel"${(z.clip.poly || []).length <= 3 ? ' disabled' : ''}>${ic('trash')} Punkt löschen</button><small>${(z.clip.poly || []).length} Punkte</small></div>
          <span class="lb">Neu starten mit</span><div class="row">${[['rect', 'Rechteck'], ['circle', 'Kreis'], ['heart', 'Herz'], ['star', 'Stern'], ['hexagon', 'Sechseck']].map(([k, l]) => `<button type="button" class="btn sm ghost" data-dz="ppre" data-v="${k}">${l}</button>`).join('')}</div></div>` : ''}
        <span class="lb">Filter, die der Kunde wählen kann</span><div class="dz-checks">${PHFX.map(([k, l]) => `<label class="check"><input type="checkbox" data-dzphfx="${k}"${(f.fx || ['none']).includes(k) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <label class="size"><span>Deckkraft</span><input type="range" min="40" max="100" data-dzz="alpha" value="${Math.round((z.alpha == null ? 1 : z.alpha) * 100)}"><output>${Math.round((z.alpha == null ? 1 : z.alpha) * 100)} %</output></label>
        <label class="check"><input type="checkbox" data-dzf="optional"${f.optional ? ' checked' : ''}><span>Foto ist freiwillig</span></label></section>`;
    }
    if (z.t === 'spcode') {
      const fx = (z.fx && z.fx.k) || 'print';
      return `<section class="a-card dz-sel"><h2>Spotify-Code</h2><p class="hint">Der Kunde fügt den Spotify-Link seines Songs ein. Der echte, scanbare Code erscheint hier. Das Feld sollte etwa 4 : 1 (breit) sein.</p>
        ${labHTML(f)}
        <div class="grid3"><label class="fld"><span>Technik</span><select class="in" data-dzz="fx">${TECH.map(([k, l]) => `<option value="${k}"${fx === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label><label class="fld"><span>Breite im Druck (mm)</span><input class="in" type="number" min="5" max="1000" data-dzz="mm" value="${z.mm || 50}"></label></div>
        <label class="check"><input type="checkbox" data-dzf="optional"${f.optional ? ' checked' : ''}><span>Feld ist freiwillig</span></label>
        <h3 class="dz-h3">Farben für den Kunden</h3><div class="dz-colors">${COLORS.map(c => { const on = (f.colors || []).some(x => x.id === c.id); return `<label class="dz-col${on ? ' on' : ''}" title="${esc(c.l.de)}"><input type="checkbox" data-dzcol="${c.id}"${on ? ' checked' : ''}><i style="--c:${c.hex}"${c.foil ? ' class="foil"' : ''}></i><small>${esc(c.l.de)}</small></label>`; }).join('')}</div></section>`;
    }
    if (!f || f.type === 'stone' || f.type === 'date') return `<section class="a-card dz-sel"><h2>${ic('text')} Feld</h2><p class="muted">Dieses Feld (${esc(f ? labelOf(f) : '')}) ist ein Spezialfeld. Du kannst es verschieben und in der Größe ändern.</p></section>`;
    const fonts = f.fonts || [f.font || 'times'];
    const kinds = {}; Object.entries(window.FONTMETA).forEach(([id, m]) => { (kinds[m.kind] = kinds[m.kind] || []).push(id); });
    const fx = (z.fx && z.fx.k) || 'print';
    return `<section class="a-card dz-sel"><h2>${ic('text')} Textfeld</h2>
      ${z.tpl ? `<label class="fld"><span>Vorlage (Felder in {klammern})</span><input class="in" data-dzz="tpl" value="${esc(z.tpl)}"></label>` : ''}
      ${labHTML(f)}
      <div class="grid3"><label class="fld"><span>Beispieltext</span>${f.type === 'textarea' ? `<textarea class="in" rows="2" data-dzf="def">${esc(f.def || '')}</textarea>` : `<input class="in" data-dzf="def" value="${esc(f.def || '')}">`}</label><label class="fld"><span>Max. Zeichen</span><input class="in" type="number" min="1" max="200" data-dzf="max" value="${f.max || 20}"></label><label class="fld"><span>Breite im Druck (mm)</span><input class="in" type="number" min="5" max="1000" data-dzz="mm" value="${z.mm || 60}"></label></div>
      <div class="grid3"><label class="fld"><span>Technik</span><select class="in" data-dzz="fx">${TECH.map(([k, l]) => `<option value="${k}"${fx === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fld"><span>Ausrichtung</span><select class="in" data-dzz="align">${[['center', 'Mitte'], ['left', 'Links'], ['right', 'Rechts']].map(([k, l]) => `<option value="${k}"${(z.align || 'center') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fld"><span>Zeilen</span><select class="in" data-dzf="lines">${[1, 2, 3, 4].map(n => `<option value="${n}"${(f.type === 'textarea' ? (f.lines || 2) : 1) === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label class="size"><span>Schriftgröße</span><input type="range" min="30" max="140" data-dzz="fsk" value="${Math.round(((z.fs || (z.b ? z.b[3] * .8 : 40)) / ((z.b ? z.b[3] : 50))) * 100)}"><output></output></label>
      <label class="size"><span>Bogen</span><input type="range" min="-100" max="100" data-dzz="bend" value="${Math.round(z.bend || 0)}"><output>${Math.round(z.bend || 0)}</output></label>
      <div class="dz-row"><label class="check"><input type="checkbox" data-dzz="upper"${z.upper ? ' checked' : ''}><span>Nur GROSSBUCHSTABEN</span></label><label class="check"><input type="checkbox" data-dzf="sz"${f.sz === false ? '' : ' checked'}><span>Kunde darf Größe ändern</span></label><label class="check"><input type="checkbox" data-dzf="optional"${f.optional ? ' checked' : ''}><span>Feld ist freiwillig</span></label></div>
      ${f.sf ? `<p class="hint">Schriften und Farben kommen von „${esc(labelOf(field(f.sf) || {}))}“.</p>` : `
      <h3 class="dz-h3">Schriften für den Kunden <small class="muted">${fonts.length} gewählt · die erste ist Standard</small></h3>
      <div class="vbtns dz-fbtns"><button class="btn ghost sm" data-dz="fonts" data-v="all">Alle</button><button class="btn ghost sm" data-dz="fonts" data-v="none">Keine</button>${Object.keys(kinds).map(k => `<button class="btn ghost sm" data-dz="fonts" data-v="${k}">+ ${KIND_L[k] || k}</button>`).join('')}</div>
      <div class="dz-fonts">${Object.keys(window.FONTMETA).map(id => { const m = window.FONTMETA[id]; const on = fonts.includes(id); return `<label class="dz-font${on ? ' on' : ''}${fonts[0] === id ? ' def' : ''}"><input type="checkbox" data-dzfont="${id}"${on ? ' checked' : ''}><span class="smp" style="font-family:'${ENG.fam(id)}'">${m.ar ? 'اسم' : esc(sample(f))}</span><small>${esc(m.label)}</small>${on && fonts[0] !== id ? `<button type="button" class="dz-star" data-dz="fontdef" data-v="${id}" title="Als Standard">★</button>` : ''}</label>`; }).join('')}</div>
      <h3 class="dz-h3">Farben für den Kunden <small class="muted">${(f.colors || []).length || 'keine (Farbe wie Technik)'} · die erste ist Standard</small></h3>
      <div class="dz-colors">${COLORS.map(c => { const on = (f.colors || []).some(x => x.id === c.id); return `<label class="dz-col${on ? ' on' : ''}" title="${esc(c.l.de)}"><input type="checkbox" data-dzcol="${c.id}"${on ? ' checked' : ''}><i style="--c:${c.hex}"${c.foil ? ' class="foil"' : ''}></i><small>${esc(c.l.de)}</small></label>`; }).join('')}
        ${(f.colors || []).filter(c => !COLORS.some(x => x.id === c.id)).map(c => `<label class="dz-col on" title="${esc(L(c.l, AL()))}"><input type="checkbox" data-dzcol="${esc(c.id)}" checked><i style="--c:${esc(c.hex)}"></i><small>${esc(L(c.l, AL()))}</small></label>`).join('')}</div>
      <div class="dz-row"><input type="color" id="dzNewCol" value="#e0569a" class="dz-pick"><input class="in" id="dzNewColN" placeholder="Name der Farbe, z. B. Bordeaux" style="flex:1;min-width:160px"><button class="btn ghost sm" data-dz="addcol">${ic('plus')} Eigene Farbe</button></div>`}
    </section>`;
  }
  function labHTML(f) {
    const lab = f.lab || { de: t(f.label, null, 'de'), en: t(f.label, null, 'en'), ar: t(f.label, null, 'ar') };
    return `<span class="lb">Beschriftung für den Kunden</span><div class="grid3">${['de', 'en', 'ar'].map(l => `<input class="in" data-dzlab="${l}" value="${esc(lab[l] || '')}" placeholder="${l.toUpperCase()}"${l === 'ar' ? ' dir="rtl"' : ''}>`).join('')}</div>
      <div class="dz-row" style="margin:6px 0 12px">${LABELS.filter(([k]) => (f.type === 'photo') === k.startsWith('f_photo')).map(([k, l]) => `<button class="btn ghost sm" data-dz="labset" data-v="${k}">${l}</button>`).join('')}</div>`;
  }
  function sample(f) { const s = String(f.def || '').split('\n')[0].trim(); return s && s.length <= 12 ? s : 'Name'; }
  let fontTimer = 0;
  function loadFontsForPanel() { clearTimeout(fontTimer); if (!$('.dz-fonts')) return; fontTimer = setTimeout(() => Object.keys(window.FONTMETA).forEach(id => ENG.loadFont(id)), 50); }

  /* ---------------- canvas + overlay ---------------- */
  let paintTok = 0;
  Z.paint = async function () {
    const cv = $('#dzCv'); if (!cv || !V()) return;
    const tok = ++paintTok;
    const D = ENG.blankDesign(P); for (const o of (P.opts || [])) D.opt[o.id] = o.def;
    const Vw = V(); const keep = Vw.when; delete Vw.when; // show exactly this photo
    const w = Math.min(1100, Math.round((cv.parentElement.clientWidth || 600) * Math.min(2, devicePixelRatio || 1)));
    await ENG.render(cv, P, vi, D, { maxW: w, force: true });
    if (keep) Vw.when = keep;
    if (tok !== paintTok) return;
    Z.overlay();
  };
  const paintSoon = C.debounce(() => Z.paint(), 70);
  function quad(z) { return z.q ? z.q : ENG.boxQuad(z.b); }
  Z.overlay = function () {
    const ov = $('#dzOv'), cv = $('#dzCv'); if (!ov || !cv || !V()) return;
    const s = cv.clientWidth / V().w;
    ov.innerHTML = V().zones.map((z, k) => {
      if (!['text', 'photo', 'cal', 'spcode'].includes(z.t)) return '';
      const f = field(sfOf(z)); const lab = f ? labelOf(f) : (z.tpl || 'Text');
      let cx, cy, w, h, r = 0;
      if (z.b) { [cx, cy, w, h, r] = z.b; r = r || 0; } else { const q = quad(z); const xs = q.map(p => p[0]), ys = q.map(p => p[1]); cx = (Math.min(...xs) + Math.max(...xs)) / 2; cy = (Math.min(...ys) + Math.max(...ys)) / 2; w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys); }
      return `<div class="dz-z ${z.t === 'photo' ? 'ph' : 'tx'}${k === sel ? ' on' : ''}${z.t === 'photo' && z.clip === 'heart' ? ' heart' : ''}${z.t === 'photo' && (z.clip === 'circle' || z.clip === 'ellipse') ? ' round' : ''}" data-k="${k}" style="left:${(cx - w / 2) * s}px;top:${(cy - h / 2) * s}px;width:${w * s}px;height:${h * s}px;transform:rotate(${r}deg)">
        <span class="dz-tag">${ic(z.t === 'photo' ? 'image' : 'text')} ${esc(lab)}</span>
        ${k === sel && z.clip && z.clip.poly ? `<svg class="dz-poly-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${z.clip.poly.map(p => p[0] * 100 + ',' + p[1] * 100).join(' ')}"/>${z.clip.poly.map((p, i) => { const q = z.clip.poly[(i + 1) % z.clip.poly.length]; return `<line data-h="edge" data-i="${i}" x1="${p[0] * 100}" y1="${p[1] * 100}" x2="${q[0] * 100}" y2="${q[1] * 100}"/>`; }).join('')}</svg>${z.clip.poly.map((p, i) => `<i class="dz-pt${i === pSel ? ' on' : ''}" data-h="pt" data-i="${i}" style="left:${p[0] * 100}%;top:${p[1] * 100}%"></i>`).join('')}` : ''}
        ${k === sel ? `<i class="dz-h" data-h="nw"></i><i class="dz-h" data-h="ne"></i><i class="dz-h" data-h="sw"></i><i class="dz-h" data-h="se"></i><i class="dz-h" data-h="n"></i><i class="dz-h" data-h="s"></i><i class="dz-h" data-h="e"></i><i class="dz-h" data-h="w"></i>${z.b ? '<i class="dz-h rot" data-h="rot"></i>' : ''}` : ''}</div>`;
    }).join('');
  };
  function bindStage() {
    const ov = $('#dzOv'); if (!ov || ov._b) return; ov._b = 1;
    let drag = null;
    const pt = e => { const cv = $('#dzCv'); const r = cv.getBoundingClientRect(); const s = V().w / r.width; return [(e.clientX - r.left) * s, (e.clientY - r.top) * s]; };
    ov.addEventListener('pointerdown', e => {
      const el = e.target.closest('.dz-z'); if (!el) { if (sel >= 0) { sel = -1; Z.render(); } return; }
      const k = +el.dataset.k; e.preventDefault();
      if (k !== sel) { sel = k; Z.render(); }
      const z = V().zones[sel]; const h = e.target.dataset.h || 'move';
      try { ov.setPointerCapture(e.pointerId); } catch (er) { }
      if (h === 'edge') return;
      if (h === 'pt') { pSel = +e.target.dataset.i; e.target.parentNode.querySelectorAll('.dz-pt').forEach(x => x.classList.toggle('on', x === e.target)); }
      drag = { h, i: +e.target.dataset.i, p0: pt(e), b0: z.b ? z.b.slice() : null, q0: z.q ? clone(z.q) : null, fs0: z.fs };
    });
    ov.addEventListener('pointermove', e => {
      if (!drag) return; const z = V().zones[sel]; if (!z) return;
      const p = pt(e), dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1]; if (!drag.moved && Math.hypot(dx, dy) < 2) return; drag.moved = true;
      if (z.b) {
        const [cx, cy, w, h, r] = drag.b0;
        if (drag.h === 'pt' && z.clip && z.clip.poly) { const rr = (r || 0) * Math.PI / 180; const lx = (p[0] - cx) * Math.cos(-rr) - (p[1] - cy) * Math.sin(-rr), ly = (p[0] - cx) * Math.sin(-rr) + (p[1] - cy) * Math.cos(-rr); z.clip.poly[drag.i] = [r3(Math.min(1, Math.max(0, lx / w + .5))), r3(Math.min(1, Math.max(0, ly / h + .5)))]; }
        else if (drag.h === 'move') { z.b[0] = cx + dx; z.b[1] = cy + dy; }
        else if (drag.h === 'rot') { let a = Math.atan2(p[1] - cy, p[0] - cx) * 180 / Math.PI + 90; if (a > 180) a -= 360; const snap = Math.round(a / 45) * 45; if (Math.abs(a - snap) < 3 || e.shiftKey) a = snap; z.b[4] = Math.round(a * 10) / 10; }
        else {
          // only the side (or corner) that is dragged moves; the opposite side stays where it is
          const rr = (r || 0) * Math.PI / 180; const lx = (p[0] - cx) * Math.cos(-rr) - (p[1] - cy) * Math.sin(-rr), ly = (p[0] - cx) * Math.sin(-rr) + (p[1] - cy) * Math.cos(-rr);
          const hx = /e$|^e/.test(drag.h) ? 1 : /w$|^w/.test(drag.h) ? -1 : 0, hy = drag.h[0] === 's' ? 1 : drag.h[0] === 'n' ? -1 : 0;
          let x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
          if (hx === 1) x1 = Math.max(x0 + 20, lx); if (hx === -1) x0 = Math.min(x1 - 20, lx);
          if (hy === 1) y1 = Math.max(y0 + 14, ly); if (hy === -1) y0 = Math.min(y1 - 14, ly);
          const nw = x1 - x0, nh = y1 - y0, ox = (x0 + x1) / 2, oy = (y0 + y1) / 2;
          if (drag.fs0 && hy) z.fs = drag.fs0 * nh / h;
          z.b[0] = cx + ox * Math.cos(rr) - oy * Math.sin(rr); z.b[1] = cy + ox * Math.sin(rr) + oy * Math.cos(rr); z.b[2] = nw; z.b[3] = nh;
        }
      } else if (z.q) {
        const xs = drag.q0.map(q => q[0]), ys = drag.q0.map(q => q[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
        if (drag.h === 'move') z.q = drag.q0.map(q => [q[0] + dx, q[1] + dy]);
        else {
          const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
          const hx = /e$|^e/.test(drag.h) ? 1 : /w$|^w/.test(drag.h) ? -1 : 0, hy = drag.h[0] === 's' ? 1 : drag.h[0] === 'n' ? -1 : 0;
          let nx0 = X0, nx1 = X1, ny0 = Y0, ny1 = Y1;
          if (hx === 1) nx1 = Math.max(X0 + 20, p[0]); if (hx === -1) nx0 = Math.min(X1 - 20, p[0]);
          if (hy === 1) ny1 = Math.max(Y0 + 14, p[1]); if (hy === -1) ny0 = Math.min(Y1 - 14, p[1]);
          z.q = drag.q0.map(q => [nx0 + (q[0] - X0) / (w || 1) * (nx1 - nx0), ny0 + (q[1] - Y0) / (h || 1) * (ny1 - ny0)]); if (z.clipImg) delete z.clipImg;
        }
      }
      dirty = true; Z.overlay(); paintSoon();
    });
    ov.addEventListener('dblclick', e => {
      const z = V().zones[sel]; if (!z || !z.clip || !z.clip.poly) return; const tg = document.elementFromPoint(e.clientX, e.clientY) || e.target; const h = tg.dataset && tg.dataset.h; const P2 = z.clip.poly;
      if (h === 'pt') { if (P2.length > 3) { P2.splice(+tg.dataset.i, 1); pSel = -1; dirty = true; Z.render(); } return; }
      if (h === 'edge') { const zr = tg.closest('.dz-z').getBoundingClientRect(); const [cx, cy, w, hh, r] = z.b; const p = pt(e); const rr = (r || 0) * Math.PI / 180; const lx = (p[0] - cx) * Math.cos(-rr) - (p[1] - cy) * Math.sin(-rr), ly = (p[0] - cx) * Math.sin(-rr) + (p[1] - cy) * Math.cos(-rr); void zr; const i = +tg.dataset.i; P2.splice(i + 1, 0, [r3(Math.min(1, Math.max(0, lx / w + .5))), r3(Math.min(1, Math.max(0, ly / hh + .5)))]); pSel = i + 1; dirty = true; Z.render(); }
    });
    const up = () => { if (drag) { const m = drag.moved; drag = null; if (m) Z.render(); } };
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
  }
  const _paint = Z.paint; Z.paint = async function () { await _paint(); bindStage(); };
  window.addEventListener('resize', C.debounce(() => { if ($('#dzOv')) Z.overlay(); }, 100));

  /* ---------------- edits ---------------- */
  function addZone(kind) {
    const v = V(); const w = v.w, h = v.h;
    if (kind === 'text') {
      const id = newId(P.fields.some(f => f.type === 'text') ? 'text' : 'name');
      P.fields.push({ id, type: 'text', label: 'f_name', lab: L3('Name', 'Name', 'الاسم'), def: 'Sophie', max: 20, fonts: DEF_FONTS.slice(), colors: DEF_COLORS() });
      v.zones.push({ t: 'text', f: id, b: [Math.round(w / 2), Math.round(h * .7), Math.round(w * .5), Math.round(h * .1), 0], fs: Math.round(h * .08), fx: { k: 'print' }, mm: 80 });
    } else {
      const id = newId('ph');
      P.fields.push({ id, type: 'photo', label: 'f_photo', lab: L3('Foto', 'Photo', 'الصورة'), def: '', fx: ['none', 'bw', 'sepia'] });
      v.zones.push({ t: 'photo', f: id, b: [Math.round(w / 2), Math.round(h * .45), Math.round(w * .4), Math.round(h * .4), 0], mm: 80 });
    }
    sel = v.zones.length - 1; dirty = true; Z.render();
  }
  function addSpotify() {
    const v = V(); const w = v.w, h = v.h; const id = newId('spotify');
    P.fields.push({ id, type: 'spotify', label: 'f_spotify', def: '', colors: DEF_COLORS() });
    v.zones.push({ t: 'spcode', f: id, b: [Math.round(w / 2), Math.round(h * .8), Math.round(w * .44), Math.round(w * .11), 0], fx: { k: 'print' }, mm: 50 });
    sel = v.zones.length - 1; dirty = true; Z.render();
  }
  function curField() { const z = V() && V().zones[sel]; return z ? field(sfOf(z)) : null; }
  async function readPhoto(file) {
    const r = await ST.readImage(file, 1100); const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
    const im = await ENG.img(url); return { img: url, thumb: url, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height, noorig: 1, zones: [] };
  }
  Z.onClick = function (el) {
    const a = el.dataset.dz; if (!a) return false;
    const z = V() && V().zones[sel]; const f = curField();
    switch (a) {
      case 'view': vi = +el.dataset.i; sel = -1; Z.render(); return true;
      case 'pick': vi = +el.dataset.v; sel = +el.dataset.k; Z.render(); return true;
      case 'addtext': addZone('text'); return true;
      case 'addphoto': addZone('photo'); return true;
      case 'addspotify': addSpotify(); return true;
      case 'padd': { if (!z || !z.clip || !z.clip.poly) return true; const P2 = z.clip.poly; let i = pSel >= 0 ? pSel : (() => { let bi = 0, bl = -1; P2.forEach((p, k) => { const q = P2[(k + 1) % P2.length]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > bl) { bl = l; bi = k; } }); return bi; })(); const a2 = P2[i], b2 = P2[(i + 1) % P2.length]; P2.splice(i + 1, 0, [r3((a2[0] + b2[0]) / 2), r3((a2[1] + b2[1]) / 2)]); pSel = i + 1; dirty = true; Z.render(); return true; }
      case 'pdel': { if (!z || !z.clip || !z.clip.poly || z.clip.poly.length <= 3) return true; z.clip.poly.splice(pSel >= 0 ? pSel : z.clip.poly.length - 1, 1); pSel = -1; dirty = true; Z.render(); return true; }
      case 'ppre': { if (!z) return true; z.clip = { poly: POLY[el.dataset.v]() }; pSel = -1; dirty = true; Z.render(); return true; }
      case 'dup': { if (!z) return true; const c = clone(z); if (c.b) { c.b[0] += 20; c.b[1] += 20; } if (c.q) c.q = c.q.map(p => [p[0] + 20, p[1] + 20]); if (f && !c.tpl && !c.sf) { const nf = clone(f); nf.id = newId(f.type === 'photo' ? 'ph' : 'text'); P.fields.push(nf); c.f = nf.id; } V().zones.push(c); sel = V().zones.length - 1; dirty = true; Z.render(); return true; }
      case 'del': { if (!z) return true; V().zones.splice(sel, 1); const id = sfOf(z); const used = P.views.some(v => v.zones.some(x => sfOf(x) === id || x.f === id)); if (!used && z.f) P.fields = P.fields.filter(x => x.id !== z.f && x.sf !== z.f); sel = -1; dirty = true; Z.render(); return true; }
      case 'delview': if (P.views.length > 1) { P.views.splice(vi, 1); vi = 0; sel = -1; dirty = true; Z.render(); } return true;
      case 'fonts': { if (!f) return true; const v = el.dataset.v; const all = Object.keys(window.FONTMETA); if (v === 'all') f.fonts = all; else if (v === 'none') f.fonts = [f.fonts[0] || 'times']; else f.fonts = [...new Set((f.fonts || []).concat(all.filter(id => window.FONTMETA[id].kind === v)))]; dirty = true; Z.render(); return true; }
      case 'fontdef': { if (!f) return true; f.fonts = [el.dataset.v].concat(f.fonts.filter(x => x !== el.dataset.v)); dirty = true; Z.render(); return true; }
      case 'addcol': { if (!f) return true; const hex = $('#dzNewCol').value; const n = $('#dzNewColN').value.trim() || hex; f.colors = (f.colors || []).concat([{ id: 'c' + ST.uid(''), hex, l: L3(n, n, n) }]); dirty = true; Z.render(); return true; }
      case 'labset': { if (!f) return true; f.label = el.dataset.v; delete f.lab; dirty = true; Z.render(); return true; }
      case 'reset': C.confirm('Alle Änderungen an Feldern, Schriften und Farben dieses Produkts zurücksetzen?', 'Zurücksetzen', 'Abbrechen').then(ok => { if (!ok) return; const ov = ST.get('prodOv', {}); if (ov[P.id]) { delete ov[P.id].fields; delete ov[P.id].views; ST.set('prodOv', ov); ST.invalidate(); } C.toast('Zurückgesetzt'); Z.show(P.id); }); return true;
      case 'save': Z.save(); return true;
    }
    return false;
  };
  Z.onInput = function (el) {
    const z = V() && V().zones[sel]; const f = curField();
    if (el.dataset.dzp) { const [k, l] = el.dataset.dzp.split('.'); if (l) P[k][l] = el.value; else P[k] = el.type === 'number' ? +el.value : el.value; dirty = true; return true; }
    if (el.dataset.dzocc) { const o = el.dataset.dzocc; P.occ = el.checked ? [...new Set((P.occ || []).concat(o))] : (P.occ || []).filter(x => x !== o); dirty = true; return true; }
    if (el.dataset.dzlab && f) { f.lab = f.lab || { de: t(f.label, null, 'de'), en: t(f.label, null, 'en'), ar: t(f.label, null, 'ar') }; f.lab[el.dataset.dzlab] = el.value; dirty = true; Z.overlay(); return true; }
    if (el.dataset.dzf && f) {
      const k = el.dataset.dzf;
      if (k === 'def') f.def = el.value;
      else if (k === 'max') f.max = Math.max(1, +el.value || 1);
      else if (k === 'optional') { if (el.checked) f.optional = 1; else delete f.optional; }
      else if (k === 'sz') { if (el.checked) delete f.sz; else f.sz = false; }
      else if (k === 'lines') { const n = +el.value; if (n > 1) { f.type = 'textarea'; f.lines = n; z.lh = z.lh || 1.15; } else { f.type = 'text'; delete f.lines; } }
      dirty = true; paintSoon(); return true;
    }
    if (el.dataset.dzz && z) {
      const k = el.dataset.dzz;
      if (k === 'mm') z.mm = +el.value;
      else if (k === 'fx') { z.fx = Object.assign({}, z.fx || {}, { k: el.value }); if (el.value === 'engrave' && !z.fx.alpha) z.fx.alpha = .85; }
      else if (k === 'align') z.align = el.value;
      else if (k === 'tpl') z.tpl = el.value;
      else if (k === 'upper') z.upper = el.checked;
      else if (k === 'bend') { z.bend = +el.value || 0; if (!z.bend) delete z.bend; el.nextElementSibling.textContent = el.value; }
      else if (k === 'fsk') { const h = z.b ? z.b[3] : 50; z.fs = Math.round(h * el.value / 100); }
      else if (k === 'alpha') { z.alpha = el.value / 100; el.nextElementSibling.textContent = el.value + ' %'; if (z.alpha >= 1) delete z.alpha; }
      else if (k === 'shape') { const v = el.value; const prev = z.clip; if (v === 'rect') delete z.clip; else if (v === 'round') z.clip = { round: .12 }; else if (v === 'poly') { z.clip = { poly: POLY[prev === 'heart' ? 'heart' : (prev === 'circle' || prev === 'ellipse') ? 'circle' : 'rect']() }; pSel = -1; } else z.clip = v; if (z.q && v !== 'rect' && !z.b) { const q = z.q; const xs = q.map(p => p[0]), ys = q.map(p => p[1]); z.b = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 0]; delete z.q; delete z.clipImg; } Z.render(); }
      dirty = true; paintSoon(); return true;
    }
    if (el.dataset.dzphfx && f) { const k = el.dataset.dzphfx; const l = new Set(f.fx || ['none']); if (el.checked) l.add(k); else l.delete(k); f.fx = PHFX.map(x => x[0]).filter(x => l.has(x)); if (!f.fx.length) f.fx = ['none']; dirty = true; return true; }
    if (el.dataset.dzfont && f) { const id = el.dataset.dzfont; let l = f.fonts || []; l = el.checked ? l.concat(id) : l.filter(x => x !== id); if (!l.length) { l = [id]; el.checked = true; } f.fonts = [...new Set(l)]; dirty = true; el.closest('.dz-font').classList.toggle('on', el.checked); const h = $('.dz-sel .dz-h3 small'); if (h) h.textContent = f.fonts.length + ' gewählt · die erste ist Standard'; paintSoon(); return true; }
    if (el.dataset.dzcol && f) { const id = el.dataset.dzcol; const pre = COLORS.find(c => c.id === id); let l = f.colors || []; if (el.checked) { if (pre && !l.some(c => c.id === id)) l = l.concat([clone(pre)]); } else l = l.filter(c => c.id !== id); if (l.length) f.colors = l; else delete f.colors; el.closest('.dz-col').classList.toggle('on', el.checked); dirty = true; paintSoon(); return true; }
    return false;
  };
  Z.onFile = async function (el) {
    const file = el.files && el.files[0]; el.value = ''; if (!file) return true;
    C.toast('Foto wird geladen …');
    try { const v = await readPhoto(file); P.views.push(v); vi = P.views.length - 1; sel = -1; dirty = true; Z.render(); if (el.dataset.dzfile === 'first') setTimeout(() => addZone('text'), 50); }
    catch (e) { C.toast('Foto konnte nicht geladen werden', 'err'); }
    return true;
  };
  Z.save = function () {
    if (!P.views.length) { C.toast('Bitte zuerst ein Produktfoto hochladen', 'err'); return; }
    const anyName = ['de', 'ar', 'en'].map(l => String(P.name[l] || '').trim()).find(Boolean);
    if ((isNew || P.custom) && (!anyName || !(+P.price > 0))) { C.toast('Name (eine Sprache reicht) und Preis fehlen', 'err'); const i = $('[data-dzp="name.ar"]') || $('[data-dzp="name.de"]'); if (i) i.focus(); return; }
    // one language is enough: the other languages get the same text until the owner translates them
    for (const k of ['name', 'desc']) { const first = ['de', 'ar', 'en'].map(l => String(P[k][l] || '').trim()).find(Boolean) || ''; for (const l of ['de', 'en', 'ar']) if (!String(P[k][l] || '').trim()) P[k][l] = first; }
    try {
      if (isNew || P.custom) { const c = clone(P); delete c.custom; ST.saveCustom(c); }
      else ST.saveOverride(P.id, { fields: clone(P.fields), views: clone(P.views) });
    } catch (e) { C.toast('Speichern fehlgeschlagen', 'err'); return; }
    if (!ST.ok()) return;
    if (window.SHOP) SHOP.searchIndex = null;
    ST.log('produkt', (isNew ? 'Neues Produkt: ' : 'Personalisierung bearbeitet: ') + P.name.de);
    dirty = false; orig = JSON.stringify(P); C.toast('Gespeichert ✓'); const was = isNew; isNew = false;
    if (was) C.go('#/admin/designer/' + P.id); else Z.render();
  };
  Z.isDirty = () => dirty;
})();
