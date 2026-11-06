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
