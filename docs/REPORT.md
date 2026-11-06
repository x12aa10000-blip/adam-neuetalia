# Adam – Final report (6 Nov 2026)

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
- Admin: colour picker removed (colours fixed by Figma), team & password management, e-mail setup, save indicator, reminder for missing legal data.

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
