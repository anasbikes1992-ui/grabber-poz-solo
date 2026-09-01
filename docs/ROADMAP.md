# Grabber Business OS — Product Roadmap

Sprint-based plan aligned with the MyPoz Solo master vision.  
**No rebuild of POS.** Extend the existing commerce engine.

Status legend: `DONE` · `IN_PROGRESS` · `TODO` · `DEFERRED`

---

## Current position (baseline)

**Live:** `grabber-poz-solo.vercel.app` · Supabase connected · storefront catalog live  
**Staff login:** `/adminpoz` only (not on public storefront)

| Area | Completion | Status |
|------|------------|--------|
| Core architecture | Strong | 🟢 |
| POS | ~85% | 🟢 |
| Inventory / Purchasing | Strong | 🟢 |
| Customers / Polim Potha | Good | 🟢 |
| Orders | Mostly there | 🟡 |
| Resellable Solo deploy | ~90% | 🟢 |
| Migrations | Numbered + bootstrap | 🟢 |
| Storefront | ~85% | 🟢 |
| SEO / CMS / Themes | ~65% | 🟡 |
| WhatsApp / Automation | ~55% | 🟡 |
| Jarvis | ~45% | 🟡 |
| Agents | Stub only | 🔴 |
| Creative Engine | ~30% | 🟡 |
| Testing | ~35% | 🟡 |

---

## Seven releases (delivery train)

### Release 1 — Solo Foundation `R1`

**Goal:** Reproducible database + security baseline.

| Phase | Focus | Status |
|-------|-------|--------|
| P0 | Freeze baseline — classify KEEP/FIX/COMPLETE/REPLACE/REMOVE | IN_PROGRESS |
| P1 | Migration-driven DB (`0000`–`0002`, `npm run db:bootstrap`) | IN_PROGRESS |
| P2 | Remove schema bridges (post-backfill legacy column drop) | TODO |
| P3 | RLS apply + automated policy tests | TODO |
| P4 | Real Jarvis session (`getSession` → context) | IN_PROGRESS |
| P5 | Business config persistence (settings → `business_config`) | TODO |
| P6 | Deployment runbook (Vercel + Supabase per customer) | DONE |

**Exit gate:** Fresh Supabase → `db:bootstrap` → seed → `client:certify` passes.

---

### Release 2 — Commerce Complete `R2`

**Goal:** Reliable daily operations without AI.

| Phase | Focus | Status |
|-------|-------|--------|
| P5 | POS verification (hold/resume, split pay, refunds) | TODO |
| P5 | Product engine (variants, barcodes, SEO fields) | TODO |
| P5 | Inventory (reservations, incoming, batch/serial flags) | PARTIAL |
| P6 | Unified order state machine (POS + Store + admin) | TODO |
| P6 | Promotion rules engine (server-side) | TODO |
| P5 | Import pipeline (validate → commit) | PARTIAL |

**Exit gate:** Doc §106 steps through POS sale + return + GRN without manual DB fixes.

---

### Release 3 — MyPoz Storefront `R3` ⭐ highest ROI

**Goal:** Flagship customer-facing commerce.

| Phase | Focus | Status |
|-------|-------|--------|
| P7 | SSR routes (`/products/[slug]`, categories, search) | DONE (S5) |
| P8 | Block CMS (homepage sections in `config_json`) | DONE (S6) |
| P9 | SEO (meta, OG, structured data, sitemap, robots) | DONE (S5) |
| P10 | Theme engine (tokens, presets) | DONE (S6) |
| P7 | Cart + checkout + COD (server price authority) | DONE |
| P7 | Customer accounts, wishlist, reviews | PARTIAL (accounts + COD; wishlist/reviews TODO) |

**Exit gate:** Crawlable product pages, mobile checkout, COD order visible in admin — **met**; Lighthouse budgets open.

---

### Release 4 — Communication `R4`

**Goal:** Event-driven WhatsApp + notifications.

