# Clean Report — Architecture · Quality · Dead Code

**Project:** Grabber POZ Solo  
**Date:** 2026-09-18  
**Branch context:** `dev`  
**Tools:** knip 6.36, manual architecture review, Wave A optimization context  
**Agents requested:** `/architect`, `/refactor-cleaner`, `/refactor-clean`, `/agent-analyze-code-quality`  
*(Subagent spawn hit model limits — analysis + SAFE deletions executed on main thread.)*

---

## Code Quality Analysis Report

### Summary
- **Overall Quality Score:** 6.5 / 10
- **Files Analyzed:** knip full graph + hotspots (POS, products, storefront, company, auth, commerce)
- **Issues Found:** High complexity in 5 god UI files; ~19 unused files flagged; 113 unused exports (mostly intentional public API / agent handlers)
- **Technical Debt Estimate:** ~40–60 eng hours to Wave B+C (split POS/products, server catalog, lazy motion) + optional dep prune

| Dimension | Score | Notes |
|-----------|------:|-------|
| Readability | 6/10 | Clear service names; UI pages too long |
| Maintainability | 5/10 | Monolith client pages; dual landing modes OK |
| Performance | 6/10 | Wave A landed; Wave B still open |
| Security | 7/10 | Demo PIN gated; seed PIN ops debt remains |
| Best practices | 7/10 | Drizzle SSOT, assertCanMutateCommerce hub |

---

## Architecture Assessment

### 1. Layered model (healthy spine)

```text
Browser / Coolify domain
  → Next.js App Router (src/app/**)
    → middleware (public vs staff RBAC)
      → API routes / RSC pages
        → lib/* services (commerce, restaurant, auth, storefront)
          → src/db/schema.ts + Drizzle
            → dedicated Postgres per tenant
```

- **SSOT schema:** `src/db/schema.ts` + `drizzle/migrations/`
- **Commerce core:** `pos-checkout-service.ts`, inventory/payment engines
- **Config / fleet:** `LANDING_MODE`, `business-settings`, vertical flags
- **Agents:** propose → Approval Center (R6) — `docs/AGENTS.md`

### 2. Hotspots (god files)

| File | ~LOC | Risk |
|------|-----:|------|
| `src/app/pos/page.tsx` | 1725 | God UI — cart/pay/holds/print |
| `src/app/products/page.tsx` | 1614 | God admin |
| `src/components/company/CompanyLanding.tsx` | 918 | Marketing monolith |
| `src/components/ui/app-header.tsx` | 856 | Staff nav hub (now dynamic on public) |
| `src/components/storefront/storefront-home.tsx` | 662 | Catalog + cart client |

### 3. Landing mode (correct for fleet)

- **Company / demo hosts** → `CompanyLanding` at `/`
- **Client domains** → `StorefrontHome` at `/`
- Resolver: `src/lib/config/landing-mode.ts`
- Wave A: dynamic `import()` so only one graph loads

### 4. Dual-session auth risks

| Session | Cookie / path | Risk |
|---------|---------------|------|
| Staff | HMAC PIN session | Seed PIN `1234` on live DB (ops) |
| Shopper | Customer cookie | OK if anon GET 200 |

Supervisor PIN via `/api/pos/supervisor-pin` (no session swap) — good.

### 5. Single-tenant fleet implications

- Same image, **different** `DATABASE_URL` + `AUTH_SECRET` + `LANDING_MODE`
- Never share Postgres across clients
- Themes / WhatsApp / Meta are per-instance env

### 6. Architectural recommendations (P0–P2)

| Pri | Recommendation | Aligns with |
|-----|----------------|-------------|
| **P0** | Keep commerce mutations in services; never price on client | Current design |
| **P0** | Ops: rotate seed PINs; seed stock on golden tenant | SSOT backlog |
| **P1** | Split POS into cart / pay / holds / print modules | Wave C |
| **P1** | Server-render catalog for storefront first paint | Wave B |
| **P1** | Lazy / drop framer-motion on shop home | Wave B |
| **P2** | Split products admin by tab | Wave C |
| **P2** | Bundle analyzer CI budget | Wave C |
| **P2** | Defer CompanyLanding below-fold | Wave B |

---

## Critical Issues

1. **God UI files (POS / products)**  
   - File: `src/app/pos/page.tsx`, `src/app/products/page.tsx`  
   - Severity: High (maintainability)  
   - Suggestion: Extract panels; route-level dynamic imports (Wave C)

2. **Live conversion blocked by empty / weak catalog data**  
   - Severity: High (product)  
   - Suggestion: Seed + stock on Contabo golden tenant (ops, not code)

3. **113 “unused” exports (knip)**  
   - Severity: Low–Medium noise  
   - Suggestion: Most are agent handlers / engines imported dynamically or via barrel — **do not mass-delete**

---

## Code Smells

