# Grabber Business OS — Release Gate

Ship / no-ship checklist for Grabber Poz Solo.  
**Strategy:** finish **R1 → R2 → R3** before R4–R7. Do not jump to agents/creative until foundation is green.

**Verdict values:** `READY` · `CONDITIONALLY READY` · `BLOCKED`

---

## Recommended execution order

| Priority | Release | Why |
|----------|---------|-----|
| 🔴 **1** | **R1 — Solo Foundation** | DB bootstrap, RLS, auth, settings, certification |
| 🔴 **2** | **R2 — Commerce Complete** | POS + inventory + orders commercially reliable |
| 🟠 **3** | **R3 — Storefront** | Sellable POS + online store (COD) |
| 🟠 **4** | **R4 — Communication** | ORDER_CREATED → WhatsApp + automation logs |
| 🟡 **5** | **R5 — Jarvis** | READ tools + approvals on trustworthy data |
| 🟢 **6** | **R6 — Agents** | After READ → PROPOSE → APPROVE → EXECUTE → AUDIT |
| 🟢 **7** | **R7 — Creative** | Campaign/content automation last |

**Commercial shortcut:** You can **sell at R3** (POS + inventory + storefront + COD). R4/R5 are upgrades, not blockers for a usable product.

---

## Current overall verdict

| Release | Verdict | Remaining blocker |
|---------|---------|-------------------|
| **R1** Solo Foundation | **CONDITIONALLY READY** | Run `npm run db:apply-rls` + `npm run db:test-rls` on each Supabase project |
| **R2** Commerce Complete | **CONDITIONALLY READY** | Stock reservations for async channels (design); partial refund paths |
| **R3** Storefront | **CONDITIONALLY READY** | Mobile Lighthouse budgets |
| **R4** Communication | **CONDITIONALLY READY** | Live WhatsApp credentials + delivery proof |
| **R5** Jarvis | **CONDITIONALLY READY** | HTTP parity test on live URL; EXECUTE audit trail (R6) |
| **R6–R7** | **BLOCKED** | Deferred by design |

---

## Automated gate commands

```powershell
# R1 — run before every production deploy
npm run release:gate-r1

# With live HTTP smoke (set CERTIFY_HTTP_BASE_URL first)
$env:CERTIFY_HTTP_BASE_URL="https://grabber-poz-solo.vercel.app"
npm run release:gate-r1 -- --http

# Fresh Supabase project (direct :5432 URL in .env.local)
npm run db:bootstrap -- --rls --certify
npm run env:validate
POST /api/seed
```

---

## Gate matrix

| Section | R1 | R2 | R3 | R4 | R5 | Evidence |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| **DATABASE** | 🟡 | — | — | — | — | `db:bootstrap`, L4 certify |
| **AUTH** | 🟢 | — | — | — | 🟡 | Staff `/adminpoz` + shopper sessions |
| **SECURITY** | 🟡 | — | — | — | 🟡 | RLS SQL + `db:test-rls` |
| **POS** | 🟢 | 🟡 | — | — | — | Checkout, shifts, split pay |
| **INVENTORY** | 🟢 | 🟡 | — | — | — | GRN, transfers, variant stock |
| **PURCHASING** | 🟢 | — | — | — | — | PO + GRN |
| **STORE** | — | — | 🟢 | — | — | SSR catalog + COD checkout |
| **ORDERS** | 🟡 | 🟢 | — | — | — | Unified state machine |
| **PAYMENTS** | 🟢 | 🟢 | — | — | — | Split pay validated |
| **REFUNDS** | — | 🟢 | — | — | — | `/api/returns` + GL + audit |
| **WHATSAPP** | — | — | — | 🟡 | — | Webhook + stub send |
| **AUTOMATION** | — | — | — | 🟡 | — | Rules in `business_config` |
| **JARVIS** | — | — | — | — | 🟡 | 11+ READ DB tools |
| **AGENTS** | — | — | — | — | 🔴 | Stub only — R6 |
| **CREATIVE** | — | — | — | — | 🔴 | Generate only — R7 |
| **SEO** | — | — | 🟢 | — | — | Meta, JSON-LD, sitemap |
| **PERFORMANCE** | 🟡 | — | 🟡 | — | — | Lighthouse open |
| **DEPLOYMENT** | 🟢 | — | — | — | — | Vercel + Supabase live |
| **TESTING** | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | Unit tests; E2E partial |

Legend: 🟢 pass · 🟡 partial · 🔴 fail · — not in scope

---

## R1 exit criteria (Solo Foundation) — **do this first**

Target: **Fresh Supabase → bootstrap → seed → certify → app works** (no manual SQL surgery).

