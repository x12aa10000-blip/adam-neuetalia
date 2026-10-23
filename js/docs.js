/* Emails (rendered HTML), PDFs (invoice, delivery note, shipping label, production sheet) and print files. */
(function () {
  'use strict';
  const DOCS = {};
  window.DOCS = DOCS;

  /* ---------------- design summary of a cart/order item ---------------- */
  DOCS.lines = function (it, lang) {
    const p = ST.product(it.pid); if (!p) return [];
    const D = it.D || {}; const out = [];
    if (p.id === 'geschenkbox' && window.BOX) return BOX.lines(it, lang);
    if (D.boxOf) out.push([t('box_in', null, lang), '✓']);
    if (p.id === 'gutschein') {
      if (D.f.to) out.push([t('gc_to', null, lang), D.f.to]);
      if (D.f.toEmail) out.push([t('email', null, lang), D.f.toEmail]);
      return out;
    }
    for (const o of (p.opts || [])) { const v = (D.opt && D.opt[o.id]) || o.def; const c = o.choices.find(c => c.id === v); if (c) out.push([t(o.label, null, lang), L(c.l, lang)]); }
    for (const f of p.fields) {
      if (f.show) { const o = (p.opts || []).find(o => o.id === f.show.opt); const v = (D.opt && D.opt[f.show.opt]) || (o && o.def); if (f.show.gte != null && +v < f.show.gte) continue; }
      if (f.type === 'photo') { const ph = D.ph && D.ph[f.id]; if (ph && ph.src) out.push([t(f.label, null, lang), '✓ ' + t('photo_ok_short', null, lang)]); continue; }
      let v = D.f[f.id] != null ? D.f[f.id] : f.def; if (v == null || v === '') continue;
      if (f.type === 'date') v = C.date(v, { day: '2-digit', month: '2-digit', year: 'numeric' }, lang);
      if (f.type === 'stone') { const c = (f.choices || []).find(c => c.id === v); v = c ? L(c.l, lang) : v; }
      let extra = [];
      if (!f.sf && D.font && D.font[f.id] && f.fonts && f.fonts.length > 1) extra.push((window.FONTMETA[D.font[f.id]] || {}).label || D.font[f.id]);
      if (!f.sf && f.colors) { const c = f.colors.find(c => c.id === (D.color[f.id] || f.colors[0].id)); if (c && D.color[f.id]) extra.push(L(c.l, lang)); }
      if (D.size && D.size[f.id] && Math.abs(D.size[f.id] - 1) > .001) extra.push(Math.round(D.size[f.id] * 100) + ' %');
      out.push([t(f.label, null, lang), String(v).replace(/\n/g, ' / ') + (extra.length ? ' (' + extra.join(', ') + ')' : '')]);
    }
    return out;
  };
  DOCS.linesText = (it, lang) => DOCS.lines(it, lang).map(([a, b]) => a + ': ' + b).join(' · ');

  /* ---------------- emails ---------------- */
  const methodName = (m, lang) => t('m_' + m, null, lang);
  const trackUrl = code => 'https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=' + encodeURIComponent(code || '');
  DOCS.trackUrl = trackUrl;
  const btn = (href, label) => `<p style="margin:26px 0"><a href="${href}" style="display:inline-block;background:#1c1819;color:#f6f3ef;padding:14px 24px;text-decoration:none;font-weight:500">${esc(label)}</a></p>`;
  function itemsTable(o, lang, hidePrices) {
    return `<table style="width:100%;border-collapse:collapse;margin:18px 0">${o.items.map(it => `<tr><td style="padding:10px 0;width:76px;vertical-align:top"><img src="${esc(it.preview || '')}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;background:#eee"></td>
      <td style="padding:10px 12px;vertical-align:top"><b>${esc(L(it.name, lang))}</b><br><span style="color:#5d5558;font-size:14px">${esc(DOCS.linesText(it, lang))}</span><br><span style="color:#5d5558;font-size:14px">${t('qty', null, lang)}: ${it.qty}</span></td>
      ${hidePrices ? '' : `<td style="padding:10px 0;vertical-align:top;text-align:end;white-space:nowrap">${eur(it.unit * it.qty, lang)}</td>`}</tr>`).join('')}</table>`;
  }
  function totalsTable(o, lang) {
    const T = o.totals; const r = (a, b, strong) => `<tr><td style="padding:3px 0;${strong ? 'font-weight:600' : 'color:#5d5558'}">${a}</td><td style="padding:3px 0;text-align:end;${strong ? 'font-weight:600' : ''}">${b}</td></tr>`;
    return `<table style="width:100%;border-collapse:collapse;margin:6px 0 18px">${r(t('subtotal', null, lang), eur(T.sub, lang))}${r(t('shipping', null, lang) + ' · ' + methodName(o.ship.method, lang), T.ship ? eur(T.ship, lang) : t('free', null, lang))}${T.wrap ? r(t('gift_wrap', null, lang), eur(T.wrap, lang)) : ''}${T.discount ? r(t('discount', null, lang) + ' ' + esc(o.coupon), '−' + eur(T.discount, lang)) : ''}${T.gift ? r(t('giftcard', null, lang), '−' + eur(T.gift, lang)) : ''}${r(t('total', null, lang), eur(T.total, lang), true)}</table>`;
  }
  function when(o, lang) {
    const d = C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' }, lang);
    if (o.ship.method === 'pickup') return t('ml_when_pickup', { d }, lang);
    if (o.ship.method === 'local') return t('ml_when_local', { d, w: o.ship.window || '' }, lang);
    return t('ml_when_ship', { d }, lang);
  }
  DOCS.mail = function (m) {
    const o = m.no ? ST.order(m.no) : null; const lang = m.lang || 'de'; const s = ST.settings(); const x = m.extra || {};
    const name = o ? (o.cust.name || '').replace(/^Beispiel:\s*/, '').split(' ')[0] : '';
    const hi = name ? t('ml_hi', { n: esc(name) }, lang) : t('ml_hi0', null, lang);
    const trackHref = o ? `#/verfolgen/${o.no}?e=${encodeURIComponent(o.cust.email)}` : '#/verfolgen';
    let subject = '', body = '';
    switch (m.tpl) {
      case 'confirm':
        subject = t('ml_confirm_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_confirm_p', null, lang)}</p><p><b>${esc(when(o, lang))}</b></p>${itemsTable(o, lang)}${totalsTable(o, lang)}
          ${o.pay.method === 'vorkasse' && o.pay.status !== 'bezahlt' ? `<p style="background:#f1ebe6;padding:14px 16px">${t('ml_bank', { total: eur(o.totals.total, lang), iban: esc(s.shop.iban), bank: esc(s.shop.bank), no: o.no }, lang)}</p>` : ''}
          ${o.approval ? `<p>${t('ml_confirm_proof', null, lang)}</p>` : ''}<p>${t('ml_confirm_cancel', { min: s.cancelMinutes }, lang)}</p>${btn(trackHref, t('ml_track_btn', null, lang))}`;
        break;
      case 'owner_new':
        subject = `Neue Bestellung ${o.no} · ${eur(o.totals.total, 'de')}`;
        body = `<p>Neue Bestellung von <b>${esc(o.cust.name)}</b> (${esc(o.cust.email)}, ${esc(o.cust.phone || '–')}).</p><p><b>${esc(methodName(o.ship.method, 'de'))}</b> · fällig ${C.date(o.ship.date, null, 'de')}${o.ship.window ? ' · ' + esc(o.ship.window) : ''}${o.approval ? ' · <b>Freigabe gewünscht</b>' : ''}</p>${itemsTable(o, 'de')}${totalsTable(o, 'de')}${btn('#/admin/o/' + o.no, 'Im Admin öffnen')}`;
        break;
      case 'approval':
        subject = t('ml_appr_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_appr_p', null, lang)}</p>${itemsTable({ items: o.items.filter(i => i.approval) }, lang, true)}${x.msg ? `<p style="background:#f1ebe6;padding:14px 16px">${esc(x.msg)}</p>` : ''}${btn(`#/freigabe/${o.no}/${x.token || (o.items.find(i => i.approval) || {}).approval.token}`, t('ml_appr_btn', null, lang))}<p style="color:#5d5558;font-size:14px">${t('ml_appr_note', null, lang)}</p>`;
        break;
      case 'production':
        subject = t('ml_prod_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_prod_p', null, lang)}</p><p><b>${esc(when(o, lang))}</b></p>${btn(trackHref, t('ml_track_btn', null, lang))}`;
        break;
      case 'ready_pickup':
        subject = t('ml_rp_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_rp_p', null, lang)}</p><p style="background:#f1ebe6;padding:14px 16px"><b>${esc(s.shop.name)}</b><br>${esc(s.shop.street)}, ${esc(s.shop.zip)} ${esc(s.shop.city)}<br>${t('mon_sat', null, lang)} ${esc(s.hours.wd)} · ${t('sunday', null, lang)} ${esc(s.hours.sun)}</p><p>${t('ml_rp_bring', { no: o.no }, lang)}</p>${o.pay.status !== 'bezahlt' ? `<p>${t('ml_pay_at_pickup', { total: eur(o.totals.total, lang) }, lang)}</p>` : ''}`;
        break;
      case 'ready_local':
        subject = t('ml_rl_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_rl_p', { d: C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' }, lang), w: o.ship.window || '' }, lang)}</p>${btn(trackHref, t('ml_track_btn', null, lang))}`;
        break;
      case 'ready_ship':
        subject = t('ml_rs_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_rs_p', null, lang)}</p>${btn(trackHref, t('ml_track_btn', null, lang))}`;
        break;
      case 'shipped':
        subject = t('ml_sh_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_sh_p', { d: C.date(o.ship.date, { weekday: 'long', day: 'numeric', month: 'long' }, lang) }, lang)}</p>${o.tracking ? `<p>${t('tracking_no', null, lang)}: <b>${esc(o.tracking.code)}</b> (${esc(o.tracking.carrier || 'DHL')})</p>${btn(trackUrl(o.tracking.code), t('ml_sh_btn', null, lang))}` : btn(trackHref, t('ml_track_btn', null, lang))}`;
        break;
      case 'delivered':
        subject = t('ml_dl_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_dl_p', null, lang)}</p>${btn(trackHref + '&review=1', t('ml_dl_btn', null, lang))}<p style="color:#5d5558;font-size:14px">${t('ml_dl_help', null, lang)}</p>`;
        break;
      case 'cancelled':
        subject = t('ml_cx_s', { no: o.no }, lang);
        body = `<p>${hi}</p><p>${t('ml_cx_p', null, lang)}</p>${o.pay.status === 'erstattet' ? `<p>${t('ml_cx_refund', { total: eur(o.totals.total, lang) }, lang)}</p>` : ''}`;
        break;
      case 'giftcard':
        subject = t('ml_gc_s', { from: esc(x.from || s.shop.name) }, lang);
        body = `<p>${x.to ? t('ml_hi', { n: esc(x.to) }, lang) : t('ml_hi0', null, lang)}</p><p>${t('ml_gc_p', { from: esc(x.from || ''), amount: eur(x.amount, lang) }, lang)}</p>${x.msg ? `<p style="font-family:Georgia,serif;font-style:italic;font-size:19px">„${esc(x.msg)}“</p>` : ''}<p style="background:#1c1819;color:#f6f3ef;padding:18px;text-align:center;font-size:22px;letter-spacing:.06em">${esc(x.code)}<br><span style="font-size:15px;letter-spacing:0">${eur(x.amount, lang)}</span></p><p>${t('ml_gc_use', null, lang)}</p>${btn('#/', t('ml_gc_btn', null, lang))}`;
        break;
      case 'answer':
        subject = t('ml_ans_s', null, lang);
        body = `<p>${t('ml_hi0', null, lang)}</p><p>${t('ml_ans_p', { p: esc(x.product || '') }, lang)}</p><p style="color:#5d5558">„${esc(x.q || '')}“</p><p style="background:#f1ebe6;padding:14px 16px">${esc(x.a || '')}</p>`;
        break;
      case 'complaint':
        subject = `Reklamation zu ${o.no}`;
        body = `<p><b>${esc(o.cust.name)}</b> meldet ein Problem:</p><p style="background:#f1ebe6;padding:14px 16px">${esc(x.text || '')}</p>${btn('#/admin/o/' + o.no, 'Im Admin öffnen')}`;
        break;
      case 'approved':
        subject = `${o.no}: Kunde hat das Design ${x.ok ? 'freigegeben' : 'nicht freigegeben'}`;
        body = `<p>${x.ok ? 'Das Design wurde freigegeben. Die Bestellung kann in die Produktion.' : 'Der Kunde wünscht eine Änderung:'}</p>${x.msg ? `<p style="background:#f1ebe6;padding:14px 16px">${esc(x.msg)}</p>` : ''}${btn('#/admin/o/' + o.no, 'Im Admin öffnen')}`;
        break;
      default: subject = m.tpl; body = '';
    }
    const html = `<div style="background:#efeae5;padding:22px 12px;font-family:Jost,'ui-sans','ui-ar',Arial,sans-serif;color:#1c1819;font-size:16px;line-height:1.55" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <div style="max-width:560px;margin:0 auto;background:#fff;padding:28px 26px">
        <div style="font-family:'ui-serif',Georgia,serif;font-size:26px;margin-bottom:18px">Adam &amp; Neuetalia</div>${body}
        <p style="margin-top:28px;color:#5d5558;font-size:13px;border-top:0">${esc(s.shop.name)} · ${esc(s.shop.street)} · ${esc(s.shop.zip)} ${esc(s.shop.city)} · ${esc(s.shop.phone)}</p>
      </div></div>`;
    return { subject, html };
  };

  /* ---------------- PDFs ---------------- */
  async function fontsReady() { try { await Promise.all(['400 16px ui-sans', '500 16px ui-sans', '500 16px ui-serif', '400 16px ui-ar'].map(f => document.fonts.load(f))); } catch (e) { } }
  const SHOPHEAD = (d, s) => {
    d.font(20, 500, '"ui-serif", serif').text('Adam & Neuetalia', 18, 24);
    d.font(8.5).text(`${s.shop.street} · ${s.shop.zip} ${s.shop.city} · ${s.shop.phone} · ${s.shop.email}`, 18, 30, { color: '#5d5558' });
  };
  const FOOT = (d, s) => { d.font(7.5).text(`${s.shop.owner} · ${s.shop.street}, ${s.shop.zip} ${s.shop.city} · USt-IdNr. ${s.shop.taxId} · ${s.shop.bank} · IBAN ${s.shop.iban}`, 105, 287, { align: 'center', color: '#5d5558' }); };
  const addrLines = a => a ? [a.name, a.street, `${a.zip} ${a.city}`, a.country && a.country !== 'DE' ? a.country : ''].filter(Boolean) : [];

  DOCS.invoice = async function (o) {
    await fontsReady(); const s = ST.settings(); const lang = 'de';
    const d = C.Doc(210, 297, 150); SHOPHEAD(d, s);
    let y = 52; addrLines(o.bill || (o.ship.addr) || { name: o.cust.name }).forEach(l => { d.font(10.5).text(l, 18, y); y += 5.2; });
    d.font(9.5);[['Rechnungsnr.', o.invoice], ['Bestellnr.', o.no], ['Rechnungsdatum', C.date(o.created, { day: '2-digit', month: '2-digit', year: 'numeric' }, lang)], ['Leistungsdatum', C.date(o.ship.date, { day: '2-digit', month: '2-digit', year: 'numeric' }, lang)]].forEach(([a, b], i) => { d.text(a, 130, 52 + i * 5.2, { color: '#5d5558' }); d.text(b, 192, 52 + i * 5.2, { align: 'right' }); });
    y = 86; d.font(17, 500, '"ui-serif", serif').text('Rechnung', 18, y); y += 10;
    d.font(9, 500).text('Pos.', 18, y).text('Artikel', 28, y).text('Menge', 132, y, { align: 'right' }).text('Einzel', 156, y, { align: 'right' }).text('MwSt.', 170, y, { align: 'right' }).text('Gesamt', 192, y, { align: 'right' });
    y += 2.5; d.rect(18, y, 174, .25, '#1c1819'); y += 6;
    o.items.forEach((it, i) => {
      d.font(9.5, 500).text(String(i + 1), 18, y).text(L(it.name, lang), 28, y, { max: 96 });
      d.font(9.5).text(String(it.qty), 132, y, { align: 'right' }).text(eur(it.unit, lang), 156, y, { align: 'right' }).text((it.tax || 0) + ' %', 170, y, { align: 'right' }).text(eur(it.unit * it.qty, lang), 192, y, { align: 'right' });
      y += 4.6; d.font(8); const ly = d.wrap(DOCS.linesText(it, lang), 28, y, 92, 3.8); y = ly + 6;
    });
    const T = o.totals; d.rect(18, y - 2, 174, .25, '#bdb5b0'); y += 4;
    const row = (a, b, bold) => { d.font(9.5, bold ? 500 : 400).text(a, 140, y, { align: 'right' }).text(b, 192, y, { align: 'right' }); y += 5.2; };
    row('Zwischensumme', eur(T.sub, lang)); row('Versand · ' + t('m_' + o.ship.method, null, lang), eur(T.ship, lang));
    if (T.wrap) row('Geschenkverpackung', eur(T.wrap, lang)); if (T.discount) row('Rabatt ' + o.coupon, '−' + eur(T.discount, lang));
    row('Gesamtbetrag', eur(T.sub + T.ship + T.wrap - T.discount, lang), true);
    for (const r of Object.keys(T.vat)) row(`enthaltene MwSt. ${r} %`, eur(T.vat[r], lang));
    if (T.gift) row('bezahlt mit Gutschein ' + o.giftcard, '−' + eur(T.gift, lang));
    y += 4; d.font(9.5).text(`Zahlungsart: ${t('pay_' + o.pay.method, null, lang)} · Status: ${o.pay.status === 'bezahlt' ? 'bezahlt' : o.pay.status === 'erstattet' ? 'erstattet' : 'offen'}`, 18, y);
    if (o.pay.status !== 'bezahlt' && o.pay.method === 'vorkasse') { y += 5.2; d.text(`Bitte überweise ${eur(T.total, lang)} an ${s.shop.bank}, IBAN ${s.shop.iban}, Verwendungszweck ${o.no}.`, 18, y); }
    y += 9; d.font(9).text('Vielen Dank für deinen Einkauf. Personalisierte Artikel sind vom Widerruf ausgeschlossen (§ 312g Abs. 2 Nr. 1 BGB).', 18, y, { color: '#5d5558' });
    FOOT(d, s);
    return C.docsToPdf([d], 'Rechnung ' + o.invoice);
  };

  DOCS.deliveryNote = async function (o) {
    await fontsReady(); const s = ST.settings(); const lang = o.lang || 'de';
    const d = C.Doc(210, 297, 150); SHOPHEAD(d, s);
    let y = 52; addrLines(o.ship.addr || { name: o.ship.recipient || o.cust.name, street: t('m_pickup', null, 'de') }).forEach(l => { d.font(10.5).text(l, 18, y); y += 5.2; });
    d.font(9.5);[['Lieferschein zu', o.no], ['Datum', C.date(o.ship.date, { day: '2-digit', month: '2-digit', year: 'numeric' }, 'de')], ['Versandart', t('m_' + o.ship.method, null, 'de')]].forEach(([a, b], i) => { d.text(a, 130, 52 + i * 5.2, { color: '#5d5558' }); d.text(b, 192, 52 + i * 5.2, { align: 'right' }); });
    y = 86; d.font(17, 500, '"ui-serif", serif').text('Lieferschein', 18, y); y += 10;
    d.font(9, 500).text('Menge', 18, y).text('Artikel', 34, y); y += 2.5; d.rect(18, y, 174, .25, '#1c1819'); y += 6;
    o.items.forEach(it => { d.font(10, 500).text(it.qty + ' ×', 18, y).text(L(it.name, 'de'), 34, y, { max: 150 }); y += 4.6; d.font(8.5); y = d.wrap(DOCS.linesText(it, 'de'), 34, y, 150, 4) + 7; });
    if (o.gift.card) { y += 6; d.rect(18, y, 174, 40, '#f4efea'); d.font(9, 500).text('Grußkarte', 26, y + 9, { color: '#5d5558' }); d.font(15, 500, '"ui-serif-i", serif'); d.wrap(o.gift.card, 26, y + 19, 158, 7); y += 46; }
    y += 6; d.font(9).text(o.gift.hidePrices ? 'Geschenksendung – ohne Preisangaben.' : 'Die Rechnung erhältst du per E-Mail.', 18, y, { color: '#5d5558' });
    FOOT(d, s);
    return C.docsToPdf([d], 'Lieferschein ' + o.no);
  };

  DOCS.label = async function (o) {
    await fontsReady(); const s = ST.settings();
    const d = C.Doc(105, 148, 300);
    d.rect(0, 0, 105, 148, '#fff');
    d.font(7, 500).text('ABSENDER', 6, 9, { color: '#5d5558' });
    d.font(8.5).text(s.shop.name, 6, 13.5).text(s.shop.street, 6, 17.5).text(`${s.shop.zip} ${s.shop.city}`, 6, 21.5);
    d.font(13, 500).text(o.ship.method === 'eu' ? 'DHL PAKET INTERNATIONAL' : o.ship.method === 'local' ? 'KURIER HAMBURG' : 'DHL PAKET', 99, 13, { align: 'right' });
    d.rect(4, 26, 97, .5, '#000');
    d.font(7, 500).text('EMPFÄNGER', 6, 33, { color: '#5d5558' });
    const a = o.ship.addr || { name: o.cust.name, street: '', zip: '', city: '' };
    let y = 41; [o.ship.recipient || a.name, a.street, `${a.zip} ${a.city}`, a.country && a.country !== 'DE' ? a.country : 'DEUTSCHLAND'].filter(Boolean).forEach((l, i) => { d.font(i === 0 ? 13 : 12, i === 0 ? 500 : 400).text(l, 6, y); y += 6.4; });
    if (o.ship.window) { d.font(10, 500).text('Zeitfenster ' + o.ship.window + ' · ' + C.date(o.ship.date, { day: '2-digit', month: '2-digit' }, 'de'), 6, y + 2); }
    d.rect(4, 82, 97, .5, '#000');
    // code-128 look-alike (demo)
    const code = (o.tracking && o.tracking.code) || ('00340434' + String(o.no).replace(/\D/g, '').padStart(12, '0'));
    let seed = 0; for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    let x = 8; while (x < 97) { seed = (seed * 1103515245 + 12345) >>> 0; const w = .35 + (seed % 4) * .32; d.rect(x, 88, w, 30, '#000'); x += w + .35 + ((seed >> 5) % 3) * .3; }
    d.font(9).text(code.replace(/(\d{4})/g, '$1 ').trim(), 52.5, 124, { align: 'center' });
    d.font(9, 500).text('Bestellung ' + o.no, 6, 133).text(o.items.reduce((a, i) => a + i.qty, 0) + ' Artikel', 99, 133, { align: 'right' });
    d.font(6.5).text('DEMO – kein gültiges Versandetikett. Echte Etiketten kommen später über DHL/Sendcloud.', 52.5, 142, { align: 'center', color: '#8a8285' });
    return C.docsToPdf([d], 'Etikett ' + o.no);
  };

  /** production sheet with rendered previews and all personalisation details */
  DOCS.sheet = async function (orders) {
    await fontsReady(); const docs = [];
    for (const o of orders) {
      const d = C.Doc(210, 297, 130); let y = 18;
      d.font(18, 500, '"ui-serif", serif').text('Produktion ' + o.no, 14, y);
      d.font(9.5).text(`${t('m_' + o.ship.method, null, 'de')} · fällig ${C.date(o.ship.date, { weekday: 'short', day: '2-digit', month: '2-digit' }, 'de')}${o.ship.window ? ' · ' + o.ship.window : ''} · ${o.cust.name}`, 196, y, { align: 'right' });
      y += 6; d.rect(14, y, 182, .3, '#1c1819'); y += 6;
      for (const it of o.items) {
        const p = ST.product(it.pid); if (!p) continue;
        if (y > 230) { docs.push(d); break; }
        const cv = ENG.canvas(10, 10);
        if (p.views && p.views.length) await ENG.render(cv, p, 0, it.D, { maxW: 700, force: true });
        const h = 58, w = cv.width ? h * cv.width / cv.height : h;
        if (cv.width > 10) d.img(cv, 14, y, Math.min(w, 70), Math.min(w, 70) === w ? h : 70 * cv.height / cv.width);
        d.font(11, 500).text(it.qty + ' × ' + L(it.name, 'de'), 90, y + 5, { max: 106 });
        let yy = y + 11; d.font(9);
        for (const [a, b] of DOCS.lines(it, 'de')) { d.text(a + ':', 90, yy, { color: '#5d5558' }); yy = d.wrap(b, 120, yy, 76, 4.2) + 4.6; }
        d.text('Technik: ' + (window.PDP ? PDP.technique(p) : ''), 90, yy, { color: '#5d5558' });
        y = Math.max(y + h, yy) + 8; d.rect(14, y - 4, 182, .2, '#d8d1cc');
      }
      if (o.gift.wrap || o.gift.card) { d.font(10, 500).text(`${o.gift.wrap ? 'Geschenkverpackung' : ''}${o.gift.wrap && o.gift.card ? ' · ' : ''}${o.gift.card ? 'Grußkarte: „' + o.gift.card + '“' : ''}`, 14, Math.min(y + 4, 280), { max: 182 }); }
      if (o.note) d.font(9.5).text('Notiz: ' + o.note, 14, Math.min(y + 11, 286), { max: 182 });
      docs.push(d);
    }
    return C.docsToPdf(docs, 'Produktion');
  };


  /* ================= print & laser files ================= */
  /** trace an alpha mask into closed outline loops (pixel edges, simplified). returns loops in px */
  function trace(cv) {
    const W = cv.width, H = cv.height; const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 110;
    const out = new Map(); const key = (x, y) => y * (W + 1) + x;
    const add = (x1, y1, x2, y2) => { const k = key(x1, y1); let a = out.get(k); if (!a) out.set(k, a = []); a.push([x2, y2]); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) add(x, y, x + 1, y);
      if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!on(x - 1, y)) add(x, y + 1, x, y);
    }
    const loops = [];
    for (const [k0, arr0] of out) {
      while (arr0.length) {
        let x = k0 % (W + 1), y = Math.floor(k0 / (W + 1)); const sx = x, sy = y; const loop = [[x, y]]; let px = 0, py = 0, guard = 0;
        let nxt = arr0.pop();
        while (guard++ < 5e6) {
          px = nxt[0] - x; py = nxt[1] - y; x = nxt[0]; y = nxt[1];
          if (x === sx && y === sy) break;
          loop.push([x, y]);
          const a = out.get(key(x, y)); if (!a || !a.length) break;
          let j = 0; if (a.length > 1) { const turn = a.map(([nx, ny]) => (px * (ny - y) - py * (nx - x))); j = turn.indexOf(Math.min(...turn)); }
          nxt = a.splice(j, 1)[0];
        }
        if (loop.length > 3) loops.push(rdp(loop, .7));
      }
    }
    return loops.filter(l => l.length > 2);
  }
  function rdp(pts, eps) {
    // smooth staircase a bit (midpoints), then Douglas-Peucker
    const n = pts.length; const m = pts.map((p, i) => { const q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
    const keep = new Uint8Array(m.length); keep[0] = 1; keep[m.length - 1] = 1;
    const st = [[0, m.length - 1]];
    while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [x1, y1] = m[a], [x2, y2] = m[b]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      for (let i = a + 1; i < b; i++) { const dd = Math.abs(dy * m[i][0] - dx * m[i][1] + x2 * y1 - y2 * x1) / L; if (dd > md) { md = dd; mi = i; } }
      if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
    return m.filter((_, i) => keep[i]);
  }
  const f3 = v => (Math.round(v * 1000) / 1000).toString();
  function vecSVG(v) {
    const d = v.loops.map(l => 'M' + l.map(([x, y]) => f3(x / v.k) + ' ' + f3(y / v.k)).join('L') + 'Z').join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f3(v.w)}mm" height="${f3(v.h)}mm" viewBox="0 0 ${f3(v.w)} ${f3(v.h)}">\n<title>${esc(v.title)}</title>\n<path fill="#000" fill-rule="evenodd" d="${d}"/>\n</svg>\n`;
  }
  function vecDXF(v) {
    const L = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '9', '$MEASUREMENT', '70', '1', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
    for (const l of v.loops) { L.push('0', 'POLYLINE', '8', 'GRAVUR', '66', '1', '70', '1'); for (const [x, y] of l) L.push('0', 'VERTEX', '8', 'GRAVUR', '10', f3(x / v.k), '20', f3(v.h - y / v.k)); L.push('0', 'SEQEND'); }
    L.push('0', 'ENDSEC', '0', 'EOF'); return L.join('\r\n') + '\r\n';
  }
  function vecEPS(v) {
    const pt = 72 / 25.4; const W = Math.ceil(v.w * pt), H = Math.ceil(v.h * pt);
    let ps = `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${W} ${H}\n%%Title: ${v.title}\n%%EndComments\n0 0 0 setrgbcolor\nnewpath\n`;
    for (const l of v.loops) { l.forEach(([x, y], i) => { ps += `${f3(x / v.k * pt)} ${f3((v.h - y / v.k) * pt)} ${i ? 'lineto' : 'moveto'}\n`; }); ps += 'closepath\n'; }
    return ps + 'eofill\nshowpage\n%%EOF\n';
  }
  function dither(src) {
    const w = src.width, h = src.height; const c = ENG.canvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0);
    const id = x.getImageData(0, 0, w, h), d = id.data; const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2];
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) { const i = y * w + X, o = g[i], n = o < 128 ? 0 : 255, e = o - n; g[i] = n; if (X + 1 < w) g[i + 1] += e * 7 / 16; if (y + 1 < h) { if (X) g[i + w - 1] += e * 3 / 16; g[i + w] += e * 5 / 16; if (X + 1 < w) g[i + w + 1] += e / 16; } }
    for (let i = 0; i < w * h; i++) { const v = g[i] < 128 ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0); return c;
  }
  const onWhite = (src, black) => { const c = ENG.canvas(src.width, src.height), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0); if (black) { const id = x.getImageData(0, 0, c.width, c.height), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3 < 200 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; } x.putImageData(id, 0, 0); } return c; };
  const mirror = src => { const c = ENG.canvas(src.width, src.height), x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  const pdfTrue = async (cv, dpmm, title) => { const w = cv.width / dpmm, h = cv.height / dpmm; const m = 10; return C.pdf([{ w: w + 2 * m, h: h + 2 * m, images: [{ jpeg: await C.jpegBytes(onWhite(cv), .95), pw: cv.width, ph: cv.height, x: m, y: m, w, h }] }], { title }); };

  /** zones of an order item that produce a file */
  DOCS.zonesOf = function (it) {
    const p = ST.product(it.pid); if (!p) return [];
    const out = [];
    const sel = ENG.viewFor(p, it.D, p.views.findIndex(v => v.when));
    for (const v of p.views.filter((v, k) => !v.when || k === sel)) for (const z of v.zones) { if (!['text', 'photo', 'cal'].includes(z.t)) continue; if (!ENG.zoneVisible(z, p, it.D)) continue; if (z.t === 'photo' && !(it.D.ph && it.D.ph[z.f] && it.D.ph[z.f].src)) continue; if (z.t === 'text' && !ENG.textOf(z, p, it.D).trim()) continue; if (out.some(o => o.z === z)) continue; out.push({ z, p }); }
    return out;
  };
  /** technique of a zone in plain words */
  DOCS.zoneKind = z => z.t === 'photo' ? (z.fx === 'engrave' || z.fx === 'litho' ? 'photo-laser' : 'photo') : ((z.fx && z.fx.k) || 'print');
  /** all file formats; rec = recommended for this technique */
  DOCS.FORMATS = [
    { id: 'svg', ext: 'svg', vec: 1, t: 'SVG – Vektor für den Laser', d: 'Die Schrift als saubere Linien. Für Lasergravur und Laserschnitt in LightBurn, xTool Creative Space, Glowforge, LaserGRBL oder Inkscape. Beliebig groß ohne Qualitätsverlust.', for: ['engrave', 'glow', 'raised', 'gold3d', 'foil'] },
    { id: 'dxf', ext: 'dxf', vec: 1, t: 'DXF – Vektor für Laser-/CNC-Software', d: 'Gleiche Linien wie SVG, aber im Format für ältere Laserprogramme (RDWorks, EzCad, CorelLaser) und CNC-Fräsen.', for: ['engrave', 'raised', 'gold3d'] },
    { id: 'eps', ext: 'eps', vec: 1, t: 'EPS – Vektor für Druckereien & Plotter', d: 'Für Folienplotter (Goldfolie, Vinyl), Stickprogramme und Druckereien, die Vektordateien wollen (CorelDRAW, Illustrator).', for: ['foil', 'emb', 'gold3d'] },
    { id: 'laser', ext: 'png', t: 'PNG Schwarz-Weiß 600 dpi – Laser (Bild)', d: 'Schwarz = wird graviert, Weiß = bleibt. Wenn dein Laser lieber Bilder als Vektoren nimmt.', for: ['engrave', 'glow', 'photo-laser'] },
    { id: 'dither', ext: 'png', photo: 1, t: 'Foto für Lasergravur (gerastert)', d: 'Das Foto in Punkte umgerechnet – so sieht ein Foto auf Holz, Glas oder Metall gut aus. Im Laser als „Pass-Through“ oder „Threshold“ einstellen.', for: ['photo-laser'] },
    { id: 'png', ext: 'png', t: 'PNG transparent 300 dpi – Drucken', d: 'Farbig, ohne Hintergrund. Für UV-Druck, DTF, Sticker und den normalen Drucker.', for: ['print', 'foil', 'emb', 'photo'] },
    { id: 'jpg', ext: 'jpg', t: 'JPG 300 dpi – Fotodruck', d: 'Weißer Hintergrund, beste Farben für Fotos. Für Fotolabor, Fotodrucker und Kristall-/Glasdruck.', for: ['photo'] },
    { id: 'pdf', ext: 'pdf', t: 'PDF in Originalgröße', d: 'Genau in Millimeter-Größe mit Rand. Zum Ausdrucken auf Papier zum Prüfen, oder für den Copyshop.', for: [] },
    { id: 'mirror', ext: 'png', t: 'PNG gespiegelt – Transferdruck', d: 'Seitenverkehrt für Sublimation (Tassen, Kissen, Puzzle) und Bügelbilder. Wird beim Pressen wieder richtig herum.', for: ['photo', 'print'] }
  ];
  DOCS.formatsFor = function (zs) {
    const kinds = new Set(zs.map(x => DOCS.zoneKind(x.z)));
    const hasText = zs.some(x => x.z.t !== 'photo'), hasPhoto = zs.some(x => x.z.t === 'photo');
    return DOCS.FORMATS.filter(f => (f.vec ? hasText : true) && (f.photo ? hasPhoto : true)).map(f => Object.assign({}, f, { rec: f.for.some(k => kinds.has(k)) })).sort((a, b) => b.rec - a.rec);
  };
  /** files of one format for one item: [{name, blob}] */
  DOCS.makeFiles = async function (o, idx, fmt) {
    const it = o.items[idx]; const zs = DOCS.zonesOf(it); const out = [];
    const F = DOCS.FORMATS.find(f => f.id === fmt);
    for (const [n, { z, p }] of zs.entries()) {
      const isPhoto = z.t === 'photo';
      if (F.vec && isPhoto) continue; if (F.photo && !isPhoto) continue;
      const dpmm = fmt === 'laser' || F.vec ? 23.622 : 11.811; // 600 or 300 dpi
      const black = F.vec || fmt === 'laser';
      const cv = await ENG.flatZone(p, z, it.D, dpmm, { black: black && !isPhoto }); if (!cv) continue;
      const mmW = cv.width / dpmm, mmH = cv.height / dpmm;
      const base = `${o.no}_${idx + 1}_${p.id}_${String(z.f || ENG.styleField(z) || 'feld')}${zs.length > 1 ? '_' + (n + 1) : ''}_${Math.round(mmW)}x${Math.round(mmH)}mm`;
      let blob;
      if (F.vec) { const v = { loops: trace(cv), k: dpmm, w: mmW, h: mmH, title: base }; const txt = fmt === 'svg' ? vecSVG(v) : fmt === 'dxf' ? vecDXF(v) : vecEPS(v); blob = new Blob([txt], { type: fmt === 'svg' ? 'image/svg+xml' : fmt === 'eps' ? 'application/postscript' : 'application/dxf' }); }
      else if (fmt === 'laser') blob = await C.pngDPI(await C.canvasBlob(isPhoto ? dither(cv) : onWhite(cv, true), 'image/png'), 600);
      else if (fmt === 'dither') blob = await C.pngDPI(await C.canvasBlob(dither(cv), 'image/png'), 300);
      else if (fmt === 'png') blob = await C.pngDPI(await C.canvasBlob(cv, 'image/png'), 300);
      else if (fmt === 'jpg') blob = await C.canvasBlob(onWhite(cv), 'image/jpeg', .95);
      else if (fmt === 'mirror') blob = await C.pngDPI(await C.canvasBlob(mirror(cv), 'image/png'), 300);
      else if (fmt === 'pdf') blob = await pdfTrue(cv, dpmm, base);
      out.push({ name: `${base}_${fmt === 'laser' ? 'laser-sw' : fmt === 'mirror' ? 'gespiegelt' : fmt === 'dither' ? 'laser-foto' : fmt}.${F.ext}`, blob });
    }
    return out;
  };

  /** print-ready files of one order item: [{name, blob}] */
  DOCS.printFiles = async function (o, idx) {
    const it = o.items[idx]; const p = ST.product(it.pid); if (!p) return [];
    const out = []; let n = 0;
    for (const v of p.views) for (const z of v.zones) {
      if (!ENG.zoneVisible || !z) continue;
      if (z.t !== 'text' && z.t !== 'photo' && z.t !== 'cal') continue;
      if (ENG.zoneVisible && !ENG.zoneVisible(z, p, it.D)) continue;
      const c = await ENG.flatZone(p, z, it.D, 11.811, {});
      if (!c) continue; n++;
      const kind = z.t === 'photo' ? 'foto' : (z.fx && z.fx.k) || 'druck';
      const base = `${o.no}_${idx + 1}_${p.id}_${String(z.f || styleField(z) || 'feld')}_${kind}_${z.mm || 60}mm`;
      out.push({ name: base + '.png', blob: await C.pngDPI(await C.canvasBlob(c, 'image/png'), 300) });
      if (z.t !== 'photo' && ['engrave', 'foil', 'emb', 'raised', 'gold3d'].includes(kind)) {
        const b = await ENG.flatZone(p, z, it.D, 11.811, { black: true });
        if (b) out.push({ name: base + '_schwarz-laser.png', blob: await C.pngDPI(await C.canvasBlob(b, 'image/png'), 300) });
      }
    }
    return out;
  };
  const styleField = z => ENG.styleField ? ENG.styleField(z) : z.f;
  DOCS.orderZip = async function (o) {
    const JSZip = await C.zip(); const zip = new JSZip();
    for (let i = 0; i < o.items.length; i++) for (const f of DOCS.formatsFor(DOCS.zonesOf(o.items[i]))) for (const x of await DOCS.makeFiles(o, i, f.id)) zip.file(x.name, x.blob);
    zip.file(`${o.no}_Produktionsblatt.pdf`, await DOCS.sheet([o]));
    return zip.generateAsync({ type: 'blob' });
  };
  DOCS.dayZip = async function (orders, label) {
    const JSZip = await C.zip(); const zip = new JSZip();
    for (const o of orders) for (let i = 0; i < o.items.length; i++) for (const f of await DOCS.printFiles(o, i)) zip.file(o.no + '/' + f.name, f.blob);
    zip.file(`Produktionsblaetter_${label}.pdf`, await DOCS.sheet(orders));
    return zip.generateAsync({ type: 'blob' });
  };
})();