| Phase | Focus | Status |
|-------|-------|--------|
| P12 | WhatsApp inbound webhooks + conversations | TODO |
| P13 | Automation engine (EVENT → CONDITION → ACTION) | TODO |
| P12 | Templates + variable validation | TODO |
| P13 | Retry + idempotency + delivery logs | PARTIAL |

**Exit gate:** `ORDER_CREATED` → WhatsApp confirmation with audit log.

---

### Release 5 — Jarvis `R5`

**Goal:** Grounded business assistant.

| Phase | Focus | Status |
|-------|-------|--------|
| P14 | Tool registry (10+ DB tools) | IN_PROGRESS |
| P15 | READ / DRAFT / EXECUTE permission model | PARTIAL |
| P17 | Approval Center UI | TODO |
| P27 | Deterministic analytics → Jarvis interpretation | PARTIAL |
| P28 | Daily business brief | TODO |

**Exit gate:** Owner asks “today’s sales?” → correct DB-backed answer; EXECUTE requires approval.

---

### Release 6 — Agents + Creative `R6`

**Goal:** Marketing intelligence layer.

| Phase | Focus | Status |
|-------|-------|--------|
| P18 | Agent orchestrator (Sales, Inventory, Marketing) | TODO |
| P19–21 | Creative workflow (brief → generate → approve → publish) | TODO |
| P20 | Brand brain in `business_config` | TODO |
| P22 | Jarvis → Creative → Store/WhatsApp pipeline | TODO |

**Exit gate:** Owner approves a promotion draft that updates storefront banner + WhatsApp draft.

---

### Release 7 — Business OS Modes `R7`

**Goal:** Optional vertical depth.

| Phase | Focus | Status |
|-------|-------|--------|
| P23 | Restaurant / Repair / Services / Wholesale depth | PARTIAL |
| P24 | CRM segmentation + campaigns | TODO |
| P25 | Loyalty (points, tiers) | PARTIAL |
| P26 | Advanced automation + scheduling | TODO |

---

## Sprint backlog (execution order)

| Sprint | Release | Deliverables |
|--------|---------|--------------|
| **S1** | R1 | `0002` migration, `db:bootstrap`, Jarvis session, docs | DONE |
| **S2** | R1 | RLS apply script + tests, settings persistence, marketing config API | DONE |
| **S3** | R2 | Order state machine unification, split payment, promotion engine v1 | DONE |
| **S4** | R2 | Product variants UI, import hardening, POS hold/resume | DONE |
| **S5** | R3 | SSR `/products/[slug]`, SEO metadata, sitemap | DONE |
| **S6** | R3 | CMS blocks, theme tokens, checkout flow | DONE |
| **S7** | R4 | Automation rules + ORDER_CREATED actions | DONE |
| **S8** | R4 | WhatsApp webhook + templates API | DONE |
| **S9** | R5 | Approval center + Jarvis EXECUTE queue | DONE |
| **S10** | R5 | Daily brief + HTTP cert extension | DONE |
| **S11+** | R6–R7 | Wire UI + creative approve workflow | DONE |

---

## Architecture (target)

```text
MYPOZ SOLO
    │
    ├── Commerce (POS, Orders, Payments) ──┐
    ├── Storefront (SSR, CMS, SEO)         │
    ├── Communication (WhatsApp, Auto)     ├──► BUSINESS SERVICES ──► DATABASE
    └── Intelligence (Jarvis, Agents)      │
              └── Creative Engine ─────────┘
```

**Rule:** One pricing engine, one checkout, one inventory engine — shared by UI, Store, Jarvis, WhatsApp.

---

## What not to do

- ❌ Rebuild POS
- ❌ Seven agents before grounded tools
- ❌ Microservices
- ❌ AI direct SQL access
- ❌ `db:push` as production migration strategy
- ❌ Client-only storefront for SEO-critical pages
- ❌ Per-customer source edits (use env + config)

---

## Related docs

- [`correction.md`](./correction.md) — sprint tracker + item IDs
- [`IMPLEMENTATION_MAP.md`](./IMPLEMENTATION_MAP.md) — code ↔ feature map
- [`RELEASE_GATE.md`](./RELEASE_GATE.md) — ship/no-ship checklist
- [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) — operator re-test steps
