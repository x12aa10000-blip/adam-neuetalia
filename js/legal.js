/* Legal pages: Impressum, Datenschutz, AGB, Widerrufsbelehrung, Versand & Zahlung.
   All company data comes from Admin › Einstellungen › Rechtliches, so the owner can complete it himself.
   The German version is the legally binding one; English and Arabic visitors get a short note.
   Note for the owner: these texts were written carefully for this shop but are no legal advice –
   have them checked once (e.g. by a lawyer or a legal-text service). */
(function () {
  'use strict';
  const D = window.I18N;
  const K = (k, de, en, ar) => { D.de[k] = de; D.en[k] = en; D.ar[k] = ar; };
  K('withdrawal_form', 'Muster-Widerrufsformular', 'Model withdrawal form', 'نموذج الانسحاب');
  K('legal_binding', '', 'Only the German version is legally binding.', 'النسخة الألمانية هي النسخة الملزمة قانونياً.');
  K('legal_stand', 'Stand', 'Last updated', 'آخر تحديث');
  K('map_consent', 'Karte anzeigen (Google Maps)', 'Show map (Google Maps)', 'عرض الخريطة (Google Maps)');
  K('map_consent_p', 'Beim Laden der Karte werden Daten (u. a. deine IP-Adresse) an Google übertragen.', 'Loading the map sends data (incl. your IP address) to Google.', 'عند تحميل الخريطة تُرسل بيانات (منها عنوان IP) إلى Google.');

  const ok = v => v && !/^DE0{6,}|^DE00 0000/.test(String(v).trim());
  const h = v => esc(v || '');
  const br = a => a.filter(Boolean).map(h).join('<br>');
  const STAND = 'November 2026';

  function data() {
    const s = ST.settings(); const sh = s.shop || {};
    return {
      s, sh, name: sh.name || 'Adam', owner: sh.owner && sh.owner !== sh.name ? sh.owner : '', form: sh.legalForm || '',
      addr: [sh.street, ((sh.zip || '') + ' ' + (sh.city || '')).trim(), 'Deutschland'],
      phone: sh.phone || '', email: sh.email || '', vat: ok(sh.taxId) ? sh.taxId : '', taxNo: sh.taxNo || '', reg: sh.register || '',
      resp: sh.resp || sh.owner || '', pp: !!((s.paypal || {}).clientId) && (s.payments || {}).paypal
    };
  }
  const head = (title) => `<h1>${title}</h1>${C.lang() !== 'de' ? `<p class="note">${t('legal_binding')}</p>` : ''}`;

  function impressum() {
    const d = data();
    return `${head(t('imprint'))}
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <p>${br([d.name, d.owner ? 'Inhaber: ' + d.owner : '', d.form])}<br>${br(d.addr)}</p>
      <h2>Kontakt</h2><p>${d.phone ? `Telefon: <bdi dir="ltr"><a href="tel:${h(d.phone.replace(/\s/g, ''))}">${h(d.phone)}</a></bdi><br>` : ''}${d.email ? `E-Mail: <a href="mailto:${h(d.email)}">${h(d.email)}</a>` : ''}</p>
      ${d.vat || d.taxNo ? `<h2>Steuerangaben</h2><p>${d.vat ? 'Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ' + h(d.vat) + '<br>' : ''}${d.taxNo && !d.vat ? 'Steuernummer: ' + h(d.taxNo) : ''}</p>` : ''}
      ${d.reg ? `<h2>Registereintrag</h2><p>${h(d.reg)}</p>` : ''}
      ${d.resp ? `<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2><p>${br([d.resp].concat(d.addr))}</p>` : ''}
      <h2>Verbraucherstreitbeilegung</h2><p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <h2>Haftung für Inhalte und Links</h2><p>Wir erstellen die Inhalte dieser Seiten mit Sorgfalt. Für Inhalte externer Websites, auf die wir verlinken, sind ausschließlich deren Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir entsprechende Links umgehend.</p>
      <h2>Bildrechte</h2><p>Produktfotos: ${h(d.name)}. Von Kundinnen und Kunden hochgeladene Bilder werden ausschließlich zur Herstellung der jeweiligen Bestellung verwendet.</p>`;
  }

  function datenschutz() {
    const d = data();
    return `${head(t('privacy'))}<p class="muted small">${t('legal_stand')}: ${STAND}</p>
      <h2>1. Verantwortlicher</h2><p>${br([d.name, d.owner ? 'Inhaber: ' + d.owner : ''].concat(d.addr))}<br>${d.email ? 'E-Mail: ' + h(d.email) : ''}${d.phone ? '<br>Telefon: <bdi dir="ltr">' + h(d.phone) + '</bdi>' : ''}</p>
      <h2>2. Überblick</h2><p>Wir verarbeiten personenbezogene Daten nur, soweit es für den Betrieb dieses Shops, die Ausführung deiner Bestellung oder aufgrund deiner Einwilligung erforderlich ist. Wir verkaufen keine Daten und nutzen keine Werbe- oder Analyse-Cookies.</p>
      <h2>3. Aufruf der Website (Hosting)</h2><p>Die Website wird über GitHub Pages (GitHub B.V., Prins Bernhardplein 200, 1097 JB Amsterdam, Niederlande; Mutterkonzern GitHub Inc., USA) ausgeliefert. Beim Aufruf werden technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Seite und Browsertyp verarbeitet, um die Seite sicher auszuliefern (Art. 6 Abs. 1 lit. f DSGVO). Eine Übermittlung in die USA ist möglich; GitHub ist nach dem EU-US Data Privacy Framework zertifiziert.</p>
      <h2>4. Bestellungen</h2><p>Für Bestellungen verarbeiten wir Name, E-Mail-Adresse, Telefonnummer, Liefer- und Rechnungsadresse, bestellte Artikel, deine Personalisierungen (Texte, Fotos, Gestaltung), Zahlungsart und Bestellverlauf. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Die Telefonnummer nutzen wir nur für Rückfragen zur Bestellung oder Lieferung.</p>
      <p>Die Daten werden auf Servern von Supabase (Supabase Inc., USA) im Rechenzentrum Frankfurt am Main (EU) gespeichert. Mit Supabase besteht ein Auftragsverarbeitungsvertrag (Art. 28 DSGVO); für etwaige Zugriffe aus den USA gelten die EU-Standardvertragsklauseln.</p>
      <h2>5. Hochgeladene Fotos und Texte</h2><p>Fotos und Texte, die du für ein Produkt hochlädst, verwenden wir ausschließlich zur Herstellung deiner Bestellung. Nicht bestellte Uploads werden nach spätestens 3 Tagen automatisch gelöscht, Fotos aus Bestellungen spätestens 90 Tage nach Abschluss der Bestellung. Bitte lade nur Bilder hoch, an denen du die Rechte hast und auf denen abgebildete Personen einverstanden sind.</p>
      <h2>6. Kundenkonto</h2><p>Wenn du ein Konto anlegst, speichern wir Name, E-Mail, Telefonnummer (freiwillig), Adressen, Merkliste und gespeicherte Designs (Art. 6 Abs. 1 lit. b DSGVO). Dein Passwort wird nur verschlüsselt (bcrypt) gespeichert. Du kannst deine Daten im Konto jederzeit herunterladen und das Konto löschen.</p>
      <h2>7. Zahlung</h2><p>Bei Vorkasse überweist du direkt auf unser Bankkonto; bei Barzahlung zahlst du im Laden.${d.pp ? ' Wenn du PayPal oder Kreditkarte wählst, wirst du zu PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxemburg weitergeleitet. PayPal verarbeitet die Zahlungsdaten in eigener Verantwortung; es gilt die Datenschutzerklärung von PayPal.' : ''} Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      <h2>8. E-Mails</h2><p>Bestellbestätigungen und Statusmeldungen senden wir per E-Mail. Für den Versand kann der Dienst Resend (Resend Inc., USA) eingesetzt werden; es gelten die EU-Standardvertragsklauseln. Newsletter oder Angebote senden wir nur, wenn du dem ausdrücklich zugestimmt hast (Art. 6 Abs. 1 lit. a DSGVO); die Einwilligung kannst du jederzeit widerrufen.</p>
      <h2>9. Bewertungen und Fragen</h2><p>Bewertungen erscheinen nach Prüfung mit dem von dir angegebenen Namen. Bei Produktfragen nutzen wir deine E-Mail-Adresse nur, um dir zu antworten. Die E-Mail-Adresse wird nicht veröffentlicht.</p>
      <h2>10. Speicherung im Browser</h2><p>Wir speichern im lokalen Speicher deines Browsers nur, was der Shop zum Funktionieren braucht: Warenkorb, Sprache, Merkliste, deine letzten Bestellungen und ggf. die Anmeldung (§ 25 Abs. 2 Nr. 2 TDDDG). Es werden keine Tracking- oder Werbe-Cookies gesetzt.</p>
      <h2>11. Karte (Google Maps)</h2><p>Die Karte unserer Läden wird erst geladen, wenn du auf „${t('map_consent')}“ klickst. Dann werden Daten wie deine IP-Adresse an Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland übertragen (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO; § 25 Abs. 1 TDDDG).</p>
      <h2>12. Speicherdauer</h2><p>Bestell- und Rechnungsdaten bewahren wir so lange auf, wie es handels- und steuerrechtliche Pflichten verlangen (§ 147 AO, § 257 HGB; bis zu 8 bzw. 10 Jahre). Kontodaten löschen wir, wenn du dein Konto löschst. Sicherheitsprotokolle werden nach 180 Tagen gelöscht.</p>
      <h2>13. Deine Rechte</h2><p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, eine Einwilligung jederzeit zu widerrufen. Schreib uns dazu einfach${d.email ? ' an ' + h(d.email) : ''}.</p>
      <p>Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. beim Hamburgischen Beauftragten für Datenschutz und Informationsfreiheit, Ludwig-Erhard-Str. 22, 20459 Hamburg.</p>
      <h2>14. Sicherheit</h2><p>Die Übertragung erfolgt verschlüsselt (HTTPS). Zugriff auf Bestelldaten haben nur der Inhaber und berechtigte Mitarbeitende mit eigenem Passwort.</p>`;
  }

  function agb() {
    const d = data(); const s = d.s;
    return `${head(t('terms'))}<p class="muted small">${t('legal_stand')}: ${STAND}</p>
      <h2>§ 1 Geltungsbereich</h2><p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen über diesen Online-Shop zwischen ${h(d.name)}${d.owner ? ' (Inhaber: ' + h(d.owner) + ')' : ''}, ${h(d.addr[0])}, ${h(d.addr[1])} (nachfolgend „wir“) und Verbraucherinnen und Verbrauchern (nachfolgend „du“).</p>
      <h2>§ 2 Vertragsschluss</h2><p>Die Darstellung der Produkte im Shop ist kein bindendes Angebot. Durch Klick auf „Zahlungspflichtig bestellen“ gibst du ein verbindliches Angebot zum Kauf der Waren im Warenkorb ab. Den Eingang bestätigen wir auf der Bestellbestätigungsseite und, soweit eingerichtet, per E-Mail. Der Vertrag kommt zustande, wenn wir die Bestellung annehmen, spätestens mit Beginn der Herstellung oder dem Versand der Ware.</p>
      <p>Vor dem Absenden kannst du alle Eingaben prüfen und über die Eingabefelder bzw. den Warenkorb korrigieren. Vertragssprache ist Deutsch. Den Vertragstext speichern wir; deine Bestelldaten kannst du jederzeit über „Bestellung verfolgen“ bzw. dein Kundenkonto einsehen und die Rechnung als PDF herunterladen.</p>
      <h2>§ 3 Personalisierte Produkte</h2><p>Personalisierte Artikel fertigen wir nach deinen Angaben (Texte, Fotos, Schriften, Farben). Bitte prüfe die Vorschau genau – Schreibfehler in deinen Angaben übernehmen wir so, wie du sie eingegeben hast. Die Vorschau ist eine Darstellung; geringe Abweichungen bei Farbe, Größe und Position durch Material und Herstellung sind möglich.</p>
      <p>Wenn du die Design-Freigabe wählst, senden wir dir vor der Herstellung einen Entwurf; die Herstellung beginnt erst nach deiner Freigabe. Du versicherst, dass du die Rechte an hochgeladenen Bildern und Texten hast und dass diese keine Rechte Dritter verletzen. Inhalte, die gegen Gesetze verstoßen, stellen wir nicht her.</p>
      <h2>§ 4 Preise und Versandkosten</h2><p>Alle Preise sind Endpreise inklusive der gesetzlichen Mehrwertsteuer. Hinzu kommen gegebenenfalls Versandkosten, die dir vor Abschluss der Bestellung angezeigt werden (siehe <a href="#/rechtliches/versand">Versand &amp; Zahlung</a>).</p>
      <h2>§ 5 Zahlung</h2><p>Es stehen die im Bestellvorgang angezeigten Zahlungsarten zur Verfügung (z. B. Vorkasse per Überweisung, Barzahlung bei Abholung${d.pp ? ', PayPal' : ''}). Bei Vorkasse beginnen wir mit der Herstellung nach Zahlungseingang; bitte überweise innerhalb von 7 Tagen unter Angabe der Bestellnummer.</p>
      <h2>§ 6 Lieferung und Abholung</h2><p>Wir liefern per Kurier in Hamburg, per DHL innerhalb Deutschlands${s.shipping && s.shipping.eu && s.shipping.eu.on ? ' und in die EU' : ''} oder du holst die Ware im Laden ab. Angegebene Liefertermine sind voraussichtliche Termine. Bei Abholung informieren wir dich, sobald die Ware bereitliegt.</p>
      <h2>§ 7 Eigentumsvorbehalt</h2><p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
      <h2>§ 8 Widerrufsrecht</h2><p>Für Verbraucher besteht ein Widerrufsrecht nach Maßgabe der <a href="#/rechtliches/widerruf">Widerrufsbelehrung</a>. Bei Waren, die nach deinen persönlichen Angaben angefertigt werden (z. B. Gravuren, Namen, Fotos), besteht nach § 312g Abs. 2 Nr. 1 BGB kein Widerrufsrecht.</p>
      <h2>§ 9 Gewährleistung</h2><p>Es gilt das gesetzliche Mängelhaftungsrecht. Ist ein Artikel beschädigt oder fehlerhaft, melde dich bitte möglichst schnell (z. B. über „Bestellung verfolgen“ → „Problem melden“ oder per E-Mail), damit wir schnell helfen können. Deine gesetzlichen Rechte bleiben davon unberührt.</p>
      <h2>§ 10 Gutscheine</h2><p>Geschenkgutscheine sind 3 Jahre ab Ende des Kaufjahres gültig, können im Shop und im Laden eingelöst werden und werden nicht bar ausgezahlt. Ein Restguthaben bleibt erhalten.</p>
      <h2>§ 11 Streitbeilegung</h2><p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <h2>§ 12 Schlussbestimmungen</h2><p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Bestimmungen des Staates entzogen wird, in dem du deinen gewöhnlichen Aufenthalt hast.</p>`;
  }

  function widerruf() {
    const d = data();
    const who = [d.name, d.owner ? 'Inhaber: ' + d.owner : ''].concat(d.addr).filter(Boolean).map(h).join(', ') + (d.email ? ', E-Mail: ' + h(d.email) : '') + (d.phone ? ', Telefon: ' + h(d.phone) : '');
    return `${head(t('withdrawal'))}
      <h2>Widerrufsrecht</h2><p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
      <p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat. Bei mehreren Waren einer Bestellung, die getrennt geliefert werden, beginnt die Frist mit dem Erhalt der letzten Ware.</p>
      <p>Um dein Widerrufsrecht auszuüben, musst du uns (${who}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
      <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>
      <h2>Folgen des Widerrufs</h2><p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.</p>
      <p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der frühere Zeitpunkt ist.</p>
      <p>Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest. Du trägst die unmittelbaren Kosten der Rücksendung der Waren.</p>
      <p>Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>
      <h2>Ausschluss des Widerrufsrechts</h2><p><b>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB).</b> Das betrifft alle Artikel mit Gravur, Namen, Datum, Foto oder anderer Personalisierung.</p>
      <p>Das Widerrufsrecht besteht außerdem nicht bei Waren, die schnell verderben können (z. B. frische Blumen).</p>
      <h2>${t('withdrawal_form')}</h2><div class="formbox"><p>(Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es zurück.)</p>
      <p>An ${who}:</p>
      <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)<br>_____________________________________________</p>
      <p>Bestellt am (*)/erhalten am (*): ____________________<br>Bestellnummer: ____________________<br>Name des/der Verbraucher(s): ____________________<br>Anschrift des/der Verbraucher(s): ____________________<br>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ____________________<br>Datum: ____________________</p>
      <p class="muted small">(*) Unzutreffendes streichen.</p></div>`;
  }

  function versand() {
    const d = data(); const s = d.s; const sh = s.shipping || {}; const pm = s.payments || {};
    const row = (on, a, b) => on ? `<tr><th>${a}</th><td>${b}</td></tr>` : '';
    return `<h1>${t('ship_pay')}</h1>
      <h2>${t('shipping')}</h2><table class="tbl">
      ${row(sh.pickup && sh.pickup.on, t('m_pickup'), t('free'))}
      ${row(sh.local && sh.local.on, t('m_local'), eur(sh.local && sh.local.price))}
      ${row(sh.dhl && sh.dhl.on, t('m_dhl'), eur(sh.dhl && sh.dhl.price) + (s.freeFrom ? ' · ' + t('free_from', { n: eur(s.freeFrom) }) : ''))}
      ${row(sh.eu && sh.eu.on, t('m_eu'), eur(sh.eu && sh.eu.price))}</table>
      <h2>${t('payment')}</h2><ul class="plain">${['vorkasse', 'cash', 'paypal', 'card'].filter(k => pm[k]).map(k => `<li>${t('pay_' + k)}</li>`).join('')}</ul>
      <p class="muted">${C.lang() === 'de' ? 'Alle Preise inkl. MwSt. Bei Vorkasse beginnt die Herstellung nach Zahlungseingang.' : C.lang() === 'en' ? 'All prices include VAT. With bank transfer, production starts once the payment has arrived.' : 'جميع الأسعار شاملة الضريبة. عند الدفع بالتحويل يبدأ التحضير بعد وصول المبلغ.'}</p>`;
  }

  SHOP.legal = function (page) {
    const fn = { impressum, datenschutz, agb, widerruf, versand }[page];
    if (!fn) { C.go('#/rechtliches/impressum'); return; }
    SHOP.page(`<div class="wrap narrow legal" lang="${page === 'versand' ? C.lang() : 'de'}" dir="${page === 'versand' && C.lang() === 'ar' ? 'rtl' : 'ltr'}">${fn()}</div>`, 'legal');
    document.title = $('.legal h1').textContent + ' · ' + (ST.settings().shop.name || 'Adam');
  };

  /* Google Maps only after a click (no data to Google without consent) */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-map-load]'); if (!b) return;
    const box = b.closest('.loc-map'); const src = box && box.dataset.src; if (!src) return;
    box.innerHTML = `<iframe title="${esc(t('v5_map'))}" loading="lazy" referrerpolicy="no-referrer" src="${esc(src)}"></iframe>`; box.dataset.loaded = '1';
  });
  const fixMaps = () => $$('.loc-map iframe').forEach(f => {
    const box = f.parentElement; if (box.dataset.loaded) return;
    box.dataset.src = f.getAttribute('src'); box.classList.add('map-off');
    box.innerHTML = `<div class="map-consent"><button type="button" class="btn ghost sm" data-map-load>${ic('pin')} ${t('map_consent')}</button><p class="muted small">${t('map_consent_p')} <a class="link" href="#/rechtliches/datenschutz">${t('privacy')}</a></p></div>`;
  });
  new MutationObserver(fixMaps).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  if (window.V5 && V5.showLoc) { const _s = V5.showLoc; V5.showLoc = function (el) { const box = $('.loc-map'); if (box && !box.dataset.loaded) { const ls = V5.locs(); const l = ls[+el.dataset.i]; if (l) box.dataset.src = `https://maps.google.com/maps?q=${encodeURIComponent([l.street, (l.zip || '') + ' ' + (l.city || '')].join(', '))}&hl=${C.lang()}&z=15&output=embed`; $$('.loc').forEach(x => x.setAttribute('aria-pressed', String(x === el))); return; } return _s.apply(this, arguments); }; }

  /* Admin › Einstellungen: fields for the legal data */
  if (window.ADMIN && ADMIN.settings) {
    const _s = ADMIN.settings;
    ADMIN.settings = function () {
      _s.apply(this, arguments);
      const form = $('form[data-aform="settings"]'); if (!form || form.querySelector('[name="shop.owner"]')) return;
      const sh = ST.settings().shop || {}; const ar = ST.get('adminLang', 'ar') === 'ar'; const W = (de, a) => ar ? a : de;
      const f = (n, l, v, ph) => `<label class="fld"><span>${l}</span><input class="in no-tr" name="${n}" value="${esc(v || '')}" placeholder="${esc(ph || '')}"></label>`;
      const first = form.querySelector('.a-card');
      first.insertAdjacentHTML('beforebegin', `<section class="a-card" id="legalData"><h2>${W('Rechtliches (Impressum)', 'البيانات القانونية (Impressum)')}</h2>
        <p class="hint">${W('Diese Angaben erscheinen im Impressum, in der Datenschutzerklärung, den AGB, der Widerrufsbelehrung und auf Rechnungen. Pflicht: voller Name des Inhabers, Adresse, E-Mail, Telefon.', 'هالمعلومات بتطلع بالـ Impressum والخصوصية والشروط والفواتير. ضروري: الاسم الكامل لصاحب المحل، العنوان، الإيميل، التلفون.')}</p>
        <div class="grid3">${f('shop.owner', W('Inhaber (voller Name) *', 'صاحب المحل (الاسم الكامل) *'), sh.owner !== sh.name ? sh.owner : '', 'Max Mustermann')}
        ${f('shop.legalForm', W('Rechtsform', 'نوع الشركة'), sh.legalForm, 'Einzelunternehmen')}
        ${f('shop.taxNo', W('Steuernummer (falls keine USt-IdNr.)', 'الرقم الضريبي (إذا ما في USt-IdNr)'), sh.taxNo, '')}
        ${f('shop.register', W('Handelsregister (falls eingetragen)', 'السجل التجاري (إذا مسجّل)'), sh.register, 'HRA 12345, Amtsgericht Hamburg')}
        ${f('shop.resp', W('Verantwortlich für Inhalte (falls anders)', 'المسؤول عن المحتوى (إذا غيره)'), sh.resp, '')}
        ${f('shop.url', W('Adresse der Website (für E-Mail-Links)', 'رابط الموقع (للروابط بالإيميل)'), sh.url, 'https://…')}</div></section>`);
    };
    const _d = ADMIN.dash;
    ADMIN.dash = function () {
      _d.apply(this, arguments);
      const sh = ST.settings().shop || {}; const ar = ST.get('adminLang', 'ar') === 'ar';
      const miss = [!sh.owner || sh.owner === sh.name ? (ar ? 'اسم صاحب المحل' : 'Name des Inhabers') : '', !sh.email || /adamneuetalia/.test(sh.email) ? (ar ? 'الإيميل' : 'E-Mail') : '', !ok(sh.taxId) && !sh.taxNo ? (ar ? 'الرقم الضريبي' : 'Steuernummer/USt-IdNr.') : '', !ok(sh.iban) && (ST.settings().payments || {}).vorkasse ? 'IBAN' : ''].filter(Boolean);
      if (miss.length && ADMIN.isOwner !== false) {
        const m = $('#amain'); if (m) m.insertAdjacentHTML('afterbegin', `<div class="sec-warn">${ic('alert')}<span>${ar ? 'لازم تكمّل هالمعلومات قبل ما يفتح المتجر للزباين: ' : 'Bitte vor dem Start ergänzen: '}<b>${miss.map(esc).join(', ')}</b></span><a class="btn sm" href="#/admin/einstellungen">${ar ? 'كمّل' : 'Ergänzen'}</a></div>`);
      }
    };
  }
})();
