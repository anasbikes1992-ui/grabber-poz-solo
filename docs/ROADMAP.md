# Grabber Business OS — Product Roadmap

Sprint-based plan. **Sellable scope:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) · [`STAGE_READINESS.md`](./STAGE_READINESS.md).  
**No rebuild of POS.** Extend the existing commerce engine.

Status legend: `DONE` · `IN_PROGRESS` · `TODO` · `DEFERRED`

---

## Current position (baseline)

**Live:** `grabber-poz-solo.vercel.app` · Supabase connected · storefront catalog live  
**Staff login:** `/adminpoz` only (not on public storefront)

**Productization freeze (2026-09-03):** architecture KEEP · no rewrite.
`M0` Architecture freeze **DONE** · `M1` Security investigation **DONE** · `M2` Security hardening **DONE**.
`M3` Commerce Integrity **CERTIFIED (12/12 GREEN)** · Slices 1–7 complete.
`M4` Payment Gateway Adapter Framework **COMPLETE** (COD, PayHere, WebXPay, Koko, Mintpay, Payzy).
`M5` Storefront Promotion & Conversion Engine **CERTIFIED** (PI-001 through PI-012, popup, announcement, auto-promotions, promo codes).
`M6` Installation Identity & Client Configuration **CERTIFIED** (Standalone single-business identity, tamper-resistant HMAC license, diagnostics).
**Next:** `M7` Client Onboarding (11-step interactive owner setup wizard for fresh installations).
**Commercial verdict:** COMMERCE CERTIFIED. Each client install passes `--production --http` release gate.

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
| WhatsApp / Automation | ~75% | 🟡 |
| Jarvis | ~55% | 🟡 |
| Agents | Stub only | 🔴 |
| Creative Engine | ~30% | 🟡 |
| Testing | ~50% | 🟡 |

---

## Seven releases (delivery train)

### Release 1 — Solo Foundation `R1`

**Goal:** Reproducible database + security baseline.

| Phase | Focus | Status |
|-------|-------|--------|
| P0 | Freeze baseline — classify KEEP/FIX/COMPLETE/REPLACE/REMOVE | DONE |
| P1 | Migration-driven DB (`0000`–`0002`, `npm run db:bootstrap`) | DONE |
| P2 | Remove schema bridges (post-backfill legacy column drop) | TODO (doc: `0003`) |
| P3 | RLS apply + automated policy tests | DONE (prod probe PASS) |
| P4 | Real Jarvis session (`getSession` → context) | DONE |
| P5 | Business config persistence (settings → `business_config`) | DONE |
| P6 | Deployment runbook (Vercel + Supabase per customer) | DONE |

**Exit gate:** Fresh Supabase → `db:bootstrap` → seed → `client:certify` passes. **Automated R1 gate PASS** (see `RELEASE_GATE.md`).

---

### Release 2 — Commerce Complete `R2`

**Goal:** Reliable daily operations without AI.

| Phase | Focus | Status |
|-------|-------|--------|
| P5 | POS verification (hold/resume, split pay, refunds) | DONE |
| P5 | Product engine (variants, barcodes, SEO fields) | PARTIAL |
| P5 | Inventory (reservations, incoming, batch/serial flags) | PARTIAL |
| P6 | Unified order state machine (POS + Store + admin) | DONE |
| P6 | Promotion rules engine (server-side) | DONE |
| P5 | Import pipeline (validate → commit) | DONE |

**Exit gate:** Doc §106 steps through POS sale + return + GRN without manual DB fixes. **Automated tests PASS**; manual smoke open.

---

### Release 3 — Storefront `R3` ⭐ highest ROI

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
| P12 | WhatsApp inbound webhooks + conversations | DONE (signature verify) |
| P13 | Automation engine (EVENT → CONDITION → ACTION) | DONE |
| P12 | Templates + variable validation | PARTIAL |
| P13 | Retry + idempotency + delivery logs | PARTIAL |

**Exit gate:** `ORDER_CREATED` → WhatsApp confirmation with audit log. **Code + env DONE**; Meta webhook verify + delivery proof manual.

---

### Release 5 — Jarvis `R5`

**Goal:** Grounded business assistant.

| Phase | Focus | Status |
|-------|-------|--------|
| P14 | Tool registry (10+ DB tools) | DONE |
| P15 | READ / DRAFT / EXECUTE permission model | PARTIAL |
| P17 | Approval Center UI | DONE |
| P27 | Deterministic analytics → Jarvis interpretation | DONE (`sales-metrics.ts`) |
| P28 | Daily business brief | DONE |

**Exit gate:** Owner asks “today’s sales?” → correct DB-backed answer; EXECUTE requires approval. **Unit tests PASS**; live HTTP parity manual.

---

### Release 6 — Agents + Creative `R6`

**Goal:** Marketing intelligence layer — deterministic agents per vertical.

| Phase | Focus | Status |
|-------|-------|--------|
| P18 | Agent orchestrator (12 agents, vertical flags) | DONE |
| P18 | `/api/agents/run` + `/api/agents/brief` | DONE |
| P19–21 | Creative workflow (brief → generate → approve → publish) | PARTIAL |
| P20 | Brand brain in `business_config` | DONE |
| P22 | Jarvis → Creative → Store/WhatsApp pipeline | PARTIAL |

**Exit gate:** Owner runs all agents → actionable brief; creative approve updates storefront. See [`AGENTS.md`](./AGENTS.md).

**Open:** Agent recommendations → Approval Center EXECUTE audit.

---

### Release 7 — Business OS Modes `R7`

**Goal:** Optional vertical depth.

| Phase | Focus | Status |
|-------|-------|--------|
| P23 | Restaurant / Repair / Services / Wholesale depth | PARTIAL (agents + `/shop/repairs` MVP) |
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
