# Adam – Final report (6 Nov 2026, second-stage security verification added)

Branch: `production-ready` (not yet merged into `main`, so the live site is unchanged).
All results below come from tests that were actually run in this session. Anything that could not be run is marked **NOT TESTED**.

## 1. Initial condition
Static shop (vanilla JS, GitHub Pages) without any server: orders, photos, accounts, admin data and e-mails existed only in the visitor's own browser; payments were simulated and marked "paid"; admin login was a browser-side PIN (`1234`/`0000`). Details: [AUDIT.md](AUDIT.md).

## 2. Skills installed (all from the official repositories, files inspected before installing, no install scripts executed)
| Skill | Source |
|---|---|
| frontend-design, webapp-testing | github.com/anthropics/skills |
| impeccable | github.com/pbakaus/impeccable |
| ui-ux-pro-max | github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| web-design-guidelines, react-best-practices | github.com/vercel-labs/agent-skills |
| semgrep, sharp-edges, differential-review, entry-point-analyzer, fp-check, supply-chain-risk-auditor | github.com/trailofbits/skills |
| systematic-debugging, verification-before-completion, requesting-code-review, test-driven-development | github.com/obra/superpowers |

Not installed: "OWASP Security Review" (no official skill found), Trail of Bits `insecure-defaults` (package incomplete). The Semgrep/ZAP/Gitleaks/OSV programs themselves could not be installed (package downloads blocked in this environment).

## 3. Vulnerabilities found
| # | Severity | Component | Problem |
|---|---|---|---|
| 1 | Critical | Orders | Orders never reached the shop (browser-only). |
| 2 | Critical | Checkout | Prices and totals calculated only in the browser – could be changed by anyone. |
| 3 | Critical | Payments | PayPal/card/Klarna/Apple Pay simulated and marked "paid". |
| 4 | Critical | Admin | PIN login checked in the browser, demo PINs, admin reachable on any device. |
| 5 | Critical | Photos | Customer photos never reached the shop. |
| 6 | High | Accounts | Accounts + password hashes stored in the browser. |
| 7 | High | Social login | Google/Apple/Facebook login trusted browser data (impersonation possible). |
| 8 | High | Rate limiting | Only in `sessionStorage`. |
| 9 | High | **New code, found by tests** | Brute-force lock did not count failed logins (database rolled back the counter together with the error). |
| 10 | High | Privacy | Google Maps loaded automatically (IP sent to Google without consent). |
| 11 | Medium | Coupons | All codes readable in the browser. |
| 12 | Medium | Legal | Placeholder Impressum/AGB marked as demo. |
| 13 | Low | Shipping label | Fake barcode on labels. |

## 4. Fixes
- Server on Supabase (Postgres): all data in a private schema not reachable through the API; the browser can only call 30 checked functions (`server/schema.sql`).
- Server recalculates every price, option, gift-box component, coupon, gift card, shipping and VAT; mismatches are rejected.
- Orders are never "paid" by the browser; PayPal only with a real PayPal client ID, otherwise bank transfer / cash on pickup.
- Admin: user name + password (bcrypt), server sessions (12 h, hashed tokens), roles owner/staff checked on the server, logout and removal end sessions immediately.
- Customer accounts on the server (bcrypt, 30-day sessions, password reset link valid 1 h, no account enumeration).
- Rate limits on the server for login, register, order, coupon, gift card, tracking, uploads, reviews, questions.
- Photo uploads: random 160-bit ids, type and size checks, unused uploads deleted after 3 days, order photos 90 days after completion.
- Social login removed; Google Maps only after a click; legal pages complete (DDG, DSGVO, AGB, statutory Widerrufsbelehrung, no outdated ODR link).
- Strict CSP (no inline scripts), no `javascript:` links, all output escaped (existing).