- [x] Numbered migrations `0000`–`0002` (guarded legacy backfill)
- [x] `npm run db:bootstrap` documented; `--rls` runs probe
- [x] `client:certify` L4 SQL on seeded DB
- [x] Jarvis uses real staff session
- [x] 11+ DB-grounded Jarvis READ tools
- [x] Settings persist via `/api/settings/business` + `/api/settings/secrets`
- [ ] **RLS applied on host + `npm run db:test-rls` PASS** ← hard gate
- [ ] Legacy triggers documented drop plan → [`LEGACY_MIGRATION_BRIDGE.md`](./LEGACY_MIGRATION_BRIDGE.md)

**R1 sign-off:**

```powershell
npm run release:gate-r1
npm run db:bootstrap -- --rls --certify   # fresh project only
```

---

## R2 exit criteria (Commerce Complete)

Priority within R2:

**A. Unified order state machine** — POS, storefront, admin use `order-lifecycle.ts` + `order-state-machine.ts` (no per-UI status logic).

**B. Refunds** — server workflow via `/api/returns`: return record → GL reversal → stock restock (variant-aware) → audit log.

**C. Reservations** — separate capability for async channels (COD/web); POS continues immediate decrement. *Design open — do not mix into ordinary POS sale path.*

**D. Variants end-to-end** — catalog → checkout (`variantId`) → stock movements → returns.

**E. Import pipeline** — Excel/CSV validate → preview → commit (`/api/products/import`).

Checklist:

- [x] Single order state machine
- [x] Promotion rules engine (server)
- [x] Split payment with total validation
- [x] POS hold / resume
- [x] Variants in checkout + returns
- [x] Import validate → commit
- [x] Refund API with GL + audit
- [ ] Stock reservation API for storefront COD hold (optional R2.1)

---

## R3 exit criteria (Storefront)

Minimum sellable package: **POS + Inventory + Online Store + COD**

- [x] SSR `/products/[slug]` + Product JSON-LD
- [x] `/sitemap.xml` + `/robots.txt` (disallow `/adminpoz`)
- [x] CMS blocks in `business_config`
- [x] Theme tokens (stone/gold storefront)
- [x] Guest + account COD checkout
- [ ] Mobile Lighthouse ≥ 80 on product + checkout

---

## R4 exit criteria (Communication)

Pipeline:

```text
ORDER_CREATED → automation engine → WhatsApp template → automationLogs
```

- [x] Automation rules + event log
- [x] ORDER_CREATED action (stub send + audit)
- [x] Inbound webhook `/api/webhooks/whatsapp`
- [ ] Live Meta credentials + delivery proof in `automationLogs`

---

## R5 exit criteria (Jarvis)

Jarvis = **business intelligence + controlled operations**, not autonomous agent.

- READ → real DB (`sales-metrics.ts` SSOT shared with dashboard)
- PROPOSE → Approval Center → EXECUTE → audit log

Checklist:

- [x] Approval Center UI (`/approvals`)
- [x] Daily brief (`/api/jarvis/brief`)
- [x] Dashboard + Jarvis share `completedOrderFilter` (unit tested)
- [ ] HTTP E2E: `get_sales_summary` matches `/api/dashboard/stats` on live data
- [ ] Full EXECUTE audit trail (R6)

Example READ questions Jarvis should answer reliably:

- Today's sales, low stock, top products, pending COD, branch totals, reorder hints

---

## R6–R7 — blocked until R5 green

**R6 Agents:** inventory agent (low stock → draft PO → approve), sales agent (weak SKU → promo draft → approve).

**R7 Creative:** brief → generate → approve → publish to storefront/WhatsApp.

---

## Architecture target

```text
             GRABBER BUSINESS OS
                     │
       ┌─────────────┼─────────────┐
       POS        Storefront     Inventory
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  ORDERS
                     ▼
              COMMUNICATION
                     ▼
                 WHATSAPP
                     ▼
                  JARVIS
                     ▼
            APPROVAL CENTER
                     ▼
                  AGENTS
                     ▼
            CREATIVE FACTORY
```

**Rule:** One pricing engine, one checkout, one inventory engine — shared by UI, store, Jarvis, WhatsApp.

---

## Honesty rules

1. Do not claim RLS certification until `db:test-rls` passes on the host.
2. Do not claim WhatsApp live until credentials set and delivery logged.
3. Do not claim SEO-ready until SSR + sitemap exist.
4. Database truth > documentation > AI interpretation.

---

## Related

- [`NEXT_PHASES.md`](./NEXT_PHASES.md) — deploy rollout
- [`LEGACY_MIGRATION_BRIDGE.md`](./LEGACY_MIGRATION_BRIDGE.md) — trigger drop plan
- [`correction.md`](./correction.md) — sprint tracker
- [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) — operator checklist