- **Large classes/pages:** POS, products, CompanyLanding, AppHeader  
- **Duplicate fetch pattern (mitigated):** shopper session now deduped (Wave A)  
- **Feature envy:** storefront still client-fetches catalog instead of RSC  
- **Dead UI leftovers:** AnnouncementBar / ProductPromoBadge were unmounted (removed this pass)  
- **Deprecated legacy path:** `app-collections.ts` (removed)  
- **Dependency shelf:** Radix + CVA + zustand flagged unused — likely future shadcn; **kept**

---

## Refactoring Opportunities

| Opportunity | Benefit |
|-------------|---------|
| RSC catalog for `/` storefront | Faster LCP, less `/api/pos/catalog` |
| Split POS | Safer print/checkout changes |
| Lazy motion on storefront | Smaller shop JS |
| Paginate catalog | Shorter mobile pages |
| Optional knip allowlist for agents | Cleaner dead-code signal |

---

## Positive Findings

- Single-business / dedicated DB model is clear and documented  
- Mutate gate (`assertCanMutateCommerce`) is a real hub  
- Wave A: landing split, AppShell slim, shopper dedupe, `next/image`  
- Auth demo bypass gated off production  
- Print path isolated; thermal docs present  
- Lighthouse scripts exist (`lighthouse:shop`)

---

## Dead Code Cleanup (`/refactor-clean`)

### Baseline
- Tests before: `landing-mode` + `shopper-session` **PASS** (7 tests)  
- knip: 19 unused files, 14 unused deps, 113 unused exports  

### Deleted (SAFE) — this pass

| Path | Reason | Approx lines |
|------|--------|-------------:|
| `src/components/storefront/AnnouncementBar.tsx` | Zero imports; CMS announcement uses shell inline | ~54 |
| `src/components/storefront/ProductPromoBadge.tsx` | Zero imports | ~20 |
| `src/lib/db/app-collections.ts` | Deprecated legacy collections; zero callers | ~40 |
| `src/lib/creative/types.ts` | Duplicate/unused type module; zero imports | ~12 |
| `src/lib/social/publish-links.ts` | Zero code imports (docs-only mention) | ~56 |
| `src/lib/commerce/promotions/index.ts` | Unused barrel; engines imported via subpaths | ~3 |
| `src/lib/jarvis/brain.ts` | Closed-loop brain unused by routes/UI | ~114 |

**Saved:** ~**300 lines** / 7 files  

### Skipped (CAUTION / DANGER)

| Item | Tier | Why skipped |
|------|------|-------------|
| `themes/mypoz-*.css` | CAUTION | Published / design assets (`THEME_21ST_SYNC`) |
| `public/sw.js` | CAUTION | May be referenced by PWA tooling later |
| `scripts/*` (disaster-recovery, seeders, etc.) | CAUTION | Ops CLI, not app imports |
| `@radix-ui/*`, `clsx`, `cva`, `zustand`, `sonner` | CAUTION | Likely shadcn/UI shelf — removing breaks future UI |
| `eslint` / `eslint-config-next` | CAUTION | Lint toolchain |
| Agent `run*Agent` exports | DANGER | Registry/dynamic agent API surface |
| Auth session re-exports | DANGER | Middleware / edge boundary |
| Error classes / engines | DANGER | Thrown/caught across commerce |

### Verification after deletions
```text
npm test -- tests/landing-mode.test.ts tests/shopper-session.test.ts
→ 7 passed

npx tsc --noEmit
→ exit 0
```

---

## Wave A corrections already in tree (context)

Not deleted this pass — previously implemented optimizations:

| Change | Status |
|--------|--------|
| Mode-gated `/` dynamic imports | Done |
| Dynamic `AppHeader`; `/pricing` `/locations` bare | Done |
| Deduped shopper session cache | Done |
| `next/image` on catalog + categories | Done |
| Checkout label a11y | Mostly pre-done + phone hint |

See `docs/WAVE_A_OPTIMIZATION.md`.

---

## Checks & balances (ongoing)

| Gate | Pass rule |
|------|-----------|
| Dead code | Only SAFE deletes; re-run focused tests + `tsc` |
| Fleet | `LANDING_MODE=company` HQ; `storefront` clients |
| Perf | `npm run lighthouse:shop` ≥80 before client go-live |
| God files | No new >800 LOC pages without split plan |
| Deps | Do not mass-remove Radix until shadcn decision |

---

## Next steps

1. **Wave B0** — Restore & wire deleted product ideas (AnnouncementBar, badges, publish-links, jarvis brain API, types/barrel). Keep `app-collections` deleted.
2. **Wave B1–B2** — Server catalog + `HERO_SLIDER` + rich banners (see `docs/WAVE_B_C_ROBUSTNESS_PLAN.md`).
3. Contabo golden tenant seed + PIN rotate.
4. Re-run knip after Wave B; still skip agent/auth exports.  

---

## Dead Code Cleanup Summary

```
Dead Code Cleanup
──────────────────────────────
Deleted:   7 unused files
           (~300 lines)
           0 unused npm deps (intentionally kept)
Skipped:   themes, scripts, radix/zustand shelf,
           agent/auth/commerce public exports
Saved:     ~300 lines removed
──────────────────────────────
Focused tests + tsc: PASS
```