## 5. Remaining risks
- GitHub Pages cannot send real security headers (CSP only via `<meta>`, no `frame-ancestors`; JS frame-busting in place). Moving to Netlify/Cloudflare Pages would allow proper headers.
- PayPal payments are not verified server-side automatically: the order shows the PayPal reference; the owner confirms payment in PayPal.
- E-mails are sent only after a Resend key and a verified domain are configured (until then: confirmation page + PDF invoice, owner sees orders live with sound).
- Newsletter: e-mails are collected with consent, but double opt-in mail requires the e-mail setup.
- Admin session token lives in `localStorage` (risk only if an XSS existed; none found).
- Legal texts are carefully written but are not legal advice – recommended: one check by a lawyer / legal-text service.
- Owner must fill in: full owner name, tax number / VAT ID, real IBAN, official e-mail (the admin shows a reminder until done).

## 6. Security test results
`tests/security_api.py` – 60 tests against the real database functions: **60 PASS, 0 FAIL**
(table permissions, internal functions, price/quantity/gift card/gift box tampering, disabled payments, SQL injection, control characters, IDOR on orders/approval/cancel/complaint, admin without/with wrong/customer token, staff restrictions, password-hash leakage, spam relay via admin mail, session end on logout/removal, brute force per IP and per account, coupon and order-number scanning, password policy, profile field tampering, upload id/type/content checks, public data leakage).

| Check | Status |
|---|---|
| Authentication & authorisation tests | PASS |
| Input validation / API tests | PASS |
| Session tests | PASS |
| Secret scan (manual: repo contains no keys; Supabase key is the public one by design) | PASS (manual) |
| SAST with Semgrep | NOT TESTED (tool not installable here) |
| DAST with OWASP ZAP | NOT TESTED (tool not installable here) |
| Dependency scan (OSV/npm audit) | NOT TESTED – only dependency is vendored JSZip; no package manager |
| Security headers | PARTIAL – CSP via meta present; HTTP headers not possible on GitHub Pages |

## 7. UI/UX
- Strict Figma palette everywhere (`css/adam.css`): #FE90BE, #6425FE, #01CAC9, #333333, #FFFFFF (+ transparency).
  Automated audit of all computed colours on 17 shop + 6 admin pages, mobile and desktop: **0 colours outside the palette** (`tests/palette_audit.py`).
- WCAG AA contrast audit of all visible text on 12 pages × 2 sizes: **0 failures** (`tests/contrast_audit.py`).
- New "Adam" wordmark + favicon, one type family (Poppins / IBM Plex Sans Arabic), consistent buttons (pink = main action, turquoise = add to bag, purple = alerts/errors), calmer header, white headings on dark bands, gift card graphic in palette.
- Colours are fully editable by the owner (Admin › Website › Logo & Farben): main colour, add-to-bag colour, alerts/errors, text – Figma presets plus any free colour, one-click reset to Figma. Every shade in the CSS is mixed from these four colours, and the text on buttons switches between dark and white automatically to stay readable (tested: dark green → white button text).
- Admin: team & password management, e-mail setup, save indicator, reminder for missing legal data.

## 8. Performance (simulated mobile 4G, local server)
| Page | LCP before | LCP after | CLS before | CLS after |
|---|---|---|---|---|
| Home | 6.1 s | 1.8 s | 0 | 0.003 |
| Product | 6.4 s | 2.1 s | 0.168 | 0.009 |
| Checkout | – | 1.8 s | – | 0.008 |
Changes: scripts no longer block rendering (`defer`), canvas size reserved, serif fonts no longer loaded.

## 9. Automated QA
- `tests/qa_pages.py`: 328 page loads (all routes + every product page, DE/EN/AR, mobile/tablet/desktop): **0 JS errors, 0 overflow, 0 broken images, 0 dead links**. (Only the external Spotify-code image cannot load inside this sandbox; the built-in fallback is shown.)
- `tests/e2e_full.py`: **28 PASS, 0 FAIL** – register, wrong password, logout/login, login on 2nd device, password reset form, wishlist sync, photo product order, owner downloads photo, status change visible to customer, owner coupon at checkout, unknown coupon, price change while in checkout, auto re-pricing of the bag, cancel within window, review moderation, staff login/permissions/logout, no JS errors.
- Password recovery e-mail delivery: **NOT TESTED** (needs Resend key + domain).
- Real Supabase project: **NOT TESTED** (account not created yet) – tested against the identical SQL on PostgreSQL 16 with a local stand-in for the Supabase API.

## 10. Dependencies
- `vendor/jszip.min.js` (vendored). No npm/pip dependencies at runtime.
- Supabase (database), optional PayPal JS SDK, optional Resend (e-mail).

