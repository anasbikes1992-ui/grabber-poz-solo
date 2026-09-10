# Vertical Depth & Customizable Cost / ROAS Plan

**Date:** 2026-09-10  
**Question:** Are restaurant / salon verticals robust (recipes, COGS, inventory, commissions, HR) with a full customizable ROAS engine per shop nature?  
**Verdict:** **Not yet.** Restaurant is deepest (KOT/KDS + recipe BOM depletion) but missing food-cost rollup, bill settle, waste, modifiers, QR menu. Salon is a thin appointments shell — no service catalog, consumables BOM, commission, or payroll. Retail COGS on product sale is real; margin/ROAS reporting is partial/stubbed. Cost & ROAS engines must be **pluggable by vertical**, not one-size-fits-all.

**SSOT links:** [`FULL_PROOF_PLAN.md`](./FULL_PROOF_PLAN.md) · [`BUSINESS_OS_VERTICALS.md`](./BUSINESS_OS_VERTICALS.md) · [`correction.md`](./correction.md) VERT-01 · Canvas: `vertical-depth-plan.canvas.tsx`

## Wave C status (2026-09-10)

| ID | Status | Notes |
|----|--------|-------|
| VERT-R05 | **DONE** | Settle pay CASH/CARD/SPLIT + N-way seat split (`splitCount`) |
| VERT-R06 | **DONE** | `/shop/menu`, `/shop/dine/[tableToken]`, `/api/restaurant/menu`; `qr_token` (0015) |
| VERT-S05 | **DONE** | Commission CSV `/api/appointments/commissions/export` (not full HRIS) |
| VERT-M03 | **DONE** | Campaign ROAS via `campaignId` (`creative:<id>`); `/api/marketing/roas` |
| VERT-M04 | **DONE** | Segment blast logs `blast_*` spend; ROAS joins tagged orders |
| VERT-P03 | **DEFERRED** | Pharmacy pack needs compliance — not in Solo Wave C |

**Apply:** `0014` + `0015` SQL on each tenant (plus 0011/0012 if missing).

---

## Wave B status (2026-09-10)

| ID | Status | Notes |
|----|--------|-------|
| VERT-R03 | **DONE** | `kitchen_waste` → damages `KITCHEN_WASTE` + auto stock/GL; UI on `/restaurant` |
| VERT-R04 | **DONE** | KOT `modifiers[]` priceDelta + ingredient deplete on SERVED |
| VERT-S03 | **DONE** | `commission_pct/amount` on appointments; accrue on Complete & charge |
| VERT-S04 | **DONE** | `/api/appointments/public` + `/shop/appointments/book` |
| VERT-C02 | **DONE** | `products.item_type` (migration 0014) + product API |
| VERT-C03 | **DONE** | `config_json.engines.costModel` via `/api/config/flags` |
| VERT-M01 | **DONE** | `marketing_spend` + `/api/marketing/spend` + `/marketing/spend` |
| VERT-M02 | **DONE** | `orders.campaign_id` + `utm_json`; checkout pass-through; attribution uses spend |

**Apply:** `drizzle/migrations/0014_vertical_depth_wave_b.sql` on each tenant.

**Next (Wave C):** bill split, QR menu, timesheet export, creative/segment ROAS.

---

## Wave A status (2026-09-10)

| ID | Status | Notes |
|----|--------|-------|
| VERT-C01 | **DONE** | `/api/reports/sales` month COGS/margin; attribution uses `unitCost` (no 0.65) |
| VERT-R01 | **DONE** | `recipe-cost.ts` + recipes API + `/restaurant` food-cost table |
| VERT-R02 | **DONE** | `settle_kot` → `processPosCheckout` → VACANT; UI **Settle & pay** |
| VERT-P01 | **DONE** | `salon` preset in `vertical-presets.ts` + seed catalog |
| VERT-S01 | **DONE** | Haircut / shave / color / blow-dry + retail SKUs |
| VERT-S02 | **DONE** | Complete & charge → POS + `depleteRecipeForProduct` if BOM linked |

**Next (Wave B):** waste, modifiers, stylist commission UI, public book, spend ledger.

---

## 1. What is already solid (do not rebuild)

