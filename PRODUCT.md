# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Shoppers in Hamburg and across Germany (also EU) who want a personalised gift: a name, initial, date or photo on roses in a box, mugs, jewellery, cushions, keyrings, Spotify plaques, engraved wood. Many shop on a phone, many are not technical, many write in Arabic or German (DE / EN / AR with right-to-left).
- The shop owner and staff of the "Adam" gift shop on Steindamm 62, Hamburg, who run orders, production, shipping/pick-up, products, prices, coupons, reviews and site content from the admin panel, often in Arabic, on desktop and phone.

## Product Purpose
Let a customer type their text or upload a photo and see it right away on the real product, order it for pick-up, Hamburg courier or DHL on a chosen date, and let the shop turn that order into a finished gift. Success: customers order without help or confusion; the owner can change every detail of the site and run the day's work without calling a developer.

## Positioning
A real local workshop on Steindamm that makes each gift by hand the same day, with a live preview on the actual product photo, pick-up in the shop, and a fully trilingual (incl. Arabic RTL) shop and admin.

## Operating Context
- Customer flow: browse/occasion → product page with live personaliser → bag → checkout (pickup / local courier / DHL / EU, date, payment PayPal/card/Vorkasse/cash at pick-up) → order tracking, design approval, complaints, account.
- Admin flow: dashboard → orders → production (print files, sheets) → shipping & pick-up → products, categories, designer → coupons & gift cards → customers → reviews & questions → e-mails → site design (live edit mode) → settings (legal data) → activity log.
- Backend: Supabase (private schema, RPC functions only), PayPal via server Edge Functions.

## Capabilities and Constraints
- Static vanilla-JS single-page app (hash routes), no build framework; CSS files layered (base, theme, v5, v8, adam).
- All prices, stock and totals are re-checked on the server; the front end must never change business rules.
- The owner can recolour the site from the admin (4 colour pickers with Figma presets); the theme must keep working with those variables.
- German legal pages (Impressum, Datenschutz, AGB, Widerruf, Versand) are required.

## Brand Commitments
- Name: "Adam" (not "Adam & Neuetalia").
- Colours: only the Figma palette — #FE90BE pink, #6425FE purple (also alerts/errors), #01CAC9 turquoise (add buttons), #333333 text, #FFFFFF. No other hues, not even for error states. (Confirmed by Ahmed, repeated 2026-11-06.)
- The owner must be able to edit literally every detail of the site from the admin.

## Evidence on Hand
- Real product photos in img/ (roses, mugs, jewellery etc.) and the real shop address/phone in settings.
- No real customer reviews, press or sales figures may be invented; review data in the test DB is synthetic.

## Product Principles
1. Nobody gets lost: every screen says where you are, what you see and what to do next.
2. The gift is the hero: the live preview on the real product sells, chrome stays out of its way.
3. Never break a working flow: visual changes must not alter checkout, admin rights or server checks.
4. Trilingual equal citizens: Arabic RTL looks as finished as German.

## Accessibility & Inclusion
- Non-technical users on phones; large tap targets, readable contrast, RTL support, WCAG AA contrast on text.