## 11. Before going live
1. Create the Supabase project (EU/Frankfurt), run `server/schema.sql`, create the owner password, put URL + public key into `js/config.js`.
2. Owner fills in: legal data (Impressum), IBAN, e-mail, opening hours; changes the password.
3. Optional: PayPal client ID; Resend key + own domain for e-mails.
4. Merge `production-ready` into `main` (GitHub Pages publishes it).
5. One real test order on the live site, then delete it in the admin.
6. Recommended: own domain; check of the legal texts by a lawyer.


---

# Second-stage production security verification (6 Nov 2026, 02:20–)

Scope: only the areas that were untested or partial in the first report. Nothing was deployed, no branch was merged,
only local systems and synthetic accounts/data were used, no destructive or denial-of-service tests were run.

## A. Tool installation (Semgrep, OWASP ZAP, OSV-Scanner) – **NOT POSSIBLE in this environment**
Every verified installation route was tried and is blocked by the session's network policy:

| Route | Result (evidence) |
|---|---|
| `pip download semgrep` (PyPI) | DNS for pypi.org fails – `NameResolutionError` |
| Docker images `semgrep/semgrep`, `ghcr.io/zaproxy/zaproxy` | no Docker daemon (`/var/run/docker.sock` missing) |
| GitHub release binaries (osv-scanner) | proxy answers `403` |
| Go module proxy (to build osv-scanner from source) | DNS for proxy.golang.org fails |
| OSV API (api.osv.dev) | blocked |

No unofficial mirrors or workarounds were used. **Semgrep, ZAP and OSV-Scanner: NOT TESTED.**
How to run them later: enable package downloads for pypi.org / github.com release assets in the claude.ai network settings
(new chat) or run them on any computer with internet:
`pipx run semgrep scan --config p/javascript --config p/xss --config p/secrets js/ server/`,
`docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t <staging-url>`,
`osv-scanner scan source -r .` (note: the repo has no lockfile; the only third-party code is `vendor/jszip.min.js`).

Replacement checks that **were** run (each with a positive control that proves the check can find something):

| Check | Tool | Result |
|---|---|---|
| DOM-XSS SAST over all 30 JS files (AST-based, every HTML template, nested `.map()` and helpers) | `tests/sast_dom_xss2.mjs` (TypeScript compiler API) | 25 candidates → manual triage: **2 real, fixed** (coupon value shown unescaped in shop and admin; product field labels from the designer in 10 places unescaped – both only exploitable via the owner account); 1 functional e-mail bug fixed (relative links); remaining 12 = constants/numbers (false positives, listed in the tool output) |
| JS security rules (`no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`, …) | ESLint 10 | **0 findings**; control file with 3 planted issues → 3 found |
| Secret scan over all 34 commits of all branches | `tests/secret_scan.py` (Gitleaks-style patterns) | **0 real secrets**. 5 hits = synthetic passwords for the local test database inside `tests/` (not production credentials). Control: scanner finds them. |
| Dependency check | manual SCA + advisory search | `jszip 3.10.1` (vendored): CVE-2021-23413 fixed in 3.7.0, CVE-2022-48285 fixed in 3.8.0; vulnerable `loadAsync` is not used (shop only creates ZIPs). **No known open advisory.** PayPal SDK is loaded live from paypal.com (SRI not possible by design) – only when a PayPal client ID is set. |
| Stored injection DAST | `tests/dast_injection.py` (Playwright, local) | **PASS**: payloads in 18 customer-controlled fields, rendered on 18 owner + customer pages: 0 HTML elements created, 0 scripts executed; all 18 fields proven to be displayed (as text). |
| CSP runtime test | `tests/csp_runtime.py` | **PASS** on shop and admin: inline script, inline event handler, `eval`, `new Function`, string timer, `fetch` / image / form to a foreign host, `<object>` – all blocked by the browser. (First run showed eval/form not blocked: verified as a DevTools-evaluation exemption and a wrong test criterion; re-tested as normal page script → blocked, evidence: console "The request has been blocked", no request reached the foreign host.) |

