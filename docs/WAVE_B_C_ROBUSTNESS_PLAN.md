# Robustness Plan — Restore Ideas · Storefront Design · Waves B/C

**Date:** 2026-09-18  
**Principle:** Improve unused ideas by wiring them into CMS/`--sf-*` — do **not** leave product concepts deleted.  
**Exception:** `app-collections.ts` stays deleted (legacy JSON collections; Postgres is SSOT).

Skills used: ui-ux-pro-max, design-system (token layers), code-architect framing, ruflo (when to swarm), cleanreport context.

---

## 1. Verdict on deleted items

| Deleted | Status | Action |
|---------|--------|--------|
| `AnnouncementBar.tsx` | **RESTORE & UPGRADE** | Wire into `StorefrontShell` for `ANNOUNCEMENT` blocks (promoCode, CTA, countdown, dismiss) |
| `ProductPromoBadge.tsx` | **RESTORE & UPGRADE** | Show on catalog cards from active promotions API |
| `publish-links.ts` | **RESTORE** | Re-home under Social / Creative publish UI |
| `jarvis/brain.ts` | **RESTORE as stub → API** | Behind `/api/jarvis/brief` or agents brief — not dead file |
| `creative/types.ts` | **RESTORE** | Shared types for creative studio |
| `commerce/promotions/index.ts` | **RESTORE barrel** | Public import path for engines |
| `app-collections.ts` | **KEEP DELETED** | Deprecated; never restore |

CMS already has announcement text in shell — AnnouncementBar makes it **richer**, not duplicate chaos.

---

## 2. What storefront already has vs needs

### Already implemented
| Feature | Where |
|---------|--------|
| TOP announcement text | `StorefrontShell` + block `ANNOUNCEMENT` |
| Hero (title/CTA/media URL) | `storefront-home` + `HERO` block |
| Mid banner | `storefront-blocks` `MID_BANNER` |
| Featured products | `FEATURED` block |
| Vertical promo strips | `VERTICAL_PROMO` |
| Promo popup + countdown | `PromotionPopup` |
| Theme tokens | `--sf-primary`, `--sf-on-surface`, etc. |
| Landing mode | company vs storefront |

### Missing (unique upgrades — build these)
| Feature | Why |
|---------|-----|
| **Hero slider / carousel** | No `HERO_SLIDER` block type yet — only single hero |
| **Rich AnnouncementBar** | Code/CTA/countdown/dismiss (deleted component) |
| **Product promo badges** | Cards lack “Sale / −10%” badge |
| **Server-first catalog** | Client still hits `/api/pos/catalog` on paint |
| **Catalog pagination** | Long mobile pages |
| **Lazy motion** | `framer-motion` always in shop bundle |

### Do NOT build (anti gold-plate)
- 3D product configurator (ui-ux-pro-max suggested; wrong for Solo retail)
- Second parallel token system (keep `--sf-*` only)
- Multi-tenant shared DB
- Ruflo swarm for every UI tweak

---

## 3. Design system alignment (design-system + ui-ux-pro-max)

**Keep three layers on existing tokens:**

```text
Primitive (theme hex in CMS)
  → Semantic (--sf-primary, --sf-accent, --sf-on-surface, --sf-background…)
    → Component (--sf-surface for cards, announcement bar uses --sf-primary / --sf-on-primary)
```

| Guidance (Pro Max) | Grabber action |
|--------------------|----------------|
| Rubik + Nunito Sans | Already default theme fonts — keep |
| Accent CTA contrast | Use `--sf-accent` / `--sf-on-accent`; never `--sf-primary` as text on dark surface |
| No emoji as icons | Replace 🛍️ placeholder with Lucide `Package` |
| Touch 44×44 | Keep `min-h-11` on bag/CTAs |
| next/image + Suspense | Wave A image done; Wave B Suspense around catalog |
| Hero-centric landing | Client `/` = shop hero + slider; company `/` = CompanyLanding |
| Carousel | Add CMS `HERO_SLIDER` with `prefers-reduced-motion` → static first slide |

Persist optional later: `design-system/grabber-storefront/MASTER.md` via Pro Max `--persist` — only after Wave B1 tokens locked.

---

## 4. Ruflo — when to use

| Use Ruflo | Skip Ruflo |
|-----------|------------|
| Parallel Wave B tracks (catalog RSC + slider + restore components) with memory across sessions | Single file restore |
| Fleet multi-tenant ops checklist swarm | One Contabo env edit |
| After `npx ruflo init` if you want persistent AgentDB for client matrix | Day-to-day Cursor waves |

