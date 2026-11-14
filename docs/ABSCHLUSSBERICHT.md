# Adam Online-Shop – Neuaufbau: Abschlussbericht (Stand 14.11.2026, lokal, NICHT veröffentlicht)

## 1. Was neu gebaut wurde
- Neue Oberfläche "Soft Premium" für alle Kundenseiten (Kopfzeile, Fußzeile, mobile Leiste, Produktkarten, Startseite). Gleiche Markenfarben (#FE90BE, #01CAC9, #6425FE, #333333, #FFFFFF), runde Ecken, Schrift Plus Jakarta Sans + IBM Plex Sans Arabic, RTL für Arabisch.
- Startseite folgt jetzt den Admin-Einstellungen "Website": Reihenfolge und Ein/Aus der Blöcke, Hero-Text, Überschriften, Bilder. Live-Namensvorschau im Hero auf der echten Rosenbox.
- Bewährte Logik bleibt: Preise, Warenkorb, Kasse, Konfigurator, Admin, Bestellungen, Dokumente, Assistent.
- Die Produkt-, Listen-, Kassen- und Kontoseiten laufen noch mit dem alten CSS im neuen Rahmen (sehen stimmig aus, sind aber noch nicht einzeln neu gestaltet).

## 2. "Design Your Box" entfernt
- Entfernt: Route, Seite, Skripte (box.js, masks.js), Menüpunkte, Startseiten-Blöcke, Admin-Reiter, Assistent-Thema, Übersetzungen, Preislogik im Browser und auf dem Server.
- Server: Migration `remove_gift_box_builder` auf der Live-Datenbank angewendet und geprüft. Neue Bestellungen mit Box werden abgelehnt (`product_unavailable`), Gutschein-Preis (25 €) rechnet weiter. Alte Bestellungen bleiben les- und stornierbar.
- Übrig sind nur normale Produkte mit "box" im Namen (z. B. Rosenbox) und Icons.

## 3. Sicherheit
**Gefunden / Vorfall**
- 12.11. 19:02–19:41: 12 fehlgeschlagene Admin-Logins von 197.54.221.129, kein Erfolg. Kein Admin-Eintrag oder Preisänderung nach dem 9.11. Nur ein Admin-Konto.
- Wahrscheinlichster früherer Weg: alte `main`-Version mit PIN 1234/0000 im Browser. Welche Version wann live war, ist NICHT belegt.

**Geprüft und in Ordnung**
- Keine Geheimnisse im Code (detect-secrets). Im Browser steht nur der öffentliche Supabase-Key.
- Alle sensiblen Tabellen sind per RLS gesperrt; Zugriff nur über Funktionen, die Token und Rolle prüfen.
- Admin-Login: Limit 8/15 Min pro Benutzer, 10/15 Min pro IP; Passwörter bcrypt; Sitzungs-Tokens gehasht; Mindestlänge 10.
- Preise, Lager, Gutscheine werden serverseitig berechnet. Uploads: nur JPEG/PNG/WebP, Größe und Format geprüft.
- CSP ohne `unsafe-inline` für Skripte, HSTS, X-Frame-Options, nosniff, Referrer- und Permissions-Policy.
- Kundentexte werden beim Darstellen maskiert (Code-Durchsicht, kein Angriffstest).

**Gefixt**
- Fehler in der Kasse (JS-Fehler nach dem Absenden einer Bestellung).
- `.env.example` angelegt (nur Namen der Secrets).

**Offen / Empfehlung**
- Admin-Passwort ändern (mind. 14 Zeichen). Alte `main`-Seite offline nehmen. Falls die alte Version je live war: Passwort sofort ändern.
- Erweiterung `pg_net` liegt im Schema `public` (Warnung, kein Loch). Nicht verschoben, weil `shop.send_mail` sie nutzt.
- Admin-Login-IP stammt aus Header; hinter Supabase/Cloudflare zuverlässig, der Benutzer-Limit schützt zusätzlich.
- PayPal-/DHL-/Resend-Edge-Functions sind nicht deployt und nicht konfiguriert. Webhook-Signatur und Zahlungsfluss wurden nur im Code gelesen.

## 4. Tests
**Ausgeführt (lokal, Demo-Daten)**: Routen-Smoke-Test 26 Seiten × DE/EN/AR × Desktop/Handy plus Admin-Seite lädt; Startseite mit geänderten Admin-Einstellungen; Produkt konfigurieren → Warenkorb → Kasse → Testbestellung (Überweisung) → Dankeseite.
**NICHT getestet**: Admin-Login und Admin-Funktionen gegen die Live-Datenbank (kein Passwort), echte PayPal-/DHL-/E-Mail-Flows, ZAP, Lighthouse, OSV-Abhängigkeitsscan, Screenreader, Echtgeräte, Lasttests.
Die Aussage "100 % sicher" ist nicht möglich und wird nicht gemacht.

## 5. Werkzeuge
Playwright + Chrome, semgrep (lokale Regeln), detect-secrets, Supabase-Advisors, SQL-Prüfungen (nur Lesen, plus eine freigegebene Migration).

## 6. Deployment (erst nach deiner Freigabe)
1. Änderungen prüfen, dann committen und pushen (Freigabe nötig).
2. Hosting: Dateien aus `app/` inkl. `_headers` (Cloudflare Pages/Netlify). `js/config.js` enthält nur URL und öffentlichen Key.
3. Secrets nur als Supabase-Secrets setzen (siehe `.env.example`), dann Edge Functions deployen und PayPal-Sandbox testen.
4. Admin-Passwort ändern, alte Seite offline nehmen.
