/* Owner area: orders pipeline, production, shipping, products, customers, discounts, reviews, emails, settings. */
(function () {
  'use strict';
  const A = {};
  window.ADMIN = A;
  A.shell = (tab, html) => shell(tab, html);
  const app = () => $('#app');
  const DEF_STAFF = [{ user: 'Inhaber', pin: '1234', role: 'owner' }, { user: 'Werkstatt', pin: '0000', role: 'staff' }];
  const staff = () => (ST.settings().staff && ST.settings().staff.length ? ST.settings().staff : DEF_STAFF);
  const session = () => { const s = ST.get('adminSession', null); if (s && s.at && Date.now() - s.at > 12 * 3600e3) { ST.set('adminSession', null); return null; } return s; };
  const isOwner = () => (session() || {}).role === 'owner';
  const de = { lang: 'de' };
  const AL = () => (ST.get('adminLang', 'ar') === 'ar' ? 'ar' : 'de'); // admin language (Arabic by default)
  const T = (k, v) => t(k, v, 'de'); // admin stays German
  const ST_L = { neu: 'Neu', freigabe: 'Freigabe', produktion: 'In Produktion', bereit: 'Fertig', unterwegs: 'Unterwegs', zugestellt: 'Erledigt', storniert: 'Storniert' };
  const M_L = { pickup: 'Abholung', local: 'Kurier Hamburg', dhl: 'DHL', eu: 'DHL EU' };
  const PAY_L = { paypal: 'PayPal', card: 'Karte', klarna: 'Klarna', applepay: 'Apple Pay', vorkasse: 'Vorkasse', cash: 'Bar bei Abholung' };
  const today = () => ST.iso(new Date());
  const dshort = d => C.date(d, { weekday: 'short', day: '2-digit', month: '2-digit' }, AL());
  const badge = o => `<span class="badge st-${o.status}">${ST_L[o.status]}</span>`;
  let SEL = { of: 'offen', q: '', pq: '', pcat: '', rv: 'reviews' };

  const TABS = [
    ['', 'home', 'Übersicht'], ['bestellungen', 'inbox', 'Bestellungen'], ['produktion', 'layers', 'Produktion'], ['versand', 'truck', 'Versand'],
    ['produkte', 'tag', 'Produkte', 1], ['kategorien', 'grid', 'Kategorien', 1], ['kunden', 'users', 'Kunden', 1], ['rabatte', 'gift', 'Rabatte & Gutscheine', 1], ['bewertungen', 'star', 'Bewertungen & Fragen'],
    ['emails', 'mail', 'E-Mails'], ['website', 'image', 'Website', 1], ['einstellungen', 'settings', 'Einstellungen', 1], ['aktivitaet', 'clock', 'Aktivität', 1]
  ];
  function shell(tab, html) {
    C.applyLang(); document.documentElement.lang = 'de'; document.documentElement.dir = 'ltr';
    const s = session(); const open = ST.orders().filter(o => o.status === 'neu').length;
    const qs = ST.questions().filter(q => !q.answer).length + ST.reviews().filter(r => !r.ok && !r.hidden).length;
    app().className = 'adm';
    app().innerHTML = `<header class="a-top"><a class="a-logo" href="#/admin">Adam <i>&amp;</i> Neuetalia</a><span class="a-sub">Verwaltung</span>
      <span class="sp"></span><a class="btn ghost sm" href="#/" target="_self">${ic('store')}<span class="lbl"> Shop ansehen</span></a><span class="a-user">${ic('user')} ${esc(s.user)}</span><button class="ibtn a-out" data-a="logout" aria-label="Abmelden">${ic('logout')}</button><button class="ibtn a-dots" data-a="anav" aria-label="Menü"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg></button></header>
      <div class="a-body"><nav class="a-nav" aria-label="Verwaltung">${TABS.filter(x => !x[3] || isOwner()).map(([k, i, l]) => `<a href="#/admin${k ? '/' + k : ''}"${k === tab ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${k === 'bestellungen' && open ? `<em>${open}</em>` : ''}${k === 'bewertungen' && qs ? `<em>${qs}</em>` : ''}</a>`).join('')}</nav>
      <main class="a-main" id="amain">${html}</main></div>`;
  }
  A.show = function (parts) {
    const [tab, id] = parts;
    if (!session()) return A.login();
    if (TABS.find(x => x[0] === (tab || '') && x[3]) && !isOwner()) return shell(tab, `<p class="muted">Nur für Inhaber.</p>`);
    switch (tab || '') {
      case '': return A.dash();
      case 'o': return A.order(id);
      case 'bestellungen': return A.orders();
      case 'produktion': return A.production();
      case 'versand': return A.shipping();
      case 'produkte': return id ? A.productEdit(id) : A.products();
      case 'designer': return DESIGNER.show(id);
      case 'kategorien': return A.categories();
      case 'kunden': return A.customers(id);
      case 'rabatte': return A.discounts();
      case 'bewertungen': return A.reviews();
      case 'emails': return A.emails(id);
      case 'einstellungen': return A.settings();
      case 'website': return A.website ? A.website(id) : A.dash();
      case 'aktivitaet': return A.activity();
      default: return A.dash();
    }
  };
  A.login = function () {
    app().className = 'adm login';
    document.documentElement.lang = 'de'; document.documentElement.dir = 'ltr';
    app().innerHTML = `<div class="a-login"><a class="a-logo" href="#/">Adam <i>&amp;</i> Neuetalia</a><h1>Verwaltung</h1>
      <form data-aform="login"><label class="fld"><span>Benutzer</span><select class="in" name="user">${staff().map(s => `<option>${esc(s.user)}</option>`).join('')}</select></label>
      <label class="fld"><span>PIN</span><input class="in big" name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label><button class="btn block">Anmelden</button></form>
      <p class="muted small">Der Werkstatt-Zugang sieht nur Bestellungen, Produktion und Versand.</p><a class="link" href="#/">← Zurück zum Shop</a></div>`;
    setTimeout(() => { const i = $('[name=pin]'); if (i) i.focus(); }, 50);
  };

  /* ---------------- dashboard ---------------- */
  A.dash = function () {
    const os = ST.orders(); const live = os.filter(o => o.status !== 'storniert');
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const m0 = new Date(t0.getFullYear(), t0.getMonth(), 1);
    const rev = f => ST.round2(live.filter(f).reduce((a, o) => a + o.totals.total, 0));
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(t0); d.setDate(d.getDate() - 13 + i); return d; });
    const per = days.map(d => { const e = d.getTime() + 864e5; return rev(o => o.created >= d.getTime() && o.created < e); });
    const max = Math.max(1, ...per);
    const neu = os.filter(o => o.status === 'neu'), appr = os.filter(o => o.status === 'freigabe'), prod = os.filter(o => o.status === 'produktion'), ready = os.filter(o => o.status === 'bereit');
    const dueToday = os.filter(o => ['neu', 'freigabe', 'produktion'].includes(o.status) && o.ship.date <= today());
    const low = ST.products().filter(p => p.stock <= 3 && !p.virtual);
    const unans = ST.questions().filter(q => !q.answer), unrev = ST.reviews().filter(r => !r.ok && !r.hidden);
    const cmp = os.filter(o => (o.complaints || []).some(c => !c.done));
    shell('', `<div class="a-head"><h1>Guten ${new Date().getHours() < 11 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}, ${esc(session().user)}</h1><p class="muted">${C.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }, AL())}</p></div>
      <div class="kpis">
        <a class="kpi" href="#/admin/bestellungen"><span>Neue Bestellungen</span><b>${neu.length}</b></a>
        <a class="kpi" href="#/admin/produktion"><span>In Produktion</span><b>${prod.length}</b><small>${dueToday.length} heute fällig</small></a>
        <a class="kpi" href="#/admin/versand"><span>Fertig zum Versand / Abholung</span><b>${ready.length}</b></a>
        ${isOwner() ? `<div class="kpi"><span>Umsatz heute</span><b>${eur(rev(o => o.created >= t0.getTime()), AL())}</b><small>Monat: ${eur(rev(o => o.created >= m0.getTime()), AL())}</small></div>` : ''}
      </div>
      <div class="a-grid">
        <section class="a-card"><h2>Zu erledigen</h2><ul class="todo">
          ${neu.map(o => `<li><a href="#/admin/o/${o.no}">${ic('bell')}<span><b>${o.no}</b> neu · ${esc(o.cust.name)}</span><small>${C.ago(o.created)}</small></a></li>`).join('')}
          ${appr.map(o => `<li><a href="#/admin/o/${o.no}">${ic('eye')}<span><b>${o.no}</b> Freigabe: ${o.items.filter(i => i.approval).map(i => i.approval.status === 'ok' ? 'freigegeben ✓' : i.approval.status === 'change' ? 'Änderung gewünscht' : 'wartet').join(', ')}</span></a></li>`).join('')}
          ${cmp.map(o => `<li><a href="#/admin/o/${o.no}">${ic('alert')}<span><b>${o.no}</b> Reklamation offen</span></a></li>`).join('')}
          ${unans.length ? `<li><a href="#/admin/bewertungen">${ic('chat')}<span>${unans.length} offene Kundenfrage(n)</span></a></li>` : ''}
          ${unrev.length ? `<li><a href="#/admin/bewertungen">${ic('star')}<span>${unrev.length} Bewertung(en) warten auf Freigabe</span></a></li>` : ''}
          ${low.map(p => `<li><a href="#/admin/produkte/${p.id}">${ic('box')}<span>Bestand niedrig: ${esc(L(p.name, AL()))} (${p.stock})</span></a></li>`).join('')}
          ${!neu.length && !appr.length && !cmp.length && !unans.length && !unrev.length && !low.length ? '<li class="muted">Alles erledigt.</li>' : ''}</ul></section>
        ${isOwner() ? `<section class="a-card"><h2>Umsatz der letzten 14 Tage</h2><div class="bars" role="img" aria-label="Umsatz pro Tag">${per.map((v, i) => `<div class="bcol" title="${dshort(days[i])}: ${eur(v, AL())}"><i style="height:${Math.max(2, v / max * 100)}%"></i><small>${days[i].getDate()}.</small></div>`).join('')}</div><p class="muted small">Gesamt: ${eur(per.reduce((a, b) => a + b, 0), AL())} · ${live.filter(o => o.created >= days[0].getTime()).length} Bestellungen</p></section>` : ''}
        <section class="a-card"><h2>Heute fällig</h2>${dueToday.length ? `<div class="olist">${dueToday.map(rowHTML).join('')}</div>` : '<p class="muted">Nichts fällig heute.</p>'}</section>
      </div>`);
  };
  function rowHTML(o) {
    return `<a class="orow" href="#/admin/o/${o.no}"><span class="othumbs">${o.items.slice(0, 3).map(i => `<img src="${esc(i.preview || '')}" alt="" width="48" height="48">`).join('')}</span>
      <span><b>${o.no}</b> ${esc(o.cust.name)}<small>${M_L[o.ship.method]} · fällig ${dshort(o.ship.date)}${o.ship.window ? ' · ' + esc(o.ship.window) : ''}${o.approval ? ' · Freigabe' : ''}${o.pay.status !== 'bezahlt' ? ' · <em>unbezahlt</em>' : ''}</small></span>${badge(o)}<b>${eur(o.totals.total, AL())}</b></a>`;
  }

  /* ---------------- orders list ---------------- */
  A.orders = function () {
    const F = { offen: o => !['zugestellt', 'storniert'].includes(o.status), alle: () => true };
    ST.STATUS.forEach(s => F[s] = o => o.status === s);
    let list = ST.orders().filter(F[SEL.of] || F.offen);
    if (SEL.q) { const q = C.norm(SEL.q); list = list.filter(o => C.norm([o.no, o.cust.name, o.cust.email, o.cust.phone, ...o.items.map(i => DOCS.linesText(i, AL()))].join(' ')).includes(q)); }
    const cnt = k => ST.orders().filter(F[k]).length;
    shell('bestellungen', `<div class="a-head"><h1>Bestellungen</h1><button class="btn ghost sm" data-a="csv">${ic('download')} CSV-Export</button></div>
      <div class="a-filter"><nav class="chips">${['offen', ...ST.STATUS, 'alle'].map(k => `<button data-a="of" data-v="${k}" aria-pressed="${SEL.of === k}">${k === 'offen' ? 'Offen' : k === 'alle' ? 'Alle' : ST_L[k]} <small>${cnt(k)}</small></button>`).join('')}</nav>
      <input class="in" type="search" data-ain="oq" placeholder="Suchen: Nummer, Name, E-Mail, Gravurtext …" value="${esc(SEL.q)}"></div>
      <div class="olist" id="olist">${list.length ? list.map(rowHTML).join('') : '<p class="muted">Keine Bestellungen.</p>'}</div>`);
  };

  /* ---------------- order detail ---------------- */
  A.order = async function (no) {
    const o = ST.order(no); if (!o) return shell('bestellungen', '<p>Nicht gefunden.</p>');
    const s = ST.settings();
    const apprItems = o.items.filter(i => i.approval);
    const allOk = apprItems.length && apprItems.every(i => i.approval.status === 'ok');
    let next = '';
    if (o.status === 'neu') next = o.approval && apprItems.length ? `<button class="btn" data-a="send-proof" data-no="${o.no}">${ic('eye')} Korrekturabzug an Kunden senden</button><button class="btn ghost" data-a="st" data-no="${o.no}" data-st="produktion">Ohne Freigabe in Produktion</button>` : `<button class="btn" data-a="st" data-no="${o.no}" data-st="produktion">${ic('layers')} Produktion starten</button>`;
    if (o.status === 'freigabe') next = allOk ? `<button class="btn" data-a="st" data-no="${o.no}" data-st="produktion">${ic('layers')} Freigegeben – Produktion starten</button>` : `<button class="btn ghost" data-a="send-proof" data-no="${o.no}">Neue Vorschau senden</button><button class="btn ghost" data-a="st" data-no="${o.no}" data-st="produktion">Trotzdem produzieren</button>`;
    if (o.status === 'produktion') next = `<button class="btn" data-a="st" data-no="${o.no}" data-st="bereit">${ic('check')} Fertig – ${o.ship.method === 'pickup' ? 'abholbereit melden' : 'bereit zum Versand'}</button>`;
    if (o.status === 'bereit') next = o.ship.method === 'pickup' ? `<button class="btn" data-a="st" data-no="${o.no}" data-st="zugestellt">${ic('check')} Abgeholt</button>` : o.ship.method === 'local' ? `<button class="btn" data-a="st" data-no="${o.no}" data-st="unterwegs">${ic('bike')} Kurier ist unterwegs</button>` : `<button class="btn" data-a="ship" data-no="${o.no}">${ic('truck')} Sendungsnummer eintragen & versenden</button>`;
    if (o.status === 'unterwegs') next = `<button class="btn" data-a="st" data-no="${o.no}" data-st="zugestellt">${ic('check')} Zugestellt</button>`;
    const mails = ST.emails().filter(m => m.no === o.no);
    shell('bestellungen', `<a class="link back" href="#/admin/bestellungen">${ic('back')} Bestellungen</a>
      <div class="a-head od-head"><div><h1>${o.no} ${badge(o)}${o.example ? ' <span class="badge">Beispiel</span>' : ''}</h1><p class="muted">${C.dt(o.created, AL())} · ${esc(o.cust.name)} · ${eur(o.totals.total, AL())} · ${PAY_L[o.pay.method]} <b class="${o.pay.status === 'bezahlt' ? 'ok' : 'warn'}">${o.pay.status}</b></p></div>
        <div class="od-next">${next}</div></div>
      <div class="od-grid">
        <div class="od-items">${o.items.map((it, i) => `<section class="a-card od-item"><div class="od-pv"><canvas data-opv="${i}"></canvas></div><div class="od-info"><h3>${it.qty} × ${esc(L(it.name, AL()))}</h3>
          <dl class="kv">${DOCS.lines(it, AL()).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
          ${it.approval ? `<p class="appr-st ${it.approval.status}">${ic('eye')} Freigabe: <b>${{ offen: 'wartet auf Kunde', ok: 'freigegeben', change: 'Änderung gewünscht' }[it.approval.status]}</b></p>${it.approval.comments.map(c => `<p class="cmt ${c.by}"><b>${c.by === 'shop' ? 'Shop' : 'Kunde'}:</b> ${esc(c.text)}</p>`).join('')}` : ''}
          ${it.pid === 'geschenkbox' ? `<div class="vbtns"><button class="btn sm" data-a="boxcard" data-no="${o.no}" data-i="${i}">${ic('card')} Grußkarte drucken (PNG)</button></div>` : `<div class="vbtns"><button class="btn sm" data-a="files" data-no="${o.no}" data-i="${i}">${ic('print')} Drucken / Dateien</button><button class="btn ghost sm" data-a="edit-item" data-no="${o.no}" data-i="${i}">${ic('edit')} Text korrigieren</button><button class="btn ghost sm" data-a="big" data-no="${o.no}" data-i="${i}">${ic('zoomIn')} Groß ansehen</button></div>`}</div></section>`).join('')}</div>
        <aside class="od-side">
          <section class="a-card"><h3>Dokumente</h3><div class="docbtns">
            <button class="btn ghost sm" data-a="pdf" data-k="sheet" data-no="${o.no}">${ic('print')} Produktionsblatt</button>
            <button class="btn ghost sm" data-a="pdf" data-k="invoice" data-no="${o.no}">${ic('download')} Rechnung ${o.invoice}</button>
            <button class="btn ghost sm" data-a="pdf" data-k="note" data-no="${o.no}">${ic('download')} Lieferschein</button>
            ${o.ship.method !== 'pickup' ? `<button class="btn ghost sm" data-a="pdf" data-k="label" data-no="${o.no}">${ic('print')} Versandetikett</button>` : ''}
            <button class="btn ghost sm" data-a="zip" data-no="${o.no}">${ic('download')} Alles als ZIP</button></div></section>
          <section class="a-card"><h3>Kunde</h3><p><b>${esc(o.cust.name)}</b><br><a href="mailto:${esc(o.cust.email)}">${esc(o.cust.email)}</a><br><a href="tel:${esc(o.cust.phone)}">${esc(o.cust.phone || '–')}</a></p>
            <div class="vbtns"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${esc(String(o.cust.phone || '').replace(/\D/g, '').replace(/^0/, '49'))}">${ic('chat')} WhatsApp</a></div></section>
          <section class="a-card"><h3>${M_L[o.ship.method]}</h3><p>Fällig: <b>${C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' }, AL())}</b>${o.ship.window ? '<br>Zeitfenster: <b>' + esc(o.ship.window) + '</b>' : ''}</p>
            ${o.ship.addr ? `<p>${[o.ship.addr.name, o.ship.addr.street, o.ship.addr.zip + ' ' + o.ship.addr.city, o.ship.addr.country !== 'DE' ? o.ship.addr.country : ''].filter(Boolean).map(esc).join('<br>')}</p>` : ''}
            ${o.tracking ? `<p>Sendung: <a target="_blank" rel="noopener" href="${DOCS.trackUrl(o.tracking.code)}">${esc(o.tracking.code)}</a></p>` : ''}
            ${o.gift.isGift ? `<p class="giftnote">${ic('gift')} Geschenk${o.gift.wrap ? ' · Geschenkverpackung' : ''}${o.gift.hidePrices ? ' · ohne Preise' : ''}${o.gift.card ? `<br><i>„${esc(o.gift.card)}“</i>` : ''}</p>` : ''}
            ${o.note ? `<p class="giftnote">${ic('chat')} ${esc(o.note)}</p>` : ''}</section>
          <section class="a-card"><h3>Zahlung</h3><dl class="kv"><dt>Zwischensumme</dt><dd>${eur(o.totals.sub, AL())}</dd><dt>Versand</dt><dd>${eur(o.totals.ship, AL())}</dd>${o.totals.wrap ? `<dt>Verpackung</dt><dd>${eur(o.totals.wrap, AL())}</dd>` : ''}${o.totals.discount ? `<dt>Rabatt ${esc(o.coupon)}</dt><dd>−${eur(o.totals.discount, AL())}</dd>` : ''}${o.totals.gift ? `<dt>Gutschein</dt><dd>−${eur(o.totals.gift, AL())}</dd>` : ''}<dt><b>Gesamt</b></dt><dd><b>${eur(o.totals.total, AL())}</b></dd></dl>
            ${o.pay.status !== 'bezahlt' && o.status !== 'storniert' ? `<button class="btn ghost sm" data-a="paid" data-no="${o.no}">${ic('check')} Als bezahlt markieren</button>` : ''}</section>
          ${(o.complaints || []).length ? `<section class="a-card"><h3>Reklamationen</h3>${o.complaints.map((c, k) => `<p class="cmt"><b>${C.dt(c.at, AL())}</b> ${esc(c.text)}</p>${c.done ? '<p class="muted small">erledigt</p>' : `<button class="btn ghost sm" data-a="cmp-done" data-no="${o.no}" data-k="${k}">Erledigt</button>`}`).join('')}</section>` : ''}
          <section class="a-card"><h3>Interne Notizen</h3>${(o.notes || []).map(n => `<p class="cmt"><b>${esc(n.by)} · ${C.ago(n.at)}</b> ${esc(n.text)}</p>`).join('')}<form data-aform="note" data-no="${o.no}" class="row"><input class="in" name="text" placeholder="Notiz für das Team" required><button class="btn ghost sm">Speichern</button></form></section>
          <section class="a-card"><h3>Verlauf</h3><ul class="hist">${o.history.slice().reverse().map(h => `<li><b>${ST_L[h.st]}</b><small>${C.dt(h.at, AL())} · ${esc(h.by)}${h.note ? ' · ' + esc(h.note) : ''}</small></li>`).join('')}</ul></section>
          <section class="a-card"><h3>E-Mails an Kunde</h3>${mails.length ? `<ul class="mlist">${mails.map(m => `<li><a href="#/admin/emails/${m.id}">${esc(DOCS.mail(m).subject)}</a><small>${C.ago(m.at)} · ${esc(m.to)}</small></li>`).join('')}</ul>` : '<p class="muted">Keine.</p>'}</section>
          ${o.status !== 'storniert' && o.status !== 'zugestellt' ? `<button class="btn ghost sm danger" data-a="cancel" data-no="${o.no}">${ic('trash')} Bestellung stornieren</button>` : ''}
        </aside></div>`);
    for (const c of $$('[data-opv]')) { const it = o.items[+c.dataset.opv]; const p = ST.product(it.pid); if (it.pid === 'geschenkbox' && it.D.box && window.BOX) { await BOX.drawBox(c, Object.assign({ items: o.items.filter(x => x.D && x.D.boxOf === it.id).map(x => ({ pid: x.pid, D: x.D, qty: x.qty })) }, it.D.box), 700); continue; } if (p && p.views.length) await ENG.render(c, p, 0, it.D, { maxW: 700, force: true }); }
  };

  /* ---------------- production ---------------- */
  A.production = function () {
    const list = ST.orders().filter(o => ['neu', 'freigabe', 'produktion'].includes(o.status)).sort((a, b) => a.ship.date.localeCompare(b.ship.date) || a.created - b.created);
    const groups = {}; list.forEach(o => { const k = o.ship.date <= today() ? 'Heute fällig (oder überfällig)' : o.ship.date === ST.iso(ST.addWorkdays(new Date(), 1)) ? 'Nächster Werktag' : 'Später'; (groups[k] = groups[k] || []).push(o); });
    shell('produktion', `<div class="a-head"><h1>Produktion</h1><div class="vbtns"><button class="btn sm" data-a="dayzip">${ic('download')} Alle Druckdateien (ZIP)</button><button class="btn ghost sm" data-a="daysheet">${ic('print')} Alle Produktionsblätter</button></div></div>
      ${list.length ? Object.entries(groups).map(([k, os]) => `<h2 class="a-h2">${k} <small>${os.length}</small></h2><div class="pq">${os.map(o => `<article class="a-card pq-card"><a href="#/admin/o/${o.no}" class="pq-top"><b>${o.no}</b>${badge(o)}<small>${M_L[o.ship.method]} · ${dshort(o.ship.date)}${o.ship.window ? ' · ' + esc(o.ship.window) : ''}</small></a>
        ${o.items.map((it, i) => `<div class="pq-item"><img src="${esc(it.preview || '')}" alt="" width="72" height="72"><div><b>${it.qty} × ${esc(L(it.name, AL()))}</b><small>${esc(DOCS.linesText(it, AL()))}</small></div><button class="ibtn" data-a="files" data-no="${o.no}" data-i="${i}" aria-label="Drucken">${ic('print')}</button></div>`).join('')}
        <div class="vbtns">${o.status === 'produktion' ? `<button class="btn sm" data-a="st" data-no="${o.no}" data-st="bereit">${ic('check')} Fertig</button>` : `<a class="btn ghost sm" href="#/admin/o/${o.no}">Öffnen</a>`}</div></article>`).join('')}</div>`).join('') : '<p class="muted">Keine Aufträge in der Produktion.</p>'}`);
  };

  /* ---------------- shipping ---------------- */
  A.shipping = function () {
    const ready = ST.orders().filter(o => o.status === 'bereit'); const way = ST.orders().filter(o => o.status === 'unterwegs');
    const by = m => ready.filter(o => o.ship.method === m);
    const s = ST.settings();
    const sec = (title, os, extra) => `<h2 class="a-h2">${title} <small>${os.length}</small></h2>${os.length ? `<div class="olist">${os.map(o => `<div class="orow-w">${rowHTML(o)}<span class="vbtns">${extra(o)}</span></div>`).join('')}</div>` : '<p class="muted">–</p>'}`;
    shell('versand', `<div class="a-head"><h1>Versand & Abholung</h1><button class="btn ghost sm" data-a="labels">${ic('print')} Alle Etiketten drucken</button></div>
      ${sec('DHL / EU – zu versenden', [...by('dhl'), ...by('eu')], o => `<button class="btn sm" data-a="ship" data-no="${o.no}">${ic('truck')} Versenden</button><button class="btn ghost sm" data-a="pdf" data-k="label" data-no="${o.no}">Etikett</button>`)}
      ${s.shipping.local.windows.map(w => sec('Kurier Hamburg · ' + w, by('local').filter(o => o.ship.window === w), o => `<button class="btn sm" data-a="st" data-no="${o.no}" data-st="unterwegs">${ic('bike')} Losgeschickt</button>`)).join('')}
      ${sec('Abholung im Laden', by('pickup'), o => `<button class="btn sm" data-a="st" data-no="${o.no}" data-st="zugestellt">${ic('check')} Abgeholt</button>`)}
      ${sec('Unterwegs', way, o => `<button class="btn ghost sm" data-a="st" data-no="${o.no}" data-st="zugestellt">${ic('check')} Zugestellt</button>`)}
      <p class="muted small">Hinweis: Echte DHL-Etiketten und automatische Sendungsnummern kommen in Stufe 2 über DHL Geschäftskunden oder Sendcloud. Jetzt trägst du die Nummer selbst ein; der Kunde bekommt sie automatisch per E-Mail.</p>`);
  };

  /* ---------------- products ---------------- */
  A.products = function () {
    const all = ST.products(true).filter(p => !p.virtual);
    let list = all.filter(p => SEL.pdel ? p.deleted : !p.deleted);
    if (SEL.pcat) list = list.filter(p => p.cat === SEL.pcat);
    if (SEL.pq) { const q = C.norm(SEL.pq); list = list.filter(p => C.norm(['de', 'en', 'ar'].map(l => L(p.name, l)).join(' ') + p.id).includes(q)); }
    const nDel = all.filter(p => p.deleted).length;
    shell('produkte', `<div class="a-head"><h1>Produkte <small class="muted">${all.filter(p => !p.deleted).length}</small></h1><div class="vbtns"><a class="btn ghost sm" href="#/admin/kategorien">${ic('grid')} Kategorien</a><button class="btn sm" data-a="pnew">${ic('plus')} Neues Produkt</button></div></div>
      <div class="a-filter"><nav class="chips"><button data-a="pcat" data-v="" aria-pressed="${!SEL.pcat}">Alle</button>${CAT_EXTRA.cats.map(c => `<button data-a="pcat" data-v="${c}" aria-pressed="${SEL.pcat === c}">${t('cat_' + c, null, AL())} <small>${all.filter(p => p.cat === c && !p.deleted).length}</small></button>`).join('')}${nDel ? `<button data-a="pdelview" aria-pressed="${!!SEL.pdel}">${ic('trash')} Gelöscht <small>${nDel}</small></button>` : ''}</nav><input class="in" type="search" data-ain="pq" placeholder="Produkt suchen" value="${esc(SEL.pq)}"></div>
      <div class="ptable">${list.map(p => `<div class="prow${p.active && !p.deleted ? '' : ' off'}"><a href="#/admin/produkte/${esc(p.id)}" class="pth"><img src="${esc(p.views[0].thumb || p.views[0].img)}" alt="" width="64" height="64"></a>
        <a href="#/admin/produkte/${esc(p.id)}" class="pnm"><b>${esc(L(p.name, AL()))}</b><small>${t('cat_' + p.cat, null, AL())}${p.custom ? ' · eigenes Produkt' : ''}${(p.opts || []).length ? ' · ' + p.opts.reduce((a, o) => a + o.choices.length, 0) + ' Varianten' : ''}${ST.onSale(p) ? ` · <em>Angebot −${Math.round((1 - p.salePrice / p.price) * 100)} %</em>` : ''}</small></a>
        <label class="mini-f"><span>Preis €</span><input class="in" type="number" step="0.1" min="0" value="${p.price}" data-pf="price" data-id="${esc(p.id)}"></label>
        <label class="mini-f"><span>Angebot €</span><input class="in" type="number" step="0.1" min="0" value="${p.salePrice || ''}" placeholder="–" data-pf="salePrice" data-id="${esc(p.id)}"></label>
        ${SEL.pdel ? `<button class="btn sm" data-a="prestore" data-id="${esc(p.id)}">${ic('rotateL')} Wiederherstellen</button>` : `<label class="tog"><input type="checkbox" data-pf="active" data-id="${esc(p.id)}"${p.active ? ' checked' : ''}><span>Online</span></label>`}
        <label class="tog"><input type="checkbox" data-pf="best" data-id="${esc(p.id)}"${p.best ? ' checked' : ''}><span>Bestseller</span></label><a class="ibtn" href="#/admin/designer/${esc(p.id)}" title="Felder, Schriften & Farben" aria-label="Personalisierung bearbeiten">${ic('wand')}</a>${SEL.pdel ? '' : `<button class="ibtn" data-a="pdel" data-id="${esc(p.id)}" title="Löschen" aria-label="Löschen">${ic('trash')}</button>`}</div>`).join('') || '<p class="muted">Keine Produkte.</p>'}</div>`);
  };
  A.productEdit = async function (id) {
    const p = ST.product(id); if (!p || p.virtual) return A.products();
    const sold = ST.orders().filter(o => o.status !== 'storniert').reduce((a, o) => a + o.items.filter(i => i.pid === p.id).reduce((x, i) => x + i.qty, 0), 0);
    const L3 = (k, label, rows) => `<div class="grid3">${['de', 'en', 'ar'].map(l => `<label class="fld"><span>${label} ${l.toUpperCase()}</span>${rows ? `<textarea class="in" rows="${rows}" name="${k}_${l}"${l === 'ar' ? ' dir="rtl"' : ''}>${esc((p[k] || {})[l] || '')}</textarea>` : `<input class="in" name="${k}_${l}" value="${esc((p[k] || {})[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}>`}</label>`).join('')}</div>`;
    shell('produkte', `<a class="link back" href="#/admin/produkte">${ic('back')} Produkte</a>
      <div class="a-head"><h1>${esc(L(p.name, AL()))}${p.deleted ? ' <span class="badge st-storniert">gelöscht</span>' : ''}</h1><div class="vbtns"><a class="btn sm" href="#/admin/designer/${esc(p.id)}">${ic('wand')} Fotos, Felder, Schriften & Farben</a><a class="btn ghost sm" href="#/p/${esc(p.id)}?preview=1">${ic('eye')} Im Shop ansehen</a>${p.deleted ? `<button class="btn ghost sm" data-a="prestore" data-id="${esc(p.id)}">${ic('rotateL')} Wiederherstellen</button>` : `<button class="btn ghost sm danger" data-a="pdel" data-id="${esc(p.id)}">${ic('trash')} Löschen</button>`}</div></div>
      <div class="pe-grid"><div class="a-card"><canvas id="pePv"></canvas><p class="muted small">Verkauft: ${sold} · Bestand: ${p.stock} · ${p.views.length} Foto(s)</p><a class="btn ghost sm block" href="#/admin/designer/${esc(p.id)}">${ic('wand')} Wo der Kunde schreibt / Foto einsetzt bearbeiten</a></div>
      <div><form class="a-card pe-form" data-aform="product" data-id="${esc(p.id)}">
        <h2>Texte</h2>${L3('name', 'Name')}${L3('desc', 'Beschreibung', 4)}${L3('mat', 'Material')}${L3('size', 'Größe / Inhalt')}
        <h2 style="margin-top:14px">Preis & Lager</h2>
        <div class="grid4"><label class="fld"><span>Preis €</span><input class="in" type="number" step="0.01" name="price" value="${p.price}"></label><label class="fld"><span>Angebotspreis € <small>(leer = kein Angebot)</small></span><input class="in" type="number" step="0.01" name="salePrice" value="${p.salePrice || ''}"></label><label class="fld"><span>Angebot bis <small>(optional)</small></span><input class="in" type="date" name="saleEnd" value="${esc(p.saleEnd || '')}"></label><label class="fld"><span>Bestand</span><input class="in" type="number" name="stock" value="${p.stock}"></label>
          <label class="fld"><span>Fertigung (Werktage)</span><input class="in" type="number" min="0" max="20" name="prod" value="${p.prod || 2}"></label><label class="fld"><span>MwSt.</span><select class="in" name="tax"><option value="19"${p.tax !== 7 ? ' selected' : ''}>19 %</option><option value="7"${p.tax === 7 ? ' selected' : ''}>7 % (Blumen)</option></select></label>
          <label class="fld"><span>Kategorie</span><select class="in" name="cat">${CAT_EXTRA.cats.map(c => `<option value="${c}"${p.cat === c ? ' selected' : ''}>${t('cat_' + c, null, AL())}</option>`).join('')}</select></label></div>
        <fieldset class="occs"><legend>Anlässe</legend>${CAT_EXTRA.occ.map(o => `<label class="check"><input type="checkbox" name="occ" value="${o}"${(p.occ || []).includes(o) ? ' checked' : ''}><span>${t('occ_' + o, null, AL())}</span></label>`).join('')}</fieldset>
        <div class="row"><label class="check"><input type="checkbox" name="sd"${p.sd ? ' checked' : ''}><span>Am selben Tag möglich (Kurier/Abholung)</span></label><label class="check"><input type="checkbox" name="active"${p.active ? ' checked' : ''}><span>Online</span></label><label class="check"><input type="checkbox" name="best"${p.best ? ' checked' : ''}><span>Bestseller</span></label></div>
        <button class="btn">Speichern</button></form>
      <section class="a-card" id="optEd"></section></div></div>`);
    A.optEditor(p);
    if (p.views.length) await ENG.render($('#pePv'), p, 0, ENG.blankDesign(p), { maxW: 900 });
  };
  /* variants & options: groups with choices (name in 3 languages, extra price, colour, photo) */
  A.optEditor = function (p) {
    const box = $('#optEd'); if (!box) return;
    const OP = JSON.parse(JSON.stringify(p.opts || []));
    for (const o of OP) { o.lab = o.lab || { de: t(o.label, null, 'de'), en: t(o.label, null, 'en'), ar: t(o.label, null, 'ar') }; for (const c of o.choices) { const vi = p.views.findIndex(v => v.when && v.when.opt === o.id && v.when.eq === c.id); if (vi >= 0) c.view = vi; } }
    const thumb = i => p.views[i] ? (p.views[i].thumb || p.views[i].img) : '';
    const draw = () => {
      box.innerHTML = `<h2>Varianten & Optionen <small class="muted">z. B. Farbe, Modell, Größe</small></h2>
        <p class="hint">Jede Wahl kann einen Aufpreis haben und ein eigenes Foto zeigen. Fotos fügst du unter <a href="#/admin/designer/${esc(p.id)}">Fotos & Felder</a> hinzu.</p>
        ${OP.map((o, gi) => `<div class="oe-g"><div class="oe-gh"><div class="grid3">${['de', 'en', 'ar'].map(l => `<input class="in" data-oe="glab" data-g="${gi}" data-l="${l}" value="${esc(o.lab[l] || '')}" placeholder="Name der Option ${l.toUpperCase()}"${l === 'ar' ? ' dir="rtl"' : ''}>`).join('')}</div><button class="ibtn" data-oe="gdel" data-g="${gi}" title="Option löschen">${ic('trash')}</button></div>
          <div class="oe-cs">${o.choices.map((c, ci) => `<div class="oe-c${o.def === c.id ? ' def' : ''}"><div class="oe-img">${c.view != null && thumb(c.view) ? `<img src="${esc(thumb(c.view))}" alt="">` : c.hex ? `<i style="background:${esc(c.hex)}"></i>` : ''}</div>
            <div class="oe-f"><div class="grid3">${['de', 'en', 'ar'].map(l => `<input class="in" data-oe="clab" data-g="${gi}" data-c="${ci}" data-l="${l}" value="${esc((c.l || {})[l] || '')}" placeholder="${l.toUpperCase()}"${l === 'ar' ? ' dir="rtl"' : ''}>`).join('')}</div>
            <div class="oe-row"><label class="mini-f"><span>Aufpreis €</span><input class="in" type="number" step="0.01" data-oe="price" data-g="${gi}" data-c="${ci}" value="${c.price || ''}" placeholder="0"></label>
              <label class="mini-f"><span>Farbe</span><input type="color" data-oe="hex" data-g="${gi}" data-c="${ci}" value="${esc(c.hex || '#ffffff')}"></label>
              <label class="mini-f"><span>Foto</span><select class="in" data-oe="view" data-g="${gi}" data-c="${ci}"><option value="">–</option>${p.views.map((v, i) => `<option value="${i}"${c.view === i ? ' selected' : ''}>Foto ${i + 1}</option>`).join('')}</select></label>
              <label class="tog"><input type="radio" name="def${gi}" data-oe="def" data-g="${gi}" data-c="${ci}"${o.def === c.id ? ' checked' : ''}><span>Standard</span></label>
              <button class="ibtn" data-oe="cdel" data-g="${gi}" data-c="${ci}" title="Wahl löschen">${ic('close')}</button></div></div></div>`).join('')}</div>
          <button class="btn ghost sm" data-oe="cadd" data-g="${gi}">${ic('plus')} Wahl hinzufügen</button></div>`).join('')}
        <div class="vbtns"><button class="btn ghost sm" data-oe="gadd">${ic('plus')} Neue Option (z. B. Farbe)</button><button class="btn sm" data-oe="save">${ic('check')} Varianten speichern</button></div>`;
    };
    draw();
    const at = el => { const g = OP[+el.dataset.g]; const c = g && el.dataset.c != null ? g.choices[+el.dataset.c] : null; return { g, c }; };
    box.oninput = e => { const el = e.target.closest('[data-oe]'); if (!el) return; const { g, c } = at(el); const k = el.dataset.oe;
      if (k === 'glab') g.lab[el.dataset.l] = el.value;
      if (k === 'clab') { c.l = c.l || {}; c.l[el.dataset.l] = el.value; }
      if (k === 'price') { const v = +el.value; if (v) c.price = v; else delete c.price; }
      if (k === 'hex') c.hex = el.value; };
    box.onchange = e => { const el = e.target.closest('[data-oe]'); if (!el) return; const { g, c } = at(el); const k = el.dataset.oe;
      if (k === 'view') { if (el.value === '') delete c.view; else c.view = +el.value; draw(); }
      if (k === 'def') g.def = c.id; };
    box.onclick = e => { const el = e.target.closest('button[data-oe]'); if (!el) return; e.preventDefault(); const { g } = at(el); const k = el.dataset.oe;
      if (k === 'gadd') OP.push({ id: 'o' + ST.uid(''), lab: { de: 'Farbe', en: 'Colour', ar: 'اللون' }, def: 'c1', choices: [{ id: 'c1', l: { de: 'Standard', en: 'Standard', ar: 'عادي' } }] });
      if (k === 'gdel') OP.splice(+el.dataset.g, 1);
      if (k === 'cadd') { const id = 'c' + ST.uid(''); g.choices.push({ id, l: { de: '', en: '', ar: '' } }); if (!g.def) g.def = id; }
      if (k === 'cdel') { g.choices.splice(+el.dataset.c, 1); if (!g.choices.some(c => c.id === g.def)) g.def = (g.choices[0] || {}).id; }
      if (k === 'save') return save();
      draw(); };
    const save = () => {
      const opts = OP.filter(o => o.choices.length).map(o => { const x = { id: o.id, lab: o.lab, label: o.label, def: o.def || o.choices[0].id, choices: o.choices.map(c => { const y = Object.assign({}, c); delete y.view; if (!y.l.en) y.l.en = y.l.de; if (!y.l.ar) y.l.ar = y.l.de; return y; }) }; return x; });
      const views = JSON.parse(JSON.stringify(p.views)); views.forEach(v => delete v.when);
      for (const o of OP) for (const c of o.choices) if (c.view != null && views[c.view]) views[c.view].when = { opt: o.id, eq: c.id };
      // the first photo stays the cover: when it belongs to a variant, it is the default variant's photo
      if (p.custom) ST.saveCustom(Object.assign({}, ST.get('customProducts', []).find(x => x.id === p.id), { opts, views }));
      else ST.saveOverride(p.id, { opts, views });
      ST.log('produkt', 'Varianten gespeichert: ' + L(p.name, AL())); C.toast('Varianten gespeichert ✓'); A.productEdit(p.id);
    };
  };

  /* ---------------- categories ---------------- */
  A.categories = function () {
    const cfg = ST.catCfg() || CAT_EXTRA.cats.map(id => ({ id }));
    const CF = cfg.map(c => ({ id: c.id, l: Object.assign({ de: t('cat_' + c.id, null, 'de'), en: t('cat_' + c.id, null, 'en'), ar: t('cat_' + c.id, null, 'ar') }, c.l || {}), d: Object.assign(['de', 'en', 'ar'].reduce((o, l) => { const v = t('catd_' + c.id, null, l); o[l] = v === 'catd_' + c.id ? '' : v; return o; }, {}), c.d || {}) }));
    const count = id => ST.products(true).filter(p => p.cat === id && !p.deleted && !p.virtual).length;
    const draw = () => {
      shell('kategorien', `<a class="link back" href="#/admin/produkte">${ic('back')} Produkte</a><div class="a-head"><h1>Kategorien <small class="muted">${CF.length}</small></h1><div class="vbtns"><button class="btn ghost sm" data-ce="add">${ic('plus')} Neue Kategorie</button><button class="btn sm" data-ce="save">${ic('check')} Speichern</button></div></div>
        <p class="hint">Reihenfolge = Reihenfolge im Shop. Beim Löschen kommen die Produkte in eine andere Kategorie.</p>
        <div class="ce-list">${CF.map((c, i) => `<div class="a-card ce"><div class="ce-ord"><button class="ibtn" data-ce="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">▲</button><b>${i + 1}</b><button class="ibtn" data-ce="down" data-i="${i}" ${i < CF.length - 1 ? '' : 'disabled'} aria-label="nach unten">▼</button></div>
          <div class="ce-f"><div class="grid3">${['de', 'en', 'ar'].map(l => `<label class="fld"><span>Name ${l.toUpperCase()}</span><input class="in" data-ce="l" data-i="${i}" data-l="${l}" value="${esc(c.l[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}></label>`).join('')}</div>
          <div class="grid3">${['de', 'en', 'ar'].map(l => `<label class="fld"><span>Kurzer Text ${l.toUpperCase()} <small>(optional)</small></span><input class="in" data-ce="d" data-l="${l}" data-i="${i}" value="${esc(c.d[l] || '')}"${l === 'ar' ? ' dir="rtl"' : ''}></label>`).join('')}</div></div>
          <div class="ce-side"><span class="muted small">${count(c.id)} Produkte</span><a class="btn ghost sm" href="#/c/${esc(c.id)}" target="_blank" rel="noopener">${ic('eye')}</a><button class="btn ghost sm danger" data-ce="del" data-i="${i}">${ic('trash')}</button></div></div>`).join('')}</div>`);
      const m = $('#amain');
      m.oninput = e => { const el = e.target.closest('[data-ce]'); if (!el) return; const c = CF[+el.dataset.i]; if (el.dataset.ce === 'l') c.l[el.dataset.l] = el.value; if (el.dataset.ce === 'd') c.d[el.dataset.l || 'de'] = el.value; };
      m.onclick = async e => { const el = e.target.closest('button[data-ce]'); if (!el) return; const i = +el.dataset.i; const k = el.dataset.ce;
        if (k === 'up' && i > 0) { [CF[i - 1], CF[i]] = [CF[i], CF[i - 1]]; draw(); }
        if (k === 'down' && i < CF.length - 1) { [CF[i + 1], CF[i]] = [CF[i], CF[i + 1]]; draw(); }
        if (k === 'add') { const n = await promptText('Neue Kategorie', 'Name (Deutsch)', ''); if (!n || !n.trim()) return; let id = C.norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kat'; while (CF.some(c => c.id === id)) id += '-2'; CF.push({ id, l: { de: n.trim(), en: n.trim(), ar: n.trim() }, d: {} }); draw(); }
        if (k === 'del') { const c = CF[i]; if (CF.length < 2) return; const rest = CF.filter(x => x !== c); const target = await pickCat(`„${c.l.de}“ löschen`, `${count(c.id)} Produkte kommen in:`, rest); if (!target) return; for (const p of ST.products(true).filter(p => p.cat === c.id)) { if (p.custom) ST.saveCustom(Object.assign({}, ST.get('customProducts', []).find(x => x.id === p.id), { cat: target })); else ST.saveOverride(p.id, { cat: target }); } CF.splice(i, 1); save(true); }
        if (k === 'save') save(); };
    };
    const save = quiet => { ST.saveCats(CF.map(c => ({ id: c.id, l: c.l, d: (c.d.de || c.d.ar || c.d.en) ? { de: c.d.de || c.d.ar || c.d.en, en: c.d.en || c.d.de || c.d.ar, ar: c.d.ar || c.d.de || c.d.en } : undefined }))); if (window.SHOP) SHOP.searchIndex = null; ST.log('produkt', 'Kategorien gespeichert'); C.toast('Kategorien gespeichert ✓'); draw(); };
    draw();
  };
  function pickCat(title, label, list) {
    return new Promise(res => { const ov = C.sheet({ title, kind: 'modal' }); ov.body.innerHTML = `<label class="fld"><span>${esc(label)}</span><select class="in" id="pcSel">${list.map(c => `<option value="${esc(c.id)}">${esc(c.l.de)}</option>`).join('')}</select></label>`; ov.foot.innerHTML = `<button class="btn ghost" data-r="0">Abbrechen</button><button class="btn danger" data-r="1">Löschen</button>`; ov.addEventListener('click', e => { const b = e.target.closest('[data-r],[data-act=close]'); if (!b) return; const v = $('#pcSel', ov).value; C.closeAll(); res(b.dataset.r === '1' ? v : null); }); });
  }
  /* new product with a simple engraving/print zone the owner draws on the photo */
  A.newProduct = function () {
    const ov = C.sheet({ title: 'Neues Produkt', kind: 'modal', wide: true });
    const NP = { img: null, w: 0, h: 0, box: null, font: 'greatvibes', fx: 'print', color: '#1c1819' };
    ov.body.innerHTML = `<div class="np"><div class="np-stage" id="npStage"><label class="drop">${ic('camera')}<b>Produktfoto hochladen</b><small>Am besten ohne Text, quadratisch</small><input type="file" accept="image/*" id="npFile"></label></div>
      <form class="np-form" data-aform="pnew"><p class="hint">Nach dem Hochladen: Ziehe auf dem Foto ein Rechteck dorthin, wo der Name stehen soll.</p>
      <label class="fld"><span>Name (Deutsch)</span><input class="in" name="name" required></label><div class="grid2"><label class="fld"><span>Preis €</span><input class="in" type="number" step="0.1" name="price" required></label><label class="fld"><span>Kategorie</span><select class="in" name="cat">${CAT_EXTRA.cats.map(c => `<option value="${c}">${t('cat_' + c, null, AL())}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Beispieltext</span><input class="in" name="def" value="Sophie" id="npDef"></label>
      <div class="grid2"><label class="fld"><span>Technik</span><select class="in" name="fx" id="npFx"><option value="print">Druck</option><option value="engrave">Lasergravur</option><option value="foil">Goldfolie</option><option value="emb">Stickerei</option></select></label>
      <label class="fld"><span>Schrift</span><select class="in" name="font" id="npFont">${['greatvibes', 'allura', 'parisienne', 'pinyon', 'dancing', 'times', 'playfair', 'cinzel', 'montserrat', 'josefin', 'ruqaa', 'amiri'].map(f => `<option value="${f}">${(FONTMETA[f] || {}).label || f}</option>`).join('')}</select></label></div>
      <label class="fld"><span>Textfarbe</span><input class="in" type="color" name="color" value="#1c1819" id="npColor"></label>
      <label class="fld"><span>Breite des Feldes in mm (für die Druckdatei)</span><input class="in" type="number" name="mm" value="80"></label></form></div>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">Abbrechen</button><button class="btn" data-a="pnew-save">Produkt anlegen</button>`;
    A._np = NP;
    const draw = async () => {
      const c = $('#npCv'); if (!c || !NP.img) return;
      const P = A._npProduct(true); await ENG.loadFont(NP.font);
      await ENG.render(c, P, 0, ENG.blankDesign(P), { maxW: 900, force: true });
      if (NP.box) { const x = c.getContext('2d'); const k = c.width / NP.w; const [cx, cy, w, h] = NP.box; x.strokeStyle = '#7b1e3a'; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect((cx - w / 2) * k, (cy - h / 2) * k, w * k, h * k); }
    };
    A._npDraw = draw;
    $('#npFile', ov).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      const r = await ST.readImage(f, 1100); const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
      const im = await ENG.img(url); NP.img = url; NP.w = im.naturalWidth || im.width; NP.h = im.naturalHeight || im.height;
      NP.box = [NP.w / 2, NP.h * .72, NP.w * .5, NP.h * .12, 0];
      $('#npStage', ov).innerHTML = `<canvas id="npCv"></canvas>`;
      const c = $('#npCv', ov); let start = null;
      const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * NP.w, (e.clientY - r.top) / r.height * NP.h]; };
      c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); start = pt(e); });
      c.addEventListener('pointermove', e => { if (!start) return; const q = pt(e); const w = Math.abs(q[0] - start[0]), h = Math.abs(q[1] - start[1]); if (w > 10 && h > 6) { NP.box = [(q[0] + start[0]) / 2, (q[1] + start[1]) / 2, w, h, 0]; draw(); } });
      c.addEventListener('pointerup', () => { start = null; });
      draw();
    });
    ['npDef', 'npFx', 'npFont', 'npColor'].forEach(id => $('#' + id, ov).addEventListener('input', e => { const k = { npDef: 'def', npFx: 'fx', npFont: 'font', npColor: 'color' }[id]; NP[k] = e.target.value; draw(); }));
  };
  A._npProduct = function (preview) {
    const NP = A._np; const f = $('[data-aform=pnew]'); const g = n => f ? f.elements[n].value : '';
    const fx = NP.fx || 'print';
    const colors = fx === 'foil' ? [{ id: 'gold', hex: '#d4af37', foil: 'gold', fx: 'foil', l: { de: 'Gold', en: 'Gold', ar: 'ذهبي' } }, { id: 'silver', hex: '#c9ced3', foil: 'silver', fx: 'foil', l: { de: 'Silber', en: 'Silver', ar: 'فضي' } }, { id: 'rose', hex: '#d8a08c', foil: 'rose', fx: 'foil', l: { de: 'Roségold', en: 'Rose gold', ar: 'ذهبي وردي' } }]
      : [{ id: 'c1', hex: NP.color || '#1c1819', l: { de: 'Wie Vorlage', en: 'As shown', ar: 'كما في الصورة' } }, { id: 'black', hex: '#1c1819', l: { de: 'Schwarz', en: 'Black', ar: 'أسود' } }, { id: 'white', hex: '#f7f5f0', l: { de: 'Weiß', en: 'White', ar: 'أبيض' } }, { id: 'gold', hex: '#c9a24a', l: { de: 'Gold', en: 'Gold', ar: 'ذهبي' } }];
    const name = g('name') || 'Neues Produkt';
    return { id: preview ? '_np' : 'eigen-' + ST.uid(''), cat: g('cat') || 'gravur', occ: ['geburtstag', 'liebe'], price: +g('price') || 29.9, prod: 2, name: { de: name, en: name, ar: name }, desc: { de: '', en: '', ar: '' }, mat: { de: '', en: '', ar: '' }, size: { de: '', en: '', ar: '' }, tax: 19, stock: 25, active: true,
      fields: [{ id: 'name', type: 'text', label: 'f_name', def: NP.def || g('def') || 'Sophie', max: 20, fonts: [NP.font, ...['greatvibes', 'times', 'montserrat', 'ruqaa'].filter(x => x !== NP.font)].slice(0, 5), colors }],
      views: [{ img: NP.img, thumb: NP.img, w: NP.w, h: NP.h, noorig: 1, zones: [{ t: 'text', f: 'name', b: NP.box, fx: { k: fx === 'foil' ? 'foil' : fx, pal: 'gold', alpha: fx === 'engrave' ? .85 : 1 }, mm: +g('mm') || 80 }] }] };
  };

  /* ---------------- customers ---------------- */
  A.customers = function (id) {
    const os = ST.orders();
    const list = ST.customers().map(c => { const mine = os.filter(o => o.cust.id === c.id || o.cust.email === c.email); return Object.assign({}, c, { n: mine.length, sum: ST.round2(mine.filter(o => o.status !== 'storniert').reduce((a, o) => a + o.totals.total, 0)), last: Math.max(0, ...mine.map(o => o.created)) }); }).sort((a, b) => b.last - a.last);
    const cur = id && list.find(c => c.id === id);
    shell('kunden', `<div class="a-head"><h1>Kunden <small class="muted">${list.length}</small></h1><button class="btn ghost sm" data-a="csv-cust">${ic('download')} CSV (nur mit Werbe-Einwilligung)</button></div>
      ${cur ? `<section class="a-card"><h2>${esc(cur.name)}</h2><p>${esc(cur.email)} · ${esc(cur.phone || '–')} · ${cur.guest ? 'Gast' : 'Konto'} · Werbung: ${cur.marketing ? 'ja' : 'nein'}</p><div class="olist">${os.filter(o => o.cust.id === cur.id || o.cust.email === cur.email).map(rowHTML).join('')}</div></section>` : ''}
      <div class="ctable">${list.length ? list.map(c => `<a class="crow2" href="#/admin/kunden/${c.id}"><b>${esc(c.name || '–')}</b><span>${esc(c.email)}</span><span>${c.n} Bestellungen</span><span>${eur(c.sum, AL())}</span><span>${c.guest ? 'Gast' : 'Konto'}${c.marketing ? ' · ✉︎' : ''}</span></a>`).join('') : '<p class="muted">Noch keine Kunden.</p>'}</div>`);
  };

  /* ---------------- discounts & gift cards ---------------- */
  A.discounts = function () {
    const cs = ST.coupons(); const gs = ST.giftcards();
    shell('rabatte', `<div class="a-head"><h1>Rabatte & Gutscheine</h1></div>
      <section class="a-card"><h2>Rabattcodes</h2><div class="ctable">${cs.map((c, i) => `<div class="crow2"><b>${esc(c.code)}</b><span>${c.type === 'pct' ? c.value + ' %' : eur(c.value, AL())}${c.min ? ' ab ' + eur(c.min, AL()) : ''}</span><span>${c.until ? 'bis ' + C.date(c.until, { day: '2-digit', month: '2-digit', year: 'numeric' }, AL()) : 'unbefristet'}</span><span>${c.uses || 0}${c.max ? '/' + c.max : ''} genutzt</span><span class="vbtns"><label class="tog"><input type="checkbox" data-cp="on" data-i="${i}"${c.on ? ' checked' : ''}><span>aktiv</span></label><button class="ibtn" data-a="cp-del" data-i="${i}" aria-label="Löschen">${ic('trash')}</button></span></div>`).join('')}</div>
        <form data-aform="coupon" class="grid5"><label class="fld"><span>Code</span><input class="in" name="code" required placeholder="SOMMER15"></label><label class="fld"><span>Art</span><select class="in" name="type"><option value="pct">Prozent</option><option value="eur">Euro</option></select></label><label class="fld"><span>Wert</span><input class="in" name="value" type="number" step="0.5" required></label><label class="fld"><span>Mindestwert €</span><input class="in" name="min" type="number" value="0"></label><label class="fld"><span>Gültig bis</span><input class="in" name="until" type="date"></label><button class="btn sm">Anlegen</button></form></section>
      <section class="a-card"><h2>Geschenkgutscheine</h2><div class="ctable">${gs.length ? gs.map(g => `<div class="crow2"><b>${esc(g.code)}</b><span>Wert ${eur(g.value, AL())}</span><span>Rest ${eur(g.balance, AL())}</span><span>${esc(g.to || '')} ${g.order ? '· ' + g.order : '· manuell'}</span><span>${C.date(g.created, { day: '2-digit', month: '2-digit', year: 'numeric' }, AL())}</span></div>`).join('') : '<p class="muted">Noch keine Gutscheine verkauft.</p>'}</div>
        <form data-aform="giftcard" class="grid5"><label class="fld"><span>Betrag €</span><input class="in" name="amount" type="number" value="50" required></label><label class="fld"><span>Für (Name)</span><input class="in" name="to"></label><label class="fld"><span>E-Mail</span><input class="in" name="email" type="email"></label><button class="btn sm">Gutschein erstellen</button></form></section>`);
  };

  /* ---------------- reviews & questions ---------------- */
  A.reviews = function () {
    const rv = ST.reviews(); const qs = ST.questions();
    const pn = id => { const p = ST.product(id); return p ? L(p.name, AL()) : id; };
    shell('bewertungen', `<div class="a-head"><h1>Bewertungen & Fragen</h1></div>
      <section class="a-card"><h2>Fragen von Kunden</h2>${qs.length ? qs.map(q => `<div class="qrow"><p><b>${esc(pn(q.pid))}</b> · ${C.ago(q.at)} · ${esc(q.email)}</p><p class="q">${esc(q.text)}</p>${q.answer ? `<p class="a">${esc(q.answer)}</p>` : `<form data-aform="answer" data-id="${q.id}" class="row"><input class="in" name="a" required placeholder="Antwort (wird beim Produkt gezeigt und per E-Mail gesendet)"><button class="btn sm">Antworten</button></form>`}</div>`).join('') : '<p class="muted">Keine Fragen.</p>'}</section>
      <section class="a-card"><h2>Bewertungen</h2>${rv.length ? rv.map(r => `<div class="qrow${r.ok ? '' : ' pending'}"><p><b>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</b> ${esc(pn(r.pid))} · ${esc(r.name)} · ${C.ago(r.at)} ${r.ok ? '<span class="badge st-zugestellt">sichtbar</span>' : '<span class="badge st-neu">wartet</span>'}</p><p>${esc(r.text)}</p>${r.reply ? `<p class="a">${esc(r.reply)}</p>` : ''}
        <div class="vbtns">${r.ok ? `<button class="btn ghost sm" data-a="rv-hide" data-id="${r.id}">Ausblenden</button>` : `<button class="btn sm" data-a="rv-ok" data-id="${r.id}">Freigeben</button>`}<button class="btn ghost sm" data-a="rv-reply" data-id="${r.id}">Antworten</button><button class="ibtn" data-a="rv-del" data-id="${r.id}" aria-label="Löschen">${ic('trash')}</button></div></div>`).join('') : '<p class="muted">Noch keine Bewertungen. Nach jeder Zustellung bittet der Shop automatisch um eine Bewertung.</p>'}</section>`);
  };

  /* ---------------- emails ---------------- */
  A.emails = function (id) {
    const ms = ST.emails(); const cur = ms.find(m => m.id === id);
    shell('emails', `<div class="a-head"><h1>E-Mails</h1><p class="muted">Alle automatisch gesendeten E-Mails (Demo: werden hier angezeigt statt verschickt).</p></div>
      <div class="mb"><ul class="mb-list">${ms.map(m => `<li><a href="#/admin/emails/${m.id}"${cur && cur.id === m.id ? ' aria-current="true"' : ''}><b>${esc(DOCS.mail(m).subject)}</b><small>an ${esc(m.to)} · ${C.ago(m.at)}</small></a></li>`).join('') || '<li class="muted">Noch keine E-Mails.</li>'}</ul>
      <div class="mb-view">${cur ? `<h2>${esc(DOCS.mail(cur).subject)}</h2><p class="muted small">An: ${esc(cur.to)} · ${C.dt(cur.at, AL())} · Sprache: ${cur.lang.toUpperCase()}</p><div class="mailframe">${DOCS.mail(cur).html}</div>` : '<p class="muted">E-Mail auswählen.</p>'}</div></div>`);
  };

  /* ---------------- settings ---------------- */
  A.settings = function () {
    const s = ST.settings(); const sh = s.shipping;
    const f = (n, l, v, type) => `<label class="fld"><span>${l}</span><input class="in" name="${n}" type="${type || 'text'}" value="${esc(v)}"${type === 'number' ? ' step="0.1"' : ''}></label>`;
    shell('einstellungen', `<div class="a-head"><h1>Einstellungen</h1></div>
      <form data-aform="settings" class="settings">
      <section class="a-card"><h2>Laden</h2><div class="grid3">${f('shop.name', 'Name', s.shop.name)}${f('shop.street', 'Straße', s.shop.street)}${f('shop.zip', 'PLZ', s.shop.zip)}${f('shop.city', 'Ort', s.shop.city)}${f('shop.phone', 'Telefon', s.shop.phone)}${f('shop.wa', 'WhatsApp-Nummer', s.shop.wa)}${f('shop.email', 'E-Mail für neue Bestellungen', s.shop.email)}${f('shop.taxId', 'USt-IdNr.', s.shop.taxId)}${f('shop.iban', 'IBAN (Vorkasse)', s.shop.iban)}${f('shop.bank', 'Bank', s.shop.bank)}${f('hours.wd', 'Öffnungszeiten Mo–Sa', s.hours.wd)}${f('hours.sun', 'Sonntag', s.hours.sun)}</div></section>
      <section class="a-card"><h2>Lieferung</h2><div class="grid3">${f('cutoff', 'Bestellschluss für Lieferung am selben Tag', s.cutoff, 'time')}${f('freeFrom', 'Versandkostenfrei ab €', s.freeFrom, 'number')}${f('wrap', 'Geschenkverpackung €', s.wrap, 'number')}
        ${f('shipping.local.price', 'Kurier Hamburg €', sh.local.price, 'number')}${f('shipping.local.zips', 'Kurier-PLZ-Bereiche', sh.local.zips)}${f('shipping.local.windows', 'Zeitfenster (Komma)', sh.local.windows.join(', '))}
        ${f('shipping.dhl.price', 'DHL Deutschland €', sh.dhl.price, 'number')}${f('shipping.dhl.days', 'DHL Laufzeit (Tage)', sh.dhl.days, 'number')}${f('shipping.eu.price', 'DHL EU €', sh.eu.price, 'number')}</div>
        <div class="row">${['pickup', 'local', 'dhl', 'eu'].map(m => `<label class="check"><input type="checkbox" name="shipping.${m}.on"${sh[m].on ? ' checked' : ''}><span>${M_L[m]} anbieten</span></label>`).join('')}</div></section>
      <section class="a-card"><h2>Zahlung & Ablauf</h2><div class="row">${Object.keys(PAY_L).map(k => `<label class="check"><input type="checkbox" name="payments.${k}"${s.payments[k] ? ' checked' : ''}><span>${PAY_L[k]}</span></label>`).join('')}</div>
        <div class="grid3">${f('cancelMinutes', 'Kunde kann stornieren innerhalb (Minuten)', s.cancelMinutes, 'number')}</div>
        <label class="check"><input type="checkbox" name="approvalDefault"${s.approvalDefault ? ' checked' : ''}><span>Design-Freigabe an der Kasse standardmäßig anbieten</span></label>
        <label class="check"><input type="checkbox" name="campaign.on"${s.campaign.on ? ' checked' : ''}><span>Saison-Aktion auf der Startseite (Valentinstag, Muttertag, Ramadan, Weihnachten automatisch)</span></label></section>
      <section class="a-card"><h2>Team</h2><div class="grid3">${staff().map((x, i) => `${f('staff.' + i + '.user', 'Name', x.user)}${f('staff.' + i + '.pin', 'PIN', x.pin)}<label class="fld"><span>Rolle</span><select class="in" name="staff.${i}.role"><option value="owner"${x.role === 'owner' ? ' selected' : ''}>Inhaber (alles)</option><option value="staff"${x.role !== 'owner' ? ' selected' : ''}>Werkstatt</option></select></label>`).join('')}</div></section>
      <div class="vbtns"><button class="btn">Speichern</button><button type="button" class="btn ghost danger" data-a="reset">Demo zurücksetzen</button></div></form>`);
  };
  A.activity = function () {
    const l = ST.get('activity', []);
    shell('aktivitaet', `<div class="a-head"><h1>Aktivität</h1></div><ul class="hist big">${l.map(x => `<li><b>${esc(x.text)}</b><small>${C.dt(x.at, AL())} · ${esc(x.by)}</small></li>`).join('') || '<li class="muted">Noch nichts.</li>'}</ul>`);
  };

  /* ---------------- print file dialog ---------------- */
  const KIND_L = { engrave: 'Lasergravur', glow: 'Leuchtgravur (Laser)', raised: '3D-Buchstaben (Laser/Plotter)', gold3d: 'Goldbuchstaben (Laser/Plotter)', foil: 'Goldfolie (Plotter/Druck)', emb: 'Stickerei', print: 'Druck', photo: 'Fotodruck', 'photo-laser': 'Foto-Lasergravur' };
  A.filesDialog = async function (o, i) {
    const it = o.items[i]; const zs = DOCS.zonesOf(it);
    if (!zs.length) { C.toast('Keine Personalisierung bei diesem Artikel'); return; }
    const kinds = [...new Set(zs.map(x => DOCS.zoneKind(x.z)))];
    const fm = DOCS.formatsFor(zs);
    const ov = C.sheet({ title: 'Dateien für die Produktion', kind: 'modal', wide: true });
    ov.body.innerHTML = `<div class="fd-head"><img src="${esc(it.preview || '')}" alt="" width="84" height="84"><div><b>${it.qty} × ${esc(L(it.name, AL()))}</b><small>${esc(DOCS.linesText(it, AL()))}</small><p class="fd-tech">${ic('wand')} Technik: <b>${kinds.map(k => KIND_L[k] || k).join(' + ')}</b> · ${zs.length} Feld${zs.length > 1 ? 'er' : ''}</p></div></div>
      ${(() => { const p = ST.product(it.pid); const sf = p ? p.fields.filter(f => f.type === 'spotify') : []; return sf.map(f => { const u = ENG.spotifyUri(it.D.f[f.id]); return u ? `<div class="fd rec"><div><b>${ic('wand')} Spotify-Code (Original von Spotify)</b><p>Diese Datei kommt direkt von Spotify und ist garantiert scanbar. SVG für den Laser, PNG für den Druck. Link des Kunden: <a href="https://open.spotify.com/${u.split(':').slice(1).join('/')}" target="_blank" rel="noopener">Song öffnen</a></p></div><div class="vbtns"><a class="btn sm" target="_blank" rel="noopener" href="${esc(ENG.spotifyCodeUrl(u, 'svg').replace('/000000/white/', '/ffffff/black/'))}" download>${ic('download')} SVG</a><a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(ENG.spotifyCodeUrl(u, 'png').replace('/000000/white/', '/ffffff/black/'))}" download>PNG</a></div></div>` : ''; }).join(''); })()}
      <p class="hint">Wähle die Datei für deine Maschine. <b>Empfohlen</b> ist schon passend zu diesem Produkt markiert. Alle Dateien haben die echte Größe in Millimetern.</p>
      <div class="fd-list">${fm.map(f => `<div class="fd${f.rec ? ' rec' : ''}"><div><b>${esc(f.t)}${f.rec ? ' <span class="badge st-zugestellt">Empfohlen</span>' : ''}</b><p>${esc(f.d)}</p></div><button class="btn sm${f.rec ? '' : ' ghost'}" data-a="fdl" data-f="${f.id}" data-no="${o.no}" data-i="${i}">${ic('download')} .${f.ext.toUpperCase()}</button></div>`).join('')}</div>`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">Schließen</button><button class="btn" data-a="fall" data-no="${o.no}" data-i="${i}">${ic('download')} Alle Formate als ZIP</button>`;
  };
  A.navSheet = function () {
    const ov = C.sheet({ title: 'Verwaltung', start: false, foot: false, kind: 'side anav' });
    const open = ST.orders().filter(o => o.status === 'neu').length; const tab = (C.path().split('/')[2] || '');
    ov.body.innerHTML = `<nav class="an-list">${TABS.filter(x => !x[3] || isOwner()).map(([k, i, l]) => `<a href="#/admin${k ? '/' + k : ''}"${k === tab ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${k === 'bestellungen' && open ? `<em>${open}</em>` : ''}</a>`).join('')}</nav>
      <div class="an-foot"><a class="btn ghost block" href="#/">${ic('store')} Shop ansehen</a><button class="btn ghost block" data-a="logout">${ic('logout')} Abmelden (${esc((session() || {}).user || '')})</button></div>`;
  };

  /* ---------------- actions ---------------- */
  const re = () => C.dispatch({ keepScroll: true });
  async function dl(name, blobP) { C.toast('Wird erstellt …'); try { const b = await blobP; if (b) await C.save(name, b); } catch (e) { console.error(e); C.toast('Fehler beim Erstellen', 'err'); } }
  A.onClick = async function (el) {
    const a = el.dataset.a; const no = el.dataset.no; const o = no && ST.order(no); const by = (session() || {}).user || 'admin';
    switch (a) {
      case 'logout': ST.set('adminSession', null); C.go('#/admin'); return;
      case 'of': SEL.of = el.dataset.v; A.orders(); return;
      case 'pcat': SEL.pcat = el.dataset.v; A.products(); return;
      case 'st': {
        if (el.dataset.st === 'zugestellt' && o.pay.status !== 'bezahlt' && o.pay.method === 'cash') { ST.updateOrder(no, x => { x.pay.status = 'bezahlt'; x.pay.at = Date.now(); }); }
        ST.setStatus(no, el.dataset.st, by); C.toast(`${no}: ${ST_L[el.dataset.st]} · Kunde wurde per E-Mail informiert`); re(); return;
      }
      case 'send-proof': {
        const msg = await promptText('Korrekturabzug senden', 'Nachricht an den Kunden (optional)', 'Hier ist die Vorschau deines Designs. Bitte prüfe Schreibweise und Datum.');
        if (msg === null) return;
        const x = ST.updateOrder(no, x => { x.items.forEach(i => { if (i.approval) { i.approval.status = 'offen'; i.approval.token = ST.uid('a'); if (msg) i.approval.comments.push({ by: 'shop', text: msg, at: Date.now() }); } }); });
        if (x.status !== 'freigabe') ST.setStatus(no, 'freigabe', by, 'Korrekturabzug gesendet');
        ST.sendMail('approval', ST.order(no), { msg, token: x.items.find(i => i.approval).approval.token });
        C.toast('Vorschau wurde an den Kunden geschickt'); re(); return;
      }
      case 'ship': {
        const code = await promptText('Versenden', 'DHL-Sendungsnummer', '00340434' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0'));
        if (!code) return;
        ST.updateOrder(no, x => { x.tracking = { code: code.trim(), carrier: 'DHL', at: Date.now() }; });
        ST.setStatus(no, 'unterwegs', by, 'Sendung ' + code.trim()); C.toast('Versendet · Kunde hat die Sendungsnummer bekommen'); re(); return;
      }
      case 'paid': ST.updateOrder(no, x => { x.pay.status = 'bezahlt'; x.pay.at = Date.now(); }); ST.issueGiftcardsFor(ST.order(no)); ST.log('zahlung', `${no} als bezahlt markiert`, by); re(); return;
      case 'cancel': if (await C.confirm(`${no} wirklich stornieren? Der Kunde wird informiert, Bestand und Gutschein werden zurückgebucht.`, 'Stornieren', 'Zurück')) { ST.cancelOrder(no, by, 'vom Shop'); re(); } return;
      case 'cmp-done': ST.updateOrder(no, x => { x.complaints[+el.dataset.k].done = true; }); re(); return;
      case 'files': return A.filesDialog(o, +el.dataset.i);
      case 'fdl': { const fmt = el.dataset.f; const i = +el.dataset.i; el.disabled = true; const old = el.innerHTML; el.innerHTML = '<span class="spin"></span>'; try { const fs = await DOCS.makeFiles(o, i, fmt); if (!fs.length) { C.toast('Für dieses Produkt nicht nötig'); } else if (fs.length === 1) await C.save(fs[0].name, fs[0].blob); else { const JSZip = await C.zip(); const z = new JSZip(); fs.forEach(f => z.file(f.name, f.blob)); await C.save(`${o.no}_${i + 1}_${fmt}.zip`, await z.generateAsync({ type: 'blob' })); } ST.log('datei', `${o.no}: ${fmt.toUpperCase()} heruntergeladen`, (session() || {}).user); } catch (e) { console.error(e); C.toast('Fehler beim Erstellen', 'err'); } el.disabled = false; el.innerHTML = old; return; }
      case 'fall': { const i = +el.dataset.i; const JSZip = await C.zip(); const z = new JSZip(); for (const f of DOCS.formatsFor(DOCS.zonesOf(o.items[i]))) for (const x of await DOCS.makeFiles(o, i, f.id)) z.file(x.name, x.blob); return dl(`${o.no}_${i + 1}_alle-Dateien.zip`, z.generateAsync({ type: 'blob' })); }
      case 'anav': return A.navSheet();
      case 'boxcard': return dl(`${o.no}_Grusskarte.png`, BOX.cardBlob(o.items[+el.dataset.i]));
      case 'zip': return dl(`${no}.zip`, DOCS.orderZip(o));
      case 'pdf': { const k = el.dataset.k; const m = { sheet: [`${no}_Produktion.pdf`, () => DOCS.sheet([o])], invoice: [`${o.invoice}.pdf`, () => DOCS.invoice(o)], note: [`${no}_Lieferschein.pdf`, () => DOCS.deliveryNote(o)], label: [`${no}_Etikett.pdf`, () => DOCS.label(o)] }[k]; return dl(m[0], m[1]()); }
      case 'dayzip': { const os = ST.orders().filter(x => x.status === 'produktion'); if (!os.length) { C.toast('Keine Aufträge in Produktion'); return; } return dl(`Druckdateien_${today()}.zip`, DOCS.dayZip(os, today())); }
      case 'daysheet': { const os = ST.orders().filter(x => ['neu', 'freigabe', 'produktion'].includes(x.status)); if (!os.length) return; return dl(`Produktion_${today()}.pdf`, DOCS.sheet(os)); }
      case 'labels': { const os = ST.orders().filter(x => x.status === 'bereit' && ['dhl', 'eu', 'local'].includes(x.ship.method)); if (!os.length) { C.toast('Keine Etiketten nötig'); return; } const JSZip = await C.zip(); const z = new JSZip(); for (const x of os) z.file(x.no + '_Etikett.pdf', await DOCS.label(x)); return dl(`Etiketten_${today()}.zip`, z.generateAsync({ type: 'blob' })); }
      case 'big': { const it = o.items[+el.dataset.i]; const p = ST.product(it.pid); const ov = C.sheet({ title: L(it.name, AL()), kind: 'modal', wide: true, foot: false }); ov.body.innerHTML = '<div class="zoomwrap"><canvas id="bigCv"></canvas></div>'; await ENG.render($('#bigCv', ov), p, 0, it.D, { maxW: 1800, force: true }); return; }
      case 'edit-item': return editItem(o, +el.dataset.i);
      case 'csv': return dl(`Bestellungen_${today()}.csv`, Promise.resolve(new Blob(['﻿' + ['Nr;Datum;Status;Kunde;E-Mail;Telefon;Versand;Fällig;Summe;Zahlung;Artikel', ...ST.orders().map(o => [o.no, C.dt(o.created, 'de'), ST_L[o.status], o.cust.name, o.cust.email, o.cust.phone, M_L[o.ship.method], o.ship.date, String(o.totals.total).replace('.', ','), PAY_L[o.pay.method] + ' ' + o.pay.status, o.items.map(i => i.qty + 'x ' + L(i.name, 'de') + ' [' + DOCS.linesText(i, 'de') + ']').join(' | ')].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))].join('\n')], { type: 'text/csv' })));
      case 'csv-cust': return dl(`Kunden_Werbung_${today()}.csv`, Promise.resolve(new Blob(['﻿' + ['Name;E-Mail;Telefon', ...ST.customers().filter(c => c.marketing).map(c => [c.name, c.email, c.phone].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(';'))].join('\n')], { type: 'text/csv' })));
      case 'pnew': C.go('#/admin/designer/neu'); return;
      case 'pnew-save': { if (!A._np || !A._np.img) { C.toast('Bitte zuerst ein Foto hochladen', 'err'); return; } const f = $('[data-aform=pnew]'); if (!f.elements.name.value.trim() || !f.elements.price.value) { C.toast('Name und Preis fehlen', 'err'); return; } const p = A._npProduct(false); ST.saveCustom(p); ST.log('produkt', 'Neues Produkt: ' + p.name.de); C.closeAll(); C.toast('Produkt angelegt'); C.go('#/admin/produkte/' + p.id); return; }
      case 'pdel': { const p = ST.product(el.dataset.id); if (await C.confirm(`„${L(p.name, AL())}“ löschen? Es verschwindet aus dem Shop.${p.custom ? '' : ' Du kannst es unter „Gelöscht“ wiederherstellen.'}`, 'Löschen', 'Zurück')) { ST.deleteProduct(el.dataset.id); if (SHOP.searchIndex) SHOP.searchIndex = null; ST.log('produkt', 'Gelöscht: ' + L(p.name, AL())); C.toast('Gelöscht'); C.go('#/admin/produkte'); C.dispatch({ keepScroll: true }); } return; }
      case 'prestore': ST.restoreProduct(el.dataset.id); C.toast('Wiederhergestellt'); C.dispatch({ keepScroll: true }); return;
      case 'pdelview': SEL.pdel = !SEL.pdel; A.products(); return;
      case 'cp-del': { const l = ST.coupons(); l.splice(+el.dataset.i, 1); ST.saveCoupons(l); re(); return; }
      case 'rv-ok': case 'rv-hide': case 'rv-del': { let l = ST.get('reviews', []); const r = l.find(x => x.id === el.dataset.id); if (a === 'rv-del') l = l.filter(x => x !== r); else { r.ok = a === 'rv-ok'; r.hidden = a === 'rv-hide'; } ST.setReviews(l); re(); return; }
      case 'rv-reply': { const txt = await promptText('Antwort auf Bewertung', 'Antwort (öffentlich sichtbar)', ''); if (!txt) return; const l = ST.get('reviews', []); l.find(x => x.id === el.dataset.id).reply = txt; ST.setReviews(l); re(); return; }
      case 'reset': if (await C.confirm('Alle Demo-Daten (Bestellungen, Kunden, E-Mails, Einstellungen) löschen?', 'Zurücksetzen', 'Abbrechen')) { ST.resetDemo(); ST.seed(); C.go('#/admin'); location.reload(); } return;
    }
  };
  function promptText(title, label, val) {
    return new Promise(res => {
      const ov = C.sheet({ title, kind: 'modal' });
      ov.body.innerHTML = `<label class="fld"><span>${esc(label)}</span><textarea class="in" rows="3" id="ptx">${esc(val || '')}</textarea></label>`;
      ov.foot.innerHTML = `<button class="btn ghost" data-r="0">Abbrechen</button><button class="btn" data-r="1">OK</button>`;
      ov.addEventListener('click', e => { const b = e.target.closest('[data-r],[data-act=close]'); if (!b) return; const v = $('#ptx', ov).value; C.closeAll(); res(b.dataset.r === '1' ? v : null); });
    });
  }
  function editItem(o, i) {
    const it = o.items[i]; const p = ST.product(it.pid);
    const fs = p.fields.filter(f => ['text', 'textarea', 'date'].includes(f.type));
    if (!fs.length) { C.toast('Keine Textfelder'); return; }
    const ov = C.sheet({ title: 'Text korrigieren · ' + L(it.name, AL()), kind: 'modal' });
    ov.body.innerHTML = `<p class="muted small">Zum Beispiel nach Rückmeldung des Kunden. Die Vorschau und die Druckdateien werden neu erstellt.</p>${fs.map(f => `<label class="fld"><span>${t(f.label, null, AL())}</span>${f.type === 'textarea' ? `<textarea class="in" data-ef="${f.id}" rows="3">${esc(it.D.f[f.id] != null ? it.D.f[f.id] : f.def)}</textarea>` : `<input class="in" data-ef="${f.id}" type="${f.type === 'date' ? 'date' : 'text'}" value="${esc(it.D.f[f.id] != null ? it.D.f[f.id] : f.def)}">`}</label>`).join('')}`;
    ov.foot.innerHTML = `<button class="btn ghost" data-act="close">Abbrechen</button><button class="btn" id="efSave">Speichern</button>`;
    $('#efSave', ov).addEventListener('click', async () => {
      const D = JSON.parse(JSON.stringify(it.D)); $$('[data-ef]', ov).forEach(x => D.f[x.dataset.ef] = x.value);
      const c = ENG.canvas(10, 10); await ENG.render(c, p, 0, D, { maxW: 420, force: true });
      ST.updateOrder(o.no, x => { x.items[i].D = D; x.items[i].preview = c.toDataURL('image/jpeg', .8); x.notes = (x.notes || []).concat([{ by: (session() || {}).user, at: Date.now(), text: `Text bei Artikel ${i + 1} korrigiert` }]); });
      C.closeAll(); C.toast('Gespeichert'); re();
    });
  }
  A.onInput = function (el) {
    if (el.dataset.ain === 'oq') { SEL.q = el.value; clearTimeout(A._t); A._t = setTimeout(() => { const box = $('#olist'); A.orders(); const i = $('[data-ain=oq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); return true; }
    if (el.dataset.ain === 'pq') { SEL.pq = el.value; clearTimeout(A._t); A._t = setTimeout(() => { A.products(); const i = $('[data-ain=pq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); return true; }
    return false;
  };
  A.onChange = function (el) {
    if (el.dataset.pf) { const k = el.dataset.pf; const v = el.type === 'checkbox' ? el.checked : (k === 'salePrice' && !el.value ? null : +el.value); ST.saveOverride(el.dataset.id, { [k]: v }); ST.log('produkt', `${el.dataset.id}: ${k} → ${v}`); C.toast('Gespeichert'); if (el.type === 'checkbox') el.closest('.prow').classList.toggle('off', k === 'active' && !v); return true; }
    if (el.dataset.cp) { const l = ST.coupons(); l[+el.dataset.i].on = el.checked; ST.saveCoupons(l); return true; }
    return false;
  };
  A.onSubmit = async function (f) {
    const k = f.dataset.aform; const fd = new FormData(f); const g = n => (fd.get(n) || '').toString().trim(); const by = (session() || {}).user;
    if (k === 'login') { const lk = ST.get('adminLock', { n: 0, until: 0 }); if (lk.until > Date.now()) { C.toast('Zu viele Versuche – bitte ' + Math.ceil((lk.until - Date.now()) / 1000) + ' s warten', 'err'); return; } const u = staff().find(s => s.user === g('user')); if (!u || u.pin !== g('pin')) { lk.n = (lk.n || 0) + 1; if (lk.n >= 5) { lk.until = Date.now() + 60e3; lk.n = 0; } ST.set('adminLock', lk); C.toast('PIN falsch', 'err'); return; } ST.set('adminLock', { n: 0, until: 0 }); ST.set('adminSession', { user: u.user, role: u.role, at: Date.now() }); ST.log('login', 'Angemeldet', u.user); C.dispatch(); return; }
    if (k === 'note') { ST.updateOrder(f.dataset.no, o => { o.notes = (o.notes || []).concat([{ by, at: Date.now(), text: g('text') }]); }); re(); return; }
    if (k === 'product') {
      const id = f.dataset.id; const p = ST.product(id);
      const patch = { name: { de: g('name_de'), en: g('name_en'), ar: g('name_ar') }, desc: { de: g('desc_de'), en: g('desc_en'), ar: g('desc_ar') }, mat: { de: g('mat_de'), en: g('mat_en'), ar: g('mat_ar') }, size: { de: g('size_de'), en: g('size_en'), ar: g('size_ar') }, price: +g('price'), salePrice: g('salePrice') ? +g('salePrice') : null, saleEnd: g('saleEnd'), stock: +g('stock'), prod: +g('prod'), tax: +g('tax'), cat: g('cat'), occ: fd.getAll('occ'), sd: !!fd.get('sd'), active: !!fd.get('active'), best: !!fd.get('best') };
      if (p.custom) { ST.saveCustom(Object.assign({}, ST.get('customProducts', []).find(x => x.id === id), patch)); } else ST.saveOverride(id, patch);
      if (SHOP.searchIndex) SHOP.searchIndex = null;
      ST.log('produkt', 'Bearbeitet: ' + patch.name.de, by); C.toast('Gespeichert'); re(); return;
    }
    if (k === 'coupon') { const l = ST.coupons(); const code = g('code').toUpperCase().replace(/\s/g, ''); if (l.some(c => c.code === code)) { C.toast('Code existiert schon', 'err'); return; } l.push({ code, type: g('type'), value: +g('value'), min: +g('min') || 0, until: g('until'), uses: 0, max: 0, on: true }); ST.saveCoupons(l); ST.log('rabatt', 'Rabattcode ' + code, by); re(); return; }
    if (k === 'giftcard') { const gs = ST.giftcards(); const code = ST.newGiftcardCode(); const amt = +g('amount'); gs.push({ code, value: amt, balance: amt, created: Date.now(), order: '', to: g('to'), toEmail: g('email'), msg: '', from: ST.settings().shop.name, log: [] }); ST.saveGiftcards(gs); if (g('email')) ST.sendMail('giftcard', null, { code, amount: amt, to: g('to'), toEmail: g('email'), from: ST.settings().shop.name }); ST.log('gutschein', 'Gutschein ' + code + ' erstellt', by); C.toast('Gutschein ' + code); re(); return; }
    if (k === 'answer') { const l = ST.get('questions', []); const q = l.find(x => x.id === f.dataset.id); q.answer = g('a'); q.answeredAt = Date.now(); ST.setQuestions(l); const p = ST.product(q.pid); ST.sendMail('answer', null, { toEmail: q.email, q: q.text, a: q.answer, product: p ? L(p.name, q.lang || AL()) : '' }); const em = ST.emails(); if (em[0]) { em[0].lang = q.lang || 'de'; ST.set('emails', em); } re(); return; }
    if (k === 'settings') {
      const s = ST.settings(); const set = (path, v) => { const ks = path.split('.'); let x = s; while (ks.length > 1) { const kk = ks.shift(); if (x[kk] == null) x[kk] = /^\d+$/.test(ks[0]) ? [] : {}; x = x[kk]; } x[ks[0]] = v; };
      if (!s.staff) s.staff = JSON.parse(JSON.stringify(DEF_STAFF));
      for (const el of f.elements) { if (!el.name) continue; let v = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'number') v = +v; if (el.name === 'shipping.local.windows') v = String(v).split(',').map(x => x.trim()).filter(Boolean); set(el.name, v); }
      ST.saveSettings(s); ST.log('einstellungen', 'Einstellungen gespeichert', by); C.toast('Gespeichert'); re(); return;
    }
  };

  /* new-order alert while the admin is open */
  A.ping = function (m) {
    if (!C.path().startsWith('/admin') || !session()) return;
    C.toast('🔔 ' + DOCS.mail(m).subject);
    try { const ac = new (window.AudioContext || window.webkitAudioContext)(); [0, .18].forEach((d, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = i ? 1046 : 784; g.gain.setValueAtTime(.0001, ac.currentTime + d); g.gain.exponentialRampToValueAtTime(.2, ac.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d + .35); o.connect(g).connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + .4); }); } catch (e) { }
    re();
  };
})();
