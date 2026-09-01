# Storefront — Page Overrides

Master: [`../MASTER.md`](../MASTER.md)

## Rules (override Master for `/` and `/shop/*`)

- **No staff links** in header, footer, or hero. Admin login lives at `/adminpoz` only (not indexed).
- **Light mode only** — stone background `#FAFAF9`, primary `#1C1917`, accent CTA `#A16207`.
- **Motion:** stagger product grid 300–450ms; respect `prefers-reduced-motion`.
- **Layout:** max-width `6xl`, consistent `px-4 sm:px-6`, card radius `1.5rem`.
- **Touch:** buttons min-height 44px, visible focus rings.

## Banner slot order (CMS)

| Slot | Position | Block types | Editor |
|------|----------|-------------|--------|
| `TOP` | Above sticky header | `ANNOUNCEMENT` | `/store/builder` |
| `HERO` | Homepage hero + bag card | `HERO` | `/store/builder` |
| `MID` | Between hero and catalog | `MID_BANNER`, `VERTICAL_PROMO` | `/store/builder` |
| `PRE_CATALOG` | Staff picks row | `FEATURED` (product slugs) | `/store/builder` |
| `FOOTER` | Pre-copyright CTA band | `FOOTER_CTA` + WhatsApp link | `/store/builder` |

Theme tokens from CMS map to CSS vars: `--sf-primary`, `--sf-accent`, `--sf-foreground`, fonts via `--sf-font-display` / `--sf-font-body`.

Repairs nav and promos respect `verticalFlags.repairs` from **Settings → Vertical modules**.
