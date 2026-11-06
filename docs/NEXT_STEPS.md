# Where the work stopped (6 Nov 2026, 03:00) – resume here

Branch: `production-ready` (nothing merged into `main`, nothing deployed).

## Done in the handover round (tested)
- PayPal verified on the server: `supabase/functions/` (create / capture / webhook with signature check), DB functions `shop_srv_*`
  (service role only). Tests: `tests/paypal_functions.test.mts` 25/25, browser flow `tests/e2e_paypal.py` 8/8.
- Hosting: `_headers` (Cloudflare Pages + Netlify), `netlify.toml`, build `tools/build-site.mjs` (publishes only site files,
  refuses secret keys, demo mode). Header test + clickjacking test PASS (`tests/serve-headers.mjs`, `tests/headers_browser.py`).

## Interrupted / still open
1. Re-run on the header build (port 8790): `WEB=http://localhost:8790 python3 tests/e2e_full.py`, `tests/e2e_paypal.py`, `tests/qa_pages.py` (was running when stopped – result unknown).
2. Demo environment: DB demo mode (kv `env` = demo: no mails, no PayPal, no team/mail changes), `server/demo_seed.sql` with synthetic data,
   client refuses to start a demo build against a non-demo database, isolation tests with a second local DB.
3. Re-run all security suites after the PayPal SQL changes (security_api, security_api2, dast_injection, csp_runtime).
4. Docs: HANDOVER_CHECKLIST.md, SUPABASE_SETUP.md, TRANSFER.md (repo, Supabase project, hosting, domain), THIRD_PARTY.md, update REPORT.md.
5. Clean source package (`git archive` of the branch + SHA-256).
6. Real Supabase project: create (EU Frankfurt), run `server/schema.sql`, `select shop.set_owner('Inhaber', '<strong password>')`,
   put URL + publishable key into the hosting environment variables.

## Local test environment
`tests/start.sh` starts Postgres (db `shoptest`), Supabase stand-in :54321, Edge-function stand-in :54323, site :8780.
Owner login in the local test DB only: Inhaber / TestPasswort123! (synthetic).

## Stand 2026-11-06 – Supabase-Projekt eingerichtet (mit Erlaubnis von Ahmed)
- Organisation "Adam", Projekt "adam" (ref ybatftfjosggnvzzklsq, Region eu-central-1 Frankfurt).
- server/schema.sql in 3 Migrationen eingespielt (adam_shop_schema_1_core, _2_orders_customers, _3_admin_paypal_grants).
  Geprüft: 64/64 Funktionen identisch mit der lokal getesteten DB (Hash ohne Kommentare/Leerzeichen; shop.clean enthält
  die Steuerzeichen als echte Zeichen statt \u-Escapes, Funktionstest OK).
- Rechte geprüft: anon hat keinen Zugriff auf Schema/Tabellen von "shop", shop_srv_* nur service_role, RLS auf allen Tabellen.
- Supabase-Advisor (security): nur "RLS ohne Policy" (gewollt: kein direkter Tabellenzugriff) und "SECURITY DEFINER durch anon
  aufrufbar" für die 33 vorgesehenen API-Funktionen (gewollt; jede prüft Token/Rolle/Rate-Limit selbst). Keine weiteren Befunde.
- Inhaber-Konto "Inhaber" angelegt; Passwort wurde Ahmed privat mitgeteilt und steht NICHT im Repo.
  Zurücksetzen: im Supabase SQL Editor `select shop.set_owner('Inhaber', 'NEUES-LANGES-PASSWORT');`
- js/config.js enthält URL + publishable key (öffentlich gedacht).
- Shop meldet "ready" erst nach dem ersten Admin-Login (dann werden die Einstellungen hochgeladen).
- NICHT getestet: Live-Aufrufe gegen das echte Projekt aus dem Browser (Netzwerk der Arbeitsumgebung blockiert supabase.co).
- Offen: Edge Functions (PayPal) erst deployen, wenn PayPal-Zugangsdaten des Kunden vorliegen; E-Mail (Resend) optional.
