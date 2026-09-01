# Grabber Business OS — Release Gate

Ship / no-ship checklist for Grabber Poz Solo.  
**Strategy:** finish **R1 → R2 → R3** before R4–R7. Do not jump to agents/creative until foundation is green.

**Verdict values:** `READY` · `CONDITIONALLY READY` · `BLOCKED`

**Latest automated run:** [`reports/RELEASE_GATE_RUN_2026-09-01.md`](../reports/RELEASE_GATE_RUN_2026-09-01.md) — all automated checks **PASS** on production (2026-09-01).

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
| **R1** Solo Foundation | **CONDITIONALLY READY** | Manual: rotate owner PIN; legacy `0003` trigger drop (doc only) |
| **R2** Commerce Complete | **CONDITIONALLY READY** | Manual POS/return/GRN smoke; optional stock reservation API |
| **R3** Storefront | **CONDITIONALLY READY** | Mobile Lighthouse ≥ 80 (manual) |
| **R4** Communication | **CONDITIONALLY READY** | Meta webhook verify + live delivery proof in `automationLogs` |
| **R5** Jarvis | **CONDITIONALLY READY** | Live Jarvis vs dashboard parity (staff session); EXECUTE audit → R6 |
| **R6** Agents | **CONDITIONALLY READY** | 12 agents live; Approval EXECUTE bridge open |
| **R7** Creative | **CONDITIONALLY READY** | Approve-to-storefront MVP; live media optional |

**R6/R7 MVP shipped locally.** Deploy to Vercel for `/shop/repairs` HTTP cert. Full autonomy needs Approval EXECUTE + FAL/Replicate keys.

**Automated foundation (R1–R5 code + prod RLS + HTTP):** ✅ green as of 2026-09-01.

---

## Automated gate commands

```powershell
# Full R1–R5 automated sweep (recommended before each release)
npm run release:gate -- --env-file .env.prod.txt --production --http

# R1 only
npm run release:gate-r1 -- --env-file .env.prod.txt --production --http

# Individual gates
node scripts/release-gate.mjs r2 --env-file .env.prod.txt --production
node scripts/release-gate.mjs r4 --env-file .env.prod.txt --production
node scripts/release-gate.mjs r6 --env-file .env.prod.txt --production

# Fresh Supabase project (direct :5432 URL in .env.local)
npm run db:bootstrap -- --rls --certify
npm run env:validate
POST /api/seed
```

---

## Gate matrix

| Section | R1 | R2 | R3 | R4 | R5 | Evidence |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| **DATABASE** | 🟢 | — | — | — | — | `db:bootstrap`, L4 certify, RLS probe PASS |
| **AUTH** | 🟢 | — | — | — | 🟡 | Staff `/adminpoz` + shopper sessions |
| **SECURITY** | 🟢 | — | — | — | 🟡 | RLS SQL + `db:test-rls` PASS on prod |
| **POS** | 🟢 | 🟢 | — | — | — | Checkout, shifts, split pay |
| **INVENTORY** | 🟢 | 🟡 | — | — | — | GRN, transfers, variant stock |
| **PURCHASING** | 🟢 | — | — | — | — | PO + GRN |
| **STORE** | — | — | 🟢 | — | — | SSR catalog + COD checkout |
| **ORDERS** | 🟢 | 🟢 | — | — | — | Unified state machine |
| **PAYMENTS** | 🟢 | 🟢 | — | — | — | Split pay validated |
| **REFUNDS** | — | 🟢 | — | — | — | `/api/returns` + GL + audit |
| **WHATSAPP** | — | — | — | 🟡 | — | Live env + Graph send; webhook verify manual |
| **AUTOMATION** | — | — | — | 🟢 | — | ORDER_CREATED rule + logs |
| **JARVIS** | — | — | — | — | 🟡 | 11+ READ DB tools; live parity manual |
| **AGENTS** | — | — | — | — | 🟢 | 12 agents + `/api/agents/brief` |
| **CREATIVE** | — | — | — | — | 🟡 | Studio + approve-to-storefront; media gen optional |
| **REPAIRS (store)** | — | — | 🟢 | — | — | `/shop/repairs` MVP (deploy pending) |
| **SEO** | — | — | 🟢 | — | — | Meta, JSON-LD, sitemap |
| **PERFORMANCE** | 🟡 | — | 🟡 | — | — | Lighthouse open |
| **DEPLOYMENT** | 🟢 | — | — | — | — | Vercel + Supabase live |
| **TESTING** | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 64 unit tests; HTTP cert partial until deploy |

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
- [x] **RLS applied on host + `npm run db:test-rls` PASS** (prod pooler 2026-09-01)
- [x] Legacy triggers documented drop plan → [`LEGACY_MIGRATION_BRIDGE.md`](./LEGACY_MIGRATION_BRIDGE.md)
- [ ] Owner PIN rotated off `TEMP$1234` after first login

**R1 sign-off:**