| Asset | Path | Keep |
|-------|------|------|
| Recipe BOM depletion on KOT SERVED | `src/lib/restaurant/recipe-bom.ts` | Yes |
| Recipes API + low-stock | `/api/recipes`, `recipe-low-stock.ts` | Yes |
| Floor / KDS / in-POS Tables | `restaurant-service.ts`, `TableServicePanel`, POS `TABLES` | Yes |
| Product `costPrice` → line COGS → GL | `authoritative-pricing.ts`, `payment-lifecycle.ts` | Yes |
| Damages write-off | `damage-write-off.ts` | Yes |
| Appointments CRUD | `/appointments`, `/api/appointments` | Shell only — extend |
| Repair service catalog + `commissionPct` | `repair_service_catalog`, repair jobs | **Pattern for salon** |
| Vertical flags / presets | `vertical-presets.ts`, `vertical-flags.ts` | Extend with salon |
| Meta pixel / CAPI | `meta-capi.ts`, storefront analytics | Wire to real spend |
| Attribution math helper | `attribution-engine.ts` | Feed real data |

---

## 2. Honest status matrix

### A — Restaurant

| Capability | Status |
|------------|--------|
| Recipes / BOM / deplete on serve | **DONE** |
| Recipe cost rollup / food-cost % | **DONE** (Wave A R01) |
| Inventory on sell (non-KOT) / kitchen waste | **DONE** (Wave B R03) |
| Tables + KDS + courses | **DONE** |
| Modifiers / bill split | **DONE** (R04 + R05) |
| KOT → paid order | **DONE** (Wave A R02 `settle_kot`) |
| Public QR dining menu | **DONE** (Wave C R06 `/shop/menu`) |

### B — Salon / barber

| Capability | Status |
|------------|--------|
| Service catalog (haircut, shave, duration) | **DONE** (Wave A S01) |
| Product consumption per service | **PARTIAL** (deplete if recipe linked; seed BOM optional) |
| Stylist/barber commission | **DONE** (Wave B S03 accrual) |
| Salaries / payroll / HR | **PARTIAL** (Wave C S05 CSV export only) |
| Appointment book + POS settle | **DONE** (Wave A S02 Complete & charge) |
| Public book | **DONE** (Wave B S04 `/shop/appointments/book`) |
| `salon` preset | **DONE** (Wave A P01) |

### C — Cross-vertical cost

| Capability | Status |
|------------|--------|
| SKU COGS on checkout | **DONE** |
| Margin report from `orderItems.unitCost` | **DONE** (Wave A C01) |
| Persisted `itemType` (SERVICE / PREPARED_FOOD / RAW) | **DONE** (Wave B C02) |
| Pluggable cost model per shop | **DONE** (Wave B C03 engines.costModel) |

### D — ROAS / marketing

| Capability | Status |
|------------|--------|
| Pixel + CAPI purchase | **PARTIAL** |
| Campaign spend ledger | **DONE** (Wave B M01) |
| Order ↔ campaign / UTM | **DONE** (Wave B M02) |
| Channel revenue (POS/STOREFRONT/WA) | **DONE** (attribution + spend) |
| Segment / creative ROAS | **DONE** (Wave C M03/M04) |

### E — Presets

| Preset | Depth |
|--------|--------|
| restaurant | KOT/BOM + food-cost + settle + waste + modifiers + QR menu |
| grocery / fashion / electronics / mobilerepair / wholesale | Stronger match to modules |
| salon / barber | Preset + catalog + charge + commission CSV + public book |
| pharmacy / beauty packs | Aliases only |

---

## 3. Target architecture — customizable cost + ROAS engines

```text
Shop nature (preset + flags)
        │
        ▼
┌───────────────────┐     ┌────────────────────────────┐
│ Cost model plugin │     │ Attribution / ROAS plugin  │
│ SKU | RECIPE |    │     │ spend ledger + order tags  │
│ SERVICE_BOM |     │     │ channel + campaign + UTM   │
│ LABOR+COMMISSION  │     └────────────────────────────┘
└───────────────────┘
        │
        ▼
 orderItems.unitCost + optional laborCost + commission
        │
        ▼
 Margin / food-cost / service-margin / ROAS dashboards
```

| Shop nature | Cost model | Inventory | People economics | ROAS focus |
|-------------|------------|-----------|------------------|------------|
| Fashion / electronics | `SKU` | on sale | none | Meta / storefront / WhatsApp |
| Grocery | `SKU` + FEFO waste | lots + damages | none | promos + WA |
| Restaurant | `RECIPE` | BOM on serve + waste | optional tip split later | local SEO + WA |
| Salon / barber | `SERVICE_BOM` + labor | consumables on complete | commission %; salary export P2 | booking + WA + Meta |
| Mobile repair | catalog + parts | parts on job | `commissionPct` (exists) | repair funnel |
| Wholesale | `SKU` + quote | on invoice | none | B2B repeat |