## B. Database permissions & Supabase policies – `tests/security_api2.py` **38 PASS / 0 FAIL**
- Roles `anon` and `authenticated` can execute **only** the 33 `public.shop_*` API functions; no table privilege in `shop`/`public`; no USAGE on schema `shop`; no access to the order-number sequence; secrets table not readable.
- Row Level Security enabled on all 9 `shop` tables (no policies = no direct access; defence in depth).
- **Hardened:** all 60 functions now have a fixed `search_path` (Supabase linter `function_search_path_mutable`).
- Live Supabase project settings: **NOT TESTED** (project not created yet). Checklist for setup: Data API exposed schemas = `public` only (default); disable **Auth → Email sign-ups** (Supabase Auth is not used); enable MFA on the Supabase and GitHub accounts; keep the `service_role` key out of the site (only the publishable key goes into `js/config.js`).

## C. Every sensitive operation is checked on the server
| Operation | Server function | Protection (verified by tests) |
|---|---|---|
| Place order | `shop_order_place` | prices, options, gift box, coupon, gift card, shipping, VAT, date, payment method, **stock (new)**, input limits recalculated/checked; rate limit; customer id only from session token |
| View / cancel / complain / approve order | `shop_order_get`, `_cancel`, `_complaint`, `_approve`, `_by_token` | order no + e-mail or 256-bit approval token; cancel only status "neu" within window; rate limits per IP and **per order number (new)** |
| Customer account | `shop_cust_*` | bcrypt, 30-day hashed session tokens, whitelisted profile fields, deletion with session revoke |
| Password reset | `shop_cust_pw_forgot`, `shop_cust_pw_reset` | identical answer for unknown e-mails, 256-bit token stored as SHA-256, 1 h, single use, all sessions revoked, link base from owner settings only |
| Owner/staff | `shop_admin_*` | bcrypt, 12 h sessions, role check per call (staff: orders/e-mails/reviews/questions only), owner-only team/mail/settings/prices, logout and removal end sessions |
| Uploads | `shop_photo_put`, `shop_admin_photo_put` | random 160-bit ids, MIME whitelist, base64 + size check, auto-deletion |
| E-mail | `shop_admin_mail`, server templates | only to addresses of that order/shop; subject without line breaks (**new**); key never returned |