```powershell
npm run release:gate -- --env-file .env.prod.txt --production --http
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
- [x] Automated commerce tests (34 tests in gate runner)
- [ ] Manual POS + return + GRN smoke (RT-M04–M06)
- [ ] Stock reservation API for storefront COD hold (optional R2.1)

---

## R3 exit criteria (Storefront)

Minimum sellable package: **POS + Inventory + Online Store + COD**

- [x] SSR `/products/[slug]` + Product JSON-LD
- [x] `/sitemap.xml` + `/robots.txt` (disallow `/adminpoz`)
- [x] CMS blocks in `business_config`
- [x] Theme tokens (stone/gold storefront)
- [x] Guest + account COD checkout
- [x] HTTP smoke (homepage, checkout, `/adminpoz`, robots)
- [x] Public repairs routes (`/shop/repairs`, track, request) — **deploy to prod**
- [ ] Mobile Lighthouse ≥ 80 on product + checkout

---

## R4 exit criteria (Communication)

Pipeline:

```text
ORDER_CREATED → automation engine → WhatsApp template → automationLogs
```

- [x] Automation rules + event log
- [x] ORDER_CREATED action (live Graph send when env set)
- [x] `REPAIR_CREATED` / `REPAIR_READY` repair automations
- [x] Inbound webhook `/api/webhooks/whatsapp` + signature verify
- [x] WhatsApp env on Vercel production
- [x] Integration unit tests (3/3)
- [ ] Meta Developer Console webhook verified
- [ ] Delivery proof: `automationLogs` SUCCESS after storefront COD + phone

**Meta webhook:**

```text
Callback URL:  https://grabber-poz-solo.vercel.app/api/webhooks/whatsapp
Verify token:  (WHATSAPP_VERIFY_TOKEN on Vercel)
```

---

## R5 exit criteria (Jarvis)

Jarvis = **business intelligence + controlled operations**, not autonomous agent.

- READ → real DB (`sales-metrics.ts` SSOT shared with dashboard)
- PROPOSE → Approval Center → EXECUTE → audit log

Checklist:

- [x] Approval Center UI (`/approvals`)
- [x] Daily brief (`/api/jarvis/brief`)
- [x] Dashboard + Jarvis share `completedOrderFilter` (unit tested)
- [x] Jarvis/metrics automated tests (7/7)
- [ ] HTTP E2E: `get_sales_summary` matches `/api/dashboard/stats` on live data
- [ ] Full EXECUTE audit trail (R6)

Example READ questions Jarvis should answer reliably:

- Today's sales, low stock, top products, pending COD, branch totals, reorder hints

---

## R6 exit criteria (Agents) — **MVP complete**

Deterministic DB-grounded agents (no LLM required for v1):

| Agent | Module | Data source |
|-------|--------|-------------|
| SALES | Core | `orders` — today revenue + pending COD |
| INVENTORY | Core | `stock_balances` + reorder levels |
| MARKETING | Core | Brand/automation hints |
| REPAIR | Vertical | `repair_jobs` queue |
| RESTAURANT | Vertical | `dining_tables` + `kitchen_tickets` |
| HIRE_PURCHASE | Vertical | `hire_purchase_contracts` EMIs |
| APPOINTMENTS | Vertical | `appointments` today + 24h |
| LOYALTY | Vertical | `loyalty_members` tiers/points |
| WHOLESALE | Vertical | `quotations` collection |
| POLIM | Credit | `polim_potha_accounts` balances |
| WHATSAPP | Communication | `automationLogs` failures |
| CREATIVE | Communication | `creative_projects` pending |

- [x] All 12 agents in registry (`src/lib/agents/registry.ts`)
- [x] Vertical flag gating via `business_config.verticalFlags`
- [x] `/api/agents/run` — single or `all: true`
- [x] `/api/agents/brief` — combined daily brief
- [x] UI at `/ai/agents` grouped by category
- [ ] PROPOSE → Approval Center → EXECUTE for agent-generated drafts
- [ ] Optional LLM intent layer

---

## R7 exit criteria (Creative) — **MVP live**

- [x] Creative Studio UI + project jobs in DB
- [x] Approve-to-storefront CMS path (`/api/creative/approve`)
- [x] Brand brain config
- [ ] Live image/video generation (FAL / Replicate env)
- [ ] Repair + product promo templates in library

---

## R6–R7 — blocked until R5 green (superseded)

**Previous gate:** blocked until R5 green. **Updated:** R5 automated tests pass; R6/R7 MVP shipped as deterministic layers. Full autonomy still requires approval EXECUTE audit + media providers.

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
2. Do not claim WhatsApp live until credentials set **and** delivery logged in `automationLogs`.
3. Do not claim SEO-ready until SSR + sitemap exist.
4. Database truth > documentation > AI interpretation.

---

## Related

- [`NEXT_PHASES.md`](./NEXT_PHASES.md) — deploy rollout
- [`AGENTS.md`](./AGENTS.md) — R6 agent catalog (12 agents)
- [`REPAIRS_STOREFRONT_BLUEPRINT.md`](./REPAIRS_STOREFRONT_BLUEPRINT.md) — repairs + storefront plan
- [`LEGACY_MIGRATION_BRIDGE.md`](./LEGACY_MIGRATION_BRIDGE.md) — trigger drop plan
- [`correction.md`](./correction.md) — sprint tracker
- [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) — operator checklist
