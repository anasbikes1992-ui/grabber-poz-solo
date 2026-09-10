# Grabber Business OS — Product Audit

**Date:** 2026-09-10 (updated after AUD-01/02/03 ship)  
**Commit:** [`37486e1`](https://github.com/anasbikes1992-ui/grabber-poz-solo/commit/37486e1)  
**Canvas:** [product-audit](file:///C:/Users/pc/.cursor/projects/d-GRABBER-POZ-SOLO/canvases/product-audit.canvas.tsx)  
**Related:** [`correction.md`](./correction.md) · [`ROADMAP.md`](./ROADMAP.md) · [`GTM_MARKETING_PLAN.md`](./GTM_MARKETING_PLAN.md)

---

## Executive summary

Core commerce is sellable. **AUD-01–03 are DONE** on `main`: flag-gated hub/nav, Grocery FEFO merchant UI, category SEO + expanded sitemap. Remaining P0 is **AUD-04** (credential banners). Hybrid POS modes and restaurant polish stay P1.

| Area | Score | Verdict |
|------|------:|---------|
| Core commerce | 85% | Works |
| Verticals (avg) | ~78% | Grocery recovered; hybrid still weak |
| SEO / CMS | ~85% | Category + sitemap shipped (AUD-03) |
| WhatsApp / automation | ~80% | Code done; operator verify |
| Jarvis / Agents | ~70% | Live tools; no LLM (JAR-08 deferred) |
| Creative | ~45% | Pipeline queued; media needs FAL key |
| Hub UX / flag gating | ~95% | **AUD-01 DONE** |

---

## Shipped sprints (37486e1)

| ID | Sprint | Evidence |
|----|--------|----------|
| AUD-01 | Flag-gated hub/header | `filterToolsByFlags` / `filterModesByFlags`, `app-header`, `/app` |
| AUD-02 | Grocery FEFO UI | `/grocery`, `/api/grocery/lots`, `/api/grocery/promos`, `tests/grocery-fefo.test.ts` |
| AUD-03 | Category SEO + sitemap | `buildCategoryMetadata`, `categoryJsonLd`, expanded `sitemap.ts`, `tests/category-seo-sitemap.test.ts` |

**Verification (report):** 71 suites / 467 tests · `next build` green · pushed to `origin/main`.

---

## A. Verticals

### Cross-cutting

1. ~~Hub/header ignore flags~~ → **FIXED (AUD-01)**
2. Middleware still does not route-guard by flags (URL deep-links possible) — optional harden
3. Hybrid POS mode switcher — **not implemented** (AUD-05)
4. `/setup` vs `/onboarding` — not unified (AUD-10)

### Per preset

| Preset | Readiness | Works | Needs fix |
|--------|----------:|-------|-----------|
| mobilerepair | 90% | Staff + public repairs | Courier stub |
| electronics | 78% | Serials, warranties | Distinct IMEI POS UX |
| fashion | 90% | Matrix, barcodes, CMS; hub gated | Category PATCH/DELETE (AUD-08) |
| grocery | 82% | **FEFO radar, intake, markdowns** | Multi-warehouse polish |
| restaurant | 62% | Floor map, KDS | Auto seed_floor; TABLE_SERVICE (AUD-06) |
| wholesale | 70% | Quotations CRUD | Tier pricing; Polim create (AUD-07) |
| hybrid | 55% | Module union | POS mode switcher (AUD-05) |
| full | 70% | Demo all-on | Same module gaps |

---

## B. SEO

| Item | Status |
|------|--------|
| Product SSR + OG + JSON-LD | DONE |
| Category `generateMetadata` + CollectionPage | **DONE (AUD-03)** |
| Sitemap `/shop`, repairs public, categories, products | **DONE (AUD-03)** |
| Robots staff disallow completeness | PARTIAL |
| Collections IA | Confusing redirects |
| Local SEO `/locations` | Schema helper exists; **no routes** |
| CMS-driven homepage meta | TODO |
| Marketing pixels | DONE when configured |

---

## C. Plugins / integrations

| Integration | Status | Action |
|-------------|--------|--------|
| WhatsApp | Configured in env | Meta webhook operator proof |
| PayHere | Real adapter | Live merchant smoke + **AUD-04 banner** |
| Meta CAPI / pixels | Works when set | Confirm Purchase events |
| Koombiyo | Stub | AUD-09 |
| Creative FAL/Replicate | No keys | Set `FAL_KEY` or banner (AUD-04) |
| Jarvis / Agents | Live | ROADMAP updated |
| Automation | Event→action | Needs WA for delivery |
| Storage | Supabase or local | Prefer Supabase on Vercel |

---

## D. Priority backlog

### P0 (100% Complete)
1. ~~Flag-gated hub~~ **DONE (AUD-01)**  
2. ~~Grocery FEFO UI~~ **DONE (AUD-02)**  
3. ~~Category SEO + sitemap~~ **DONE (AUD-03)**  
4. ~~Credential banners (PayHere/WA/FAL/storage)~~ **DONE (AUD-04)**  

### P1
5. AUD-05 Hybrid POS mode switcher  
6. AUD-06 Restaurant polish  
7. AUD-07 Polim create/adjust API  
8. AUD-08 Categories PATCH/DELETE  
9. AUD-09 Koombiyo honesty  
10. AUD-10 Unify `/setup` + `/onboarding`  

### P2
11. Local SEO pages · wishlist/reviews · wholesale tiers · a11y P0 · Lighthouse · CRM · promo IF/THEN UI · WhatsApp inbox  

---

## E. Next Sprint Focus

**P1 Execution:**
- **AUD-05:** Hybrid POS mode switcher (Counter POS, Quick Barcode Scan, Restaurant Table/Takeaway, Repair Intake modes)
- **AUD-06:** Restaurant floor plan seed & Table Service state polish
- **AUD-07:** Polim Potha credit customer create/adjust API
- **AUD-08:** Category management PATCH / DELETE APIs
