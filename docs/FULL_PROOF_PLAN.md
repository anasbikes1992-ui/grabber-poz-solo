# Grabber Business OS — Full-Proof Plan

**Date:** 2026-09-10  
**Baseline:** AUD-01…AUD-10 DONE on `main` · Commerce certified · Single-business Solo deploy  
**Do not:** rebuild POS · claim unlimited AI · ship without operator smoke  
**SSOT links:** [`PRODUCT_AUDIT.md`](./PRODUCT_AUDIT.md) · [`correction.md`](./correction.md) · [`ROADMAP.md`](./ROADMAP.md) · [`GTM_MARKETING_PLAN.md`](./GTM_MARKETING_PLAN.md) · [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md)

---

## 1. Current structure (what you own)

```text
Public customer          Staff merchant              AI / automation
─────────────────        ─────────────────           ─────────────────
/  Company landing       /adminpoz → /app hub        Jarvis drawer + tools
/shop storefront CMS     /pos (Retail|Scan|+links)   12 Agents → Approvals
/products/[slug] SSR     Verticals (flag-gated)      WhatsApp inbound/out
/categories/[slug] SEO   /grocery FEFO               Creative → storefront
/shop/repairs/*          /restaurant + KDS           Cron job outbox
/shop/checkout COD       /repairs, HP, loyalty…
/track                   /setup ↔ /onboarding
```

| Layer | Key paths | State |
|-------|-----------|--------|
| Commerce core | `checkout-repo`, POS, inventory, promotions | **KEEP — certified** |
| Vertical flags | `vertical-presets.ts`, Settings, hub filters | **DONE (AUD-01)** |
| Grocery | `/grocery`, `/api/grocery/*`, FEFO | **DONE (AUD-02)** |
| SEO product/category | `seo.ts`, sitemap | **DONE (AUD-03)** |
| Integration health | `/api/integrations/health`, banners | **DONE (AUD-04)** |
| Hybrid POS bar | Retail/Scan + deep-links | **DONE (AUD-05)** — not full in-POS table mode |
| Restaurant | floor/KDS/seed | **DONE (AUD-06)** |
| Polim CRUD | POST/PATCH | **DONE (AUD-07)** |
| Categories | PATCH/DELETE | **DONE (AUD-08)** |
| Courier | In-house `DEL-*` fallback | **DONE (AUD-09)** |
| Onboarding | setup ↔ onboarding tabs | **DONE (AUD-10)** |
| Public surface | `/shop` etc. bare shell | **DONE** |
| Agents / Jarvis | DB-grounded, keyword router | **DONE** (LLM deferred) |

**Architecture rule:** one dedicated Postgres per merchant · perpetual license + monthly infra · presets seed verticals · flags hide modules · staff never bleeds into storefront.

---

## 2. Ideas locked in (product north star)

| Idea | How it shows up |
|------|-----------------|
| Unified stock POS + web | Same `products` / `stock_balances` |
| Vertical-first merchant | 8 presets → flags → hub/POS links |
| Guided go-live | `/setup` milestones + dynamic seed |
| WhatsApp as OS nervous system | Order/repair/stock automation |
| Approve before mutate | Jarvis/Agents → `/approvals` |
| Creative → live storefront | Generate → approve → hero/banner |
| Honest integrations | Health banners; stubs don’t fake success silently |
| Sellable Solo | Provision script + Vercel/Supabase per client |

---

## 3. Fix & polish matrix

### P0 — must fix before next client handoff

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| FIX-01 | `/grocery` staff auth prefix | **DONE** | `STAFF_PREFIXES` includes `/grocery` + `/onboarding` |
| FIX-02 | Operator go-live unproven | **OPS** | Run checklist §5 Phase 0 (PIN, WA, smoke) |
| FIX-03 | `release:gate` / RLS probe | **OPS** | Re-run `npm run release:gate -- --env-file .env.prod.txt --production` |

### P1 — polish before claiming “production-hardened UX”

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| POL-01 | Storefront skip / `#main-content` | **DONE** | `storefront-shell.tsx` + safe-area bottom nav |
| POL-02 | Landing `<main>` / mobile nav | **DONE** | Hamburger + Staff Portal always visible |
| POL-03 | Cart / Jarvis drawers dialog | **DONE** | `useDrawerA11y` Escape + focus trap |
| POL-04 | Detached labels (sample) | **DONE** | Cart promo, POS promo, landing lead `htmlFor` |
| POL-05 | robots.txt staff disallow | **DONE** | Expanded `STAFF_DISALLOW` in `robots.ts` |
| POL-06 | Flag-off URL still reachable | Deferred | Optional; not blocking Phase 1 gate |
| POL-07 | Storefront focus ring | **DONE** | 2px outline + stronger ring on `.field-input:focus` |

