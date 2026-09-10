# Lighthouse mobile checklist (GRW-07)

Measure after deploy. Targets from RELEASE_GATE / Phase 1:

| URL | Perf | A11y |
|-----|------|------|
| `/shop` | ≥ 80 | ≥ 90 |
| `/products/[slug]` | ≥ 80 | — |
| `/shop/checkout` | ≥ 80 | — |
| `/` (landing) | — | ≥ 90 |

## Commands

```powershell
# Requires Chrome. Uses npx (no permanent dep required).
$env:BASE = "https://grabber-poz-solo.vercel.app"
npm run lighthouse:shop
npm run lighthouse:product   # uses /products demo slug or LH_PRODUCT_SLUG
npm run lighthouse:checkout
```

JSON reports land in `reports/lh-*.json` (keep gitignored).

## Pass criteria

- [ ] Mobile form-factor, throttling default
- [ ] Performance ≥ 80 on shop + product + checkout
- [ ] Accessibility ≥ 90 on `/` and `/shop`
- [ ] No staff chrome on public storefront

## Notes

- Auth walls / empty catalog can tank scores — use seeded demo tenant.
- Do not block CI on Lighthouse until fleet matrix is stable.
