# Wave A — Code & UI optimization (checks)

**Branch target:** `dev`  
**Status:** Implemented 2026-09-11

## Scope completed

| # | Item | Check |
|---|------|--------|
| A1 | Mode-gated `/` dynamic imports | Only Company **or** Storefront chunk loads |
| A2 | AppShell: dynamic `AppHeader`; `/pricing` `/locations` bare | No staff mesh on marketing SEO pages |
| A3 | Deduped shopper session | Shell + home share one `/api/auth/shopper` |
| A4 | `next/image` on catalog + categories | Lazy layout; `unoptimized` for multi-tenant URLs |
| A5 | Checkout labels | Already wired; phone `aria-describedby` linked |

## Verify locally

```powershell
npm test -- tests/landing-mode.test.ts tests/shopper-session.test.ts
npx tsc --noEmit
# optional after seed:
npm run lighthouse:shop
```

## Coolify / fleet

- HQ / demo: `LANDING_MODE=company`
- Clients: `LANDING_MODE=storefront`

## Exit gate → Wave B

- [ ] Lighthouse mobile shop ≥80 (or baseline recorded)
- [ ] DevTools Network on `/shop`: one shopper GET (not two)
- [ ] Client `/` shows shop; company host shows marketing
- [ ] No staff header on `/pricing`

## Next: Wave B

Server catalog for first paint, lazy framer-motion, catalog pagination, company below-fold defer.