### P2 — growth & depth

| ID | Issue | Status | Notes |
|----|-------|--------|-------|
| GRW-01 | `/locations` routes | **DONE** | Index + `[slug]`, sitemap, robots, middleware; demo branches if DB empty |
| GRW-02 | In-POS TABLE_SERVICE | **DONE** | POS `TABLES` mode + shared `TableServicePanel`; bag → KOT |
| GRW-03 | Wishlist / reviews | **DONE** | Schema + `/api/storefront/*` + PDP UI; run `0011_wishlist_reviews.sql` |
| GRW-04 | CRM segments | **DONE** | Jarvis audience parse + Customers “Draft WhatsApp” CTA |
| GRW-05 | Creative media stub | **DONE** | Credit meter UI + consume on FAL/Replicate; set `FAL_KEY` for live |
| GRW-06 | DB-06 legacy columns | Open | Phase 4 |
| GRW-07 | Lighthouse mobile | Open | Measure after deploy |
| GRW-08 | Promo IF/THEN builder UI | **DONE** | `/discounts` auto-apply conditions |
| GRW-09 | WhatsApp inbox (persisted) | **DONE** | Threads schema + inbox UI; run `0012_whatsapp_threads.sql` |
| GRW-10 | Public dining QR menu | Open | Later |

---

## 4. Phased execution plan

### Phase 0 — Prove production (3–5 days) · Operator + FIX-*

**Exit:** One live merchant path green without engineering heroics.

| Day | Actions | Owner | Status |
|-----|---------|-------|--------|
| 0 | FIX-01 middleware `/grocery` staff gate | Eng | **DONE** |
| 0 | Rotate owner PIN; confirm `/api/integrations/health` | Ops | Pending (route is staff-auth 401 without session) |
| 1 | Meta webhook verify; COD order → automation SUCCESS | Ops | Pending |
| 1–2 | Smoke RT: POS sale, hold/resume, return, GRN, grocery lot (if flag) | Ops | Pending |
| 2 | Repair book → READY WhatsApp (if repairs) | Ops | Pending |
| 2–3 | PayHere sandbox or confirm COD-only claim | Ops | Pending |
| 3 | FIX-03 release:gate retry | Eng | Pending |
| 3 | Screenshot health banners + storefront `/shop` (no staff chrome) | Ops | Pending |

**Gate:** Checklist signed in client folder · no 500s on checkout/dispatch.

---

### Phase 1 — Polish & harden (1–2 weeks) · POL-*

**Exit:** Public + staff UX AA-ish; crawlers can’t index staff modules.

| Sprint | Deliverables | Tests | Status |
|--------|--------------|-------|--------|
| 1a | POL-01, POL-02, POL-07 (landmarks, mobile nav, focus) | a11y smoke expand | **DONE** |
| 1b | POL-03 drawers → Modal pattern | Manual keyboard Escape/trap | **DONE** |
| 1c | POL-04 labels on revenue paths (POS, cart, landing lead) | a11y smoke | **DONE** (sample) |
| 1d | POL-05 robots (+ POL-06 deferred) | a11y smoke robots assert | **DONE** |

**Gate:** Keyboard tab through `/shop` cart + landing; Lighthouse a11y ≥ 90 on `/` and `/shop`.

---

### Phase 2 — Vertical depth (2–3 weeks) · GRW-01…03, GRW-02

**Exit:** Restaurant & SEO growth stories sellable.  
**Status (2026-09-10):** GRW-01 / GRW-02 / GRW-03 **implemented** — apply `drizzle/migrations/0011_wishlist_reviews.sql` on prod before reviews/wishlist writes.

| Track | Deliverables | Status |
|-------|--------------|--------|
| Restaurant | GRW-02 in-POS table select → order → KOT | **DONE** |
| SEO | GRW-01 `/locations/[slug]` + sitemap | **DONE** |
| Conversion | GRW-03 wishlist + reviews MVP | **DONE** (migration required) |

**Gate:** Café demo without leaving POS for table sale; 3 location pages live (demo branches if none in DB).

---

### Phase 3 — Marketing OS (2–4 weeks) · GRW-04…05, 08–09

**Status (2026-09-10):** GRW-04 / GRW-05 / GRW-08 / GRW-09 **implemented**.  
Apply `0011` + `0012` SQL on prod · set `FAL_KEY` for live creative renders.

