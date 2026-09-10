# Grabber Business OS — Product Audit

**Date:** 2026-09-10  
**Scope:** All verticals, SEO, plugins/integrations, gaps & missed opportunities  
**Canvas:** Cursor canvas `product-audit.canvas.tsx` (open beside chat)  
**Related:** [`correction.md`](./correction.md) · [`ROADMAP.md`](./ROADMAP.md) · [`GTM_MARKETING_PLAN.md`](./GTM_MARKETING_PLAN.md)

---

## Executive summary

Core commerce (POS, products, inventory, storefront COD, auth) is **sellable**. Vertical **APIs and pages exist** for repairs, restaurant, HP, appointments, loyalty, wholesale. The largest systemic gap: **`verticalFlags` are not enforced in hub/header/routes** — presets look cosmetic. Grocery has **backend FEFO but no merchant UI**. SEO is strong on product SSR, weak on categories/sitemap coverage. Plugins are mostly real adapters with **env-gated stubs**.

| Area | Score | Verdict |
|------|------:|---------|
| Core commerce | 85% | Works |
| Verticals (avg) | ~66% | Uneven — repair strong, grocery weak |
| SEO / CMS | ~65% | Product strong; category/local weak |
| WhatsApp / automation | ~80% | Code done; operator verify |
| Jarvis / Agents | ~70% | Live tools; no LLM (JAR-08 deferred) |
| Creative | ~45% | Pipeline queued; media needs FAL key |
| Hub UX / flag gating | ~30% | Critical fix |

---

## A. Verticals

### Cross-cutting

1. `/app` and `app-header` ignore `verticalFlags` — every merchant sees every launcher.
2. Middleware auth-gates staff paths but never checks module flags.
3. Hybrid preset claims POS mode switcher — **not implemented** in `/pos`.
4. Two onboarding surfaces (`/setup` vs `/onboarding`) not unified.

### Per preset

| Preset | Readiness | Works | Needs fix |
|--------|----------:|-------|-----------|
| mobilerepair | 88% | Staff + public repairs, estimate, track, HP, appointments | Courier stub; hide unrelated hub items |
| electronics | 78% | Serials, warranties, repair overlap | Distinct POS IMEI UX |
| fashion | 85% | Matrix products, barcodes, loyalty, CMS | Category PATCH/DELETE; flag gating |
| grocery | 35% | FEFO lib, GRN batch/expiry, near-expiry job | **Dedicated lots/FEFO/near-expiry UI** |
| restaurant | 62% | Floor map, KDS, recipes | Auto seed_floor; TABLE_SERVICE in POS; DELETE |
| wholesale | 70% | Quotations CRUD + convert, Polim repay | Tier pricing UI; AR aging; Polim create |
| hybrid | 55% | Module union | POS Retail\|Repair\|Wholesale switcher |
| full | 60% | Demo all-on | Same module gaps |

### CRUD matrix (flags)

| Flag | Pages | API CRUD | Notes |
|------|-------|----------|-------|
| repairs | `/repairs*`, `/shop/repairs*` | Strong | Best vertical |
| restaurant | `/restaurant`, `/kds` | PATCH ok; weak DELETE | Demo seed |
| hirePurchase | `/hire-purchase` | Full | |
| appointments | `/appointments` | Full | |
| loyalty | `/loyalty` | Full | |
| wholesale | `/wholesale`, `/quotations` | Full | |
| grocery | — | Backend only | **UI gap** |
| whatsapp | `/whatsapp`, automation | Send + rules | |
| creative | `/creative*` | Generate/approve | Needs FAL |

---

## B. SEO

| Item | Status |
|------|--------|
| Product SSR + OG + JSON-LD | DONE |
| Sitemap products/categories | PARTIAL — add `/shop`, repair public URLs |
| Robots | PARTIAL — disallow remaining staff verticals |
| Category `generateMetadata` | TODO |
| Collections IA | Confusing redirects |
| Local SEO `/locations` | Schema helper exists; **no routes** |
| CMS-driven homepage meta | TODO |
| Marketing pixels | DONE when configured |

---

## C. Plugins / integrations

| Integration | Status | Action |
|-------------|--------|--------|
| WhatsApp | Configured in env; live when token set | Meta webhook operator proof |
| PayHere | Real adapter | Live merchant smoke |
| Meta CAPI / pixels | Works when token/pixel set | Confirm Purchase events |
| Koombiyo | Stub | Real API or manual courier status |
| Creative FAL/Replicate | No keys in env | Set `FAL_KEY` or accept placeholders |
| Jarvis | Keyword + DB tools | JAR-08 LLM deferred |
| Agents | 12 live, flag-aware | Update ROADMAP “stub” row |
| Automation | Event→action | Needs WA for delivery |
| Storage | Supabase or local | Prefer Supabase on Vercel |

---

## D. Priority backlog

### P0
1. Gate hub + header + routes by `verticalFlags`
2. Grocery FEFO / lots / near-expiry UI
3. Category SEO + sitemap expansion
4. Clear UI when PayHere / WA / FAL / storage unconfigured

### P1
5. Hybrid POS mode switcher (or remove claim)
6. Restaurant polish (no auto-seed; POS table mode)
7. Polim create/adjust API
8. Categories PATCH/DELETE
9. Koombiyo honesty / real dispatch
10. Unify `/setup` + `/onboarding`

### P2
11. Local SEO pages  
12. Wishlist / reviews  
13. Wholesale tiers + AR UI  
14. A11y P0 + mobile landing nav  
15. Lighthouse budgets  
16. CRM segmentation  
17. Full promo IF/THEN builder UI  
18. Persisted WhatsApp inbox  

---

## E. What else is missed (ideas)

- **Public restaurant menu** storefront (QR table order)
- **Multi-barcode + member price** fields (COM-04)
- **Staff collections CMS** separate from categories
- **Offline / PWA** POS resilience
- **Multi-language** (EN/සිං/தமி) beyond header stub
- **Franchise / multi-branch reporting** pack
- **Hardware kit** SKUs on company landing tied to install identity
- **Credit packs UI** for Creative (commercial model already says credits)

---

## F. Doc sync

| Doc | Change |
|-----|--------|
| This file | New SSOT for audit |
| `correction.md` | Audit section + backlog IDs |
| `ROADMAP.md` | Fix Agents/Creative/Jarvis baseline % |

---

## Recommended next sprint (2 weeks)

**Week 1:** Flag-gated hub/header + grocery FEFO MVP + category SEO/sitemap  
**Week 2:** Hybrid POS modes + restaurant seed fix + a11y skip/main + mobile landing nav  

Then operator: Meta WhatsApp verify + one live COD delivery proof + optional FAL key.