## D. HTTP security headers & CSP
- **CSP tightened (new):** `connect-src` and `img-src` no longer allow every HTTPS host – only own site, `*.supabase.co`, PayPal (per PayPal's CSP guidance) and the Spotify-code image host. Runtime test PASS (see A).
- Note for the owner: if the optional AI endpoint of the gift assistant is used, its domain must be added to `connect-src`.
- **Real HTTP headers on GitHub Pages: NOT TESTED** (github.io not reachable from here). GitHub Pages cannot set custom headers, so `frame-ancestors`, `X-Frame-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` are **not available** there (JS frame-busting is in place). Recommended for production: Netlify or Cloudflare Pages with
  `Content-Security-Policy` (same as meta + `frame-ancestors 'none'`), `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin`.

## E. PayPal – review (status: **client-side only, not verified on the server**)
Current flow: PayPal buttons appear only when the owner enters a PayPal client ID. The shop first asks the server to check the
order (dry run, incl. total), then PayPal captures the payment **in the browser**, then the order is saved with the PayPal
reference; the order stays "unpaid" until the owner confirms it. **Risk (High if the owner marks orders paid without checking):**
a manipulated browser could pay a smaller amount to PayPal and still create the order; the order shows the correct server total
and the PayPal reference, so the owner must compare the amount in PayPal before marking "paid".
Needed for real server-side verification (not implemented, not testable here – no PayPal sandbox access):
1. A Supabase Edge Function holding the PayPal **client secret** (never in the browser).
2. `create-order`: the function reads the order total from the database and calls PayPal `POST /v2/checkout/orders` with that amount, `currency_code: EUR` and `custom_id` = order number.
3. `capture-order`: the function calls `POST /v2/checkout/orders/{id}/capture`, checks `status = COMPLETED`, amount and currency equal the stored total, `custom_id` matches, and only then sets the order to "paid".
4. A PayPal **webhook** (`PAYMENT.CAPTURE.COMPLETED`, `…REFUNDED`) verified with `POST /v1/notifications/verify-webhook-signature`, as a backup for closed browser windows.

## F. E-mail & password recovery
- Verified (local): reset flow (8 tests in B), no account enumeration, rate limits, header-injection protection, key never exposed, owner-only mail setup. **PASS.**
- **NOT TESTED:** actual delivery through Resend (no key/domain, outbound network blocked). Before use: verify the sending domain in Resend and set **SPF, DKIM and DMARC** DNS records; the Resend key is stored in the private `shop.secrets` table (not reachable via the API) – recommended upgrade: Supabase Vault.
- Password recovery requires the shop address in Admin › Einstellungen › Rechtliches (filled automatically on the owner's first HTTPS login).

## G. Session storage & XSS exposure
- Admin token (12 h) and customer token (30 days) are kept in `localStorage`; server stores only SHA-256 hashes; logout/removal/password reset revoke them (tested).
- Readable by any script on the page, so they depend on the absence of XSS: SAST + DAST + CSP above found no exploitable XSS. **Residual risk Medium**; options: shorter admin sessions, admin token in `sessionStorage`.
- **Fixed (new):** guest orders cached on a device (e.g. a shared shop tablet) are now kept for 48 h only; logged-in customers load theirs from the server.

## H. Customer-to-customer isolation – **PASS** (8 tests in B with two synthetic accounts)
A cannot list, read, cancel or complain about B's orders, cannot change B's profile, cannot attach an order to B's account; order tracking requires order number + e-mail (limited per IP and per order number).
Design note: whoever knows **both** an order number and the customer's e-mail can view that order (same model as most shops); numbers are sequential, so the per-order limit is the protection.

## I. New fixes in this stage
| Severity | Fix |
|---|---|
| Medium | Server now enforces stock (orders above stock were possible via the API) |
| Medium | Stored-XSS hardening: coupon values escaped + server rejects non-numeric coupon values; product field labels escaped (10 places) |
| Medium | CSP `connect-src` / `img-src` restricted to used hosts |
| Medium | Per-order-number limit on order lookup |
| Medium | Fixed `search_path` on all internal functions |
| Low | E-mail subject line breaks stripped; e-mail button links absolute + escaped |
| Low | Guest order cache on shared devices limited to 48 h |

All regression suites re-run after the fixes: security 60/60, security stage 2 38/38, end-to-end 28/28, DAST PASS, CSP runtime PASS, palette 0, page sweep unchanged (only the sandbox-blocked Spotify image).

## J. Remaining risks (not hidden, not downgraded)
| Severity | Risk |
|---|---|
| High | PayPal payments not verified server-side (see E). Mitigation until fixed: keep PayPal off, or owner checks amount in PayPal before marking paid. |
| Medium | No real HTTP security headers on GitHub Pages (no `frame-ancestors`, HSTS controlled by GitHub). |
| Medium | Session tokens in `localStorage` (XSS-dependent). |
| Medium | Per-IP rate limits rely on Supabase passing the real client IP (`cf-connecting-ip`); not verifiable without the live project. Per-account / per-order limits do not depend on it. |
| Medium | Semgrep, ZAP, OSV-Scanner not run (blocked); replaced by the checks in A. |
| Low | Synthetic test passwords for the local test DB in `tests/` (not production). |
| Low | E-mail delivery, SPF/DKIM/DMARC untested until a domain is set up. |

## K. Exact production-readiness status
**NOT READY for live customer orders yet** – the code is ready, but these blocking items are open:
1. Supabase project not created; schema not run on the real project; nothing tested against real Supabase (**blocking**).
2. Owner's legal data (full name, tax number / VAT ID, IBAN, official e-mail) not filled in (**blocking**, legal requirement).
3. Owner password must be set via `select shop.set_owner(...)` on the real project (**blocking**).
4. PayPal must stay **off** until server-side verification exists, or the owner checks every PayPal payment manually.
5. Recommended before launch: one real test order on the live site; e-mail domain + Resend; hosting with real security headers; Semgrep/ZAP/OSV run on a machine with internet; legal texts checked by a lawyer.

Ready now (tested locally): bank transfer and cash-on-pickup orders end to end, owner/staff admin, accounts, password reset logic, uploads, legal pages, design.
