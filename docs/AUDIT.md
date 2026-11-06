# Phase 1 – Project audit (6 Nov 2026)

## What the project is
- Static single-page shop (vanilla JavaScript, no framework, no build step, no package.json).
- Hosted on GitHub Pages (`x12aa10000-blip.github.io/adam-neuetalia`).
- 29 JS files (~8 000 lines), 4 CSS files, 55 fonts, ~400 product images (68 MB), one vendor lib (JSZip).
- Pages: shop (`index.html`) and owner area (`admin.html`), hash routing (`#/p/...`, `#/admin/...`).
- Features: product personalisation with live preview (text, photos, fonts, colours, options), gift box builder,
  gift cards, coupons, cart, checkout (pickup / Hamburg courier / DHL / EU), design approval, order tracking,
  customer accounts, wishlist, reviews, questions, gift assistant, 3 languages (DE / EN / AR with RTL),
  admin: orders pipeline, production, print files (PNG/PDF/ZIP), shipping labels, products, categories,
  customers, discounts, reviews, e-mails, website texts, settings, activity log.

## Backend / database / API / auth
There is **none**. Everything lives in the visitor's own browser (`localStorage` + `IndexedDB`).

## Findings (by priority)

| # | Severity | Component | Problem |
|---|---|---|---|
| 1 | **Critical** | whole shop | Orders are saved only in the customer's browser. The owner never receives them. |
| 2 | **Critical** | checkout | PayPal/card/Klarna/Apple Pay without a PayPal ID are *simulated* and the order is marked "paid". |
| 3 | **Critical** | checkout | Prices, discounts and totals are calculated only in the browser – anyone can change them. |
| 4 | **Critical** | admin | Admin login = PIN checked in the browser; default PINs `1234`/`0000`; admin data is local. Anyone can open the admin on their own device and "log in". |
| 5 | **Critical** | photos | Customer photos stay in the customer's IndexedDB – the owner can never print them. Admin product/website images are also local only. |
| 6 | High | e-mails | E-mails are simulated (in-page "mailbox"). No real confirmation / owner notification. |
| 7 | High | accounts | Customer accounts and password hashes are stored only in the browser; no login from another device. |
| 8 | High | social login | Google/Apple/Facebook login trusts data from the browser (no server verification); demo mode lets anyone "log in" as any e-mail on that device. |
| 9 | High | data | 3 fake example orders are seeded; "demo" notes on legal pages, invoices and labels. |
| 10 | High | legal | Impressum/AGB/Datenschutz contain placeholders (`DE000000000`, dummy IBAN), marked as demo. |
| 11 | Medium | coupons | All coupon codes and gift-card balances are readable/editable in the browser. |
| 12 | Medium | security headers | GitHub Pages cannot send headers; CSP only via `<meta>` (no `frame-ancestors`, HSTS controlled by GitHub). Frame-busting done in JS. |
| 13 | Medium | rate limiting | Only in `sessionStorage` – trivially bypassed. |
| 14 | Medium | code quality | Many "patch on patch" files (`v5.js`, `fix8.js`, `qa-fixes.js`, `i18n-fix.js` …) wrapping each other. |
| 15 | Low | performance | 68 MB images, 29 separate JS requests, 55 font files; full-page reveal leaves large blank areas while scrolling in screenshots. |
| 16 | Low | design | Client does not like the current look; brand name must change to **Adam**. |

Positive: HTML output is consistently escaped with `esc()`, no `eval`, CSP without `unsafe-inline` scripts,
PBKDF2 password hashing, `javascript:` links filtered in edit mode.

## Tools available in this session
- Available: Node 22, Python 3, Playwright + Chrome, ESLint, PostgreSQL 16 (local), psql.
- **Not available / cannot be installed (package installs are blocked in this session):** Semgrep, OWASP ZAP,
  Gitleaks, OSV-Scanner, Lighthouse, axe. Marked NOT TESTED where these would be needed;
  replaced by own Playwright/psql tests and manual review where possible.
- Skills used (already installed, from Anthropic): frontend-design, web-design-guidelines, design-taste-frontend.
  No third-party skills installed.

## Plan
1. Real backend on Supabase (Postgres, EU/Frankfurt): all data, server-side price check, admin login with
   password + server sessions, rate limits, row-level security, photos on the server.
2. Connect shop and admin to it without changing the existing features.
3. Remove all demo/fake parts (seed orders, simulated payments, demo login, demo mailbox).
4. Rename to **Adam**, complete legal pages (Impressum, Datenschutz, AGB, Widerruf, Versand) editable in admin.
5. New design.
6. Security tests (SQL/API abuse, price tampering, access control, XSS payloads, rate limits) + Playwright QA
   on mobile, tablet, desktop in DE/EN/AR.
7. Final report with PASS / FAIL / NOT TESTED.