| Track | Deliverables | Status |
|-------|--------------|--------|
| CRM | Segments + Jarvis draft WhatsApp to segment X | **DONE** |
| Creative | Credit metering UI (+ FAL when keyed) | **DONE** |
| Comms | Persisted WhatsApp threads inbox | **DONE** (migration) |
| Promos | IF/THEN builder on `/discounts` | **DONE** |

**Gate:** Approve creative → storefront + broadcast; campaign from segment.

---

### Phase 4 — Fleet & hygiene (ongoing)

**Status (2026-09-10):** Eng pack shipped — provision docs, `ops:smoke`, `db:validate-legacy`, Lighthouse scripts, JAR-08 honesty. Ops still owns PIN/WA/`release:gate` and applying SQL 0011–0012.

| Item | Status | Notes |
|------|--------|-------|
| Provision next client | **DONE** (docs) | [`PROVISION_NEXT_CLIENT.md`](./PROVISION_NEXT_CLIENT.md) · runbook → 0012 |
| DB-06 | **VALIDATE READY** | `npm run db:validate-legacy` · drop = `0013_*.sql.pending` (not applied) |
| Fleet release doc | **UPDATED** | New-client command pack in FLEET_RELEASE_MANAGEMENT |
| Lighthouse (GRW-07) | **SCRIPT READY** | `npm run lighthouse:shop` · [`LIGHTHOUSE_MOBILE.md`](./LIGHTHOUSE_MOBILE.md) |
| JAR-08 LLM | **DEFERRED** | Keyword router intentional; no provider stub |
| Ops smoke | **SCRIPT READY** | `npm run ops:smoke` (+ manual §5) |

---

## 5. Operator go-live checklist (copy/paste)

```text
[ ] Owner PIN rotated
[ ] /api/integrations/health — expected green/amber matches env
[ ] WhatsApp webhook verified in Meta console
[ ] COD order → automationLogs SUCCESS + customer message
[ ] POS: sale, split pay (if used), hold/resume, Z-report
[ ] Return + stock restore
[ ] GRN receive
[ ] Grocery: lot intake + expiry radar (if grocery preset)
[ ] Repair: public book → staff READY → WhatsApp (if repairs)
[ ] /shop loads without staff header; mobile cart works
[ ] Backup export or nightly backup confirmed
[ ] release:gate PASS (or documented waiver)
[ ] npm run ops:smoke (public HTTP) PASS
[ ] SQL 0011 + 0012 applied on this tenant
```

---

## 6. Commercial proof plan (with product)

| Week | Milestone |
|------|-----------|
| 1 | Phase 0 complete on demo tenant |
| 2 | Phase 1a–1b polish on landing + shop |
| 3 | Lighthouse merchant #1 (fashion) seed + go-live |
| 4 | Merchant #2 (mobilerepair) |
| 5 | Merchant #3 (restaurant) |
| 6 | Case study: “same stock POS + web” + GTM packages |

**Claims allowed:** unified stock · perpetual license · dedicated DB · WhatsApp automation · vertical presets.  
**Claims forbidden:** unlimited AI video · source ownership · card payments unless contracted.

---

## 7. Risk register

| Risk | Mitigation |
|------|------------|
| Stub WhatsApp looks “success” in dev | Health banner + prod fail-closed already |
| Deep-link to disabled vertical | POL-06 flag route guard |
| Grocery unauthenticated | FIX-01 |
| Restaurant oversold as in-POS | Market as floor+KDS until GRW-02 |
| Creative without FAL | Banner + Gemini paste path only |
| Schema legacy bridges | GRW-06 after certify window |

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| Automated tests | Stay ≥ current green suite |
| Production build | Always green before push |
| Operator smoke | 100% Phase 0 checklist |
| Storefront a11y | Skip + main + drawer Escape |
| First paid Solo | Within 6 weeks of Phase 0 |
| Vertical confusion | Fashion hub shows 0 restaurant links |

---

## 9. Recommended sequence (default)

```text
FIX-01 middleware grocery auth
    → Phase 0 operator smoke + WA proof
    → POL-01/02/03/05 (a11y + robots)
    → GRW-02 restaurant in-POS OR GRW-01 locations (pick one vertical story)
    → Lighthouse merchants × 3
    → Phase 3 marketing OS
```

**Do not start Phase 3** until Phase 0 is signed off.

---

## 10. Doc & canvas map

| Artifact | Role |
|----------|------|
| This file | Full-proof plan SSOT |
| `PRODUCT_AUDIT.md` | Gap inventory |
| `correction.md` | Engineering tracker |
| Canvas `product-audit` | Visual audit |
| Canvas `remaining-phases` | Operator/eng checklist |

Update `correction.md` IDs FIX-*/POL-*/GRW-* when work starts; keep AUD-* closed.