**Recommendation:** Stay on Cursor waves for B1–B3. Optional `npx ruflo doctor` once before Contabo fleet rollout — not a blocker for UI work.

---

## 5. Aligned waves (concrete unique steps)

### Wave B0 — Restore ideas · **DONE 2026-09-18**
1. ~~Recreate AnnouncementBar~~ wired in shell with `--sf-*`
2. ~~Extend ANNOUNCEMENT~~ promoCode/cta/endsAt
3. ~~ProductPromoBadge~~ on catalog cards
4. ~~publish-links / creative types / promotions barrel~~
5. ~~jarvis/brain~~ via `/api/jarvis/cockpit` brain payload
6. Tests: `wave-b0-storefront`, `publish-links`

### Wave B1 — Perf + catalog · **DONE 2026-09-18**
8. ~~Server catalog~~ `loadStorefrontCatalog` → `/shop` + storefront `/`
9. Client skips `/api/pos/catalog` when `initialCatalog` provided
10. ~~Load more~~ 24/page
11. Motion still gated by `useReducedMotion` (full dynamic import deferred to avoid hero regressions)

### Wave B2 — Unique storefront design · **DONE 2026-09-18**
13. ~~HERO_SLIDER~~ CMS + `HeroSlider.tsx` (a11y carousel, reduced-motion)
14. ~~MID_BANNER imageUrl~~
15. Default demo uses slider (classic HERO disabled)
16. Promo badges already on cards (B0)
18. Lucide Package placeholder (B0)

### Wave B3 — Ops robustness · **CODE DONE · run on Contabo**
20–23. Checklist: [`WAVE_B3_OPS_CHECKLIST.md`](./WAVE_B3_OPS_CHECKLIST.md)  
    Health returns `build` + `landingMode`. Seed / PIN rotate / lighthouse = per-tenant ops (not in git).

### Wave C — Maintainability · **SAFE SPLITS DONE 2026-09-18**
24. ~~POS types extract~~ `src/lib/pos/pos-types.ts` (behavior unchanged; full cart/pay UI split deferred)
25. Products page full tab split — **deferred** (risk > benefit until one live client)
26. ~~Size reporter~~ `npm run analyze:sizes` → `scripts/report-client-sizes.mjs`
27. ~~CompanyLanding below-fold~~ `CompanyLandingBelowFold.tsx` + `dynamic()`

---

## 6. Checks & balances (no mistakes)

| Gate | Rule |
|------|------|
| Ideas | Restore before inventing duplicates |
| Tokens | Only `--sf-*` / CMS theme — no new `--color-*` parallel set on storefront |
| CMS | New UI = new block fields + `normalizeBlock` + default sample |
| Perf | B1 before heavy slider motion |
| A11y | Slider keyboard + aria-roledescription; badges not color-only |
| Fleet | Demo → HQ → one client |
| Delete | Never delete `app-collections` restore; never delete schema engines for knip noise |
| Ruflo | Optional orchestration only; Cursor owns Wave B0–B2 code |

---

## 7. Suggested execution order (this week)

```text
Day 1     Wave B0 restore — DONE
Day 2–3   Wave B1 server catalog + pagination — DONE
Day 3–4   Wave B2 HERO_SLIDER + banner image — DONE
Day 5     Wave B3 Contabo ops (seed/PIN/lighthouse) — checklist ready; run per tenant
Wave C    Safe splits (POS types, CompanyLanding dynamic, analyze:sizes) — DONE
          Full POS/products UI split — deferred until one live client
```

Ruflo: skip until fleet of 6 instances needs shared memory/checklists.

---

## 8. Success definition (“clean · complete · robust”)

- **Clean:** no orphan product files; god pages scheduled for C; knip SAFE only  
- **Complete:** banners + slider + badges + announcement parity with CMS  
- **Robust:** server catalog, landing modes, seeded tenant, lighthouse gate, ideas wired not deleted  

---

## Related

- [`WAVE_A_OPTIMIZATION.md`](./WAVE_A_OPTIMIZATION.md) — done  
- [`WAVE_B3_OPS_CHECKLIST.md`](./WAVE_B3_OPS_CHECKLIST.md) — Contabo/Coolify per-tenant ops  
- [`CLEANREPORT.md`](./CLEANREPORT.md) / [`../cleanreport.md`](../cleanreport.md) — quality baseline  
- [`SYSTEM_SSOT_AND_ROBUSTNESS.md`](./SYSTEM_SSOT_AND_ROBUSTNESS.md) — SSOT  
- [`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md) — fleet  
- `npm run analyze:sizes` — Wave C heavy-module line counts  