Config (proposed): `business_config.config_json.engines = { costModel, attributionEnabled, commissionDefaultPct }`.

---

## 4. Remaining work plan (IDs)

### Wave A — P0 sellable café + salon MVP — **COMPLETE (2026-09-10)**

| ID | Deliverable | Status |
|----|-------------|--------|
| **VERT-R01** | Recipe cost rollup + food-cost % | **DONE** |
| **VERT-R02** | KOT → settle → order payment | **DONE** |
| **VERT-S01** | Salon service catalog | **DONE** |
| **VERT-S02** | Appointment COMPLETED → POS + consumable BOM | **DONE** (BOM only if recipe linked) |
| **VERT-C01** | Real margin report | **DONE** |
| **VERT-P01** | `salon` preset | **DONE** |

### Wave B — P1 depth — **COMPLETE (2026-09-10)**

| ID | Deliverable | Status |
|----|-------------|--------|
| **VERT-R03** | Kitchen waste → stock + GL | **DONE** |
| **VERT-R04** | Modifiers (+ optional ingredient) | **DONE** |
| **VERT-S03** | Stylist commission | **DONE** (accrual; no payroll GL) |
| **VERT-S04** | Public / WhatsApp book | **DONE** (public book; WA = source flag) |
| **VERT-C02** | Persist `itemType` on products | **DONE** |
| **VERT-C03** | `costModel` switch in flags | **DONE** |
| **VERT-M01** | `marketing_spend` ledger | **DONE** |
| **VERT-M02** | Checkout UTM / `campaignId` on orders | **DONE** |

### Wave C — P2 — **COMPLETE (2026-09-10)** (pharmacy deferred)

| ID | Deliverable | Status |
|----|-------------|--------|
| **VERT-R05** | Bill split | **DONE** |
| **VERT-R06 / GRW-10** | Public QR menu | **DONE** |
| **VERT-S05** | Salaries / payroll / HR | **DONE** (CSV export only) |
| **VERT-M03/M04** | Creative + segment ROAS | **DONE** |
| **VERT-P03** | Real pharmacy pack | **DEFERRED** (compliance) |

---

## 5. ROAS ideas by shop nature (product, not just ads)

| Vertical | Acquisition | Attribution hook | Optimization loop |
|----------|-------------|------------------|-------------------|
| Restaurant | Google local + WA menu + QR on table | Table token / campaign on settle | Food-cost % vs promo discount; daypart offers |
| Salon | WA book + Meta lead + referral | Appointment source + stylist | Commission vs rebooking rate; color product attach |
| Fashion | Creative hero + Meta catalog | `creativeProjectId` on order | Creative credit spend vs attributed GMV |
| Grocery | WA restock alerts + FEFO promos | Promo code / segment blast | Waste $ vs promo lift |
| Repair | Public book → READY WA | Job source | Parts margin + commission |
| Wholesale | Quote → convert | Quotation id | Quote win rate × margin |

Engine UI: one **Marketing / ROAS** page — spend in, attributed revenue out, filter by channel + vertical-aware KPIs (food-cost, service margin, etc.).

---

## 6. Explicit non-goals (Solo)

- Full HRIS (leave, PF, EPF, payslips) — partner or export later  
- Multi-branch complex labor law packs  
- Claiming “unlimited AI ROAS” — Jarvis stays DB-grounded; ROAS is ledger + attribution  

---

## 7. Gate criteria

**Café demo:** recipe cost visible → fire KOT → serve depletes stock → settle pays → margin report shows dish COGS.  
**Salon demo:** book haircut → complete → stock −shampoo → commission accrues → order paid.  
**ROAS demo:** enter Meta spend → tagged storefront orders → ROAS ≥ dashboard (no hardcoded costs).

---

## 8. Suggested build order

```text
VERT-C01 (margin truth)
 → VERT-R01 + VERT-R02 (restaurant money path)
 → VERT-P01 + VERT-S01 + VERT-S02 (salon money path)
 → VERT-M01 + VERT-M02 (ROAS truth)
 → P1 depth (waste, modifiers, commission UI, public book)
```
