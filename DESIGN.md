# Design – "Wrapping counter"

The shop is the florist's counter at the moment a gift is wrapped. Implemented in `css/studio.css` (loaded last; visual only, no logic).

## Colour (pinned – Figma only)
| Token | Value | Job |
|---|---|---|
| `--pk` | #FE90BE | primary buttons, tissue sheets (`--tissue` 10 %, `--tissue-2` 20 %, `--tissue-3` 34 %), badges |
| `--tq` | #01CAC9 | the ribbon: band under header/sheets/footer, every add-to-bag action, free-shipping bar |
| `--pu` | #6425FE | alerts, errors, focus ring, sale tag – nothing decorative |
| `--ink` | #333333 | text, current place (nav, chips, steps), secondary buttons on hover |
| `--wh` | #FFFFFF | paper (ground), greeting cards |
All tints are the theme colours with transparency, so the owner's four colour pickers in the admin recolour everything. No other hue anywhere (`tests/palette_audit.py` = 0).

## Type
Jost (self-hosted, 400/500) for UI and headlines, IBM Plex Sans Arabic for Arabic. Headlines 500, tracking −0.02 to −0.035em (0 in Arabic). Numbers tabular.

## Shape & depth
Radius 8 / 10 / 14 px (paper, not pills). Shadows are paper on paper: short offset + soft blur (`--sh`, `--sh-card`, `--sh-l`). No hard offset shadows, no glass, no gradients.

## Signature elements
- **Tissue sheets**: the hero copy and the order totals lie on a second sheet, slightly turned (desktop only; flat on phones).
- **Greeting card**: product cards carry name, price and the add button on a small white card that overlaps the photo.
- **Ribbon**: a 3 px turquoise band ties header, drawer head, totals card, footer and mobile tab bar.

## Admin (Operate)
Same world, quieter: white work surface, tissue sidebar with four visual groups (Tagesgeschäft · Sortiment · Kunden & Kontakt · Shop), ink for the current page, hairline cards, ribbon under the bar. On phones the menu button is pinned and always visible.

## Behaviour rules kept in CSS
- Dropdowns open/close by click only (no hover/focus holding them open).
- Chip filter strips wrap on screens ≥ 861 px (no hidden sideways strips on computers); they scroll sideways only on phones.
- `prefers-reduced-motion` disables transitions and the turned sheets.
