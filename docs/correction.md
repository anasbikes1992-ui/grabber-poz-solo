# Grabber Business OS — Final Correction Tracker

Master fix list + sprint execution tracker for MyPoz Solo evolution.  
**Status:** `DONE` · `IN_PROGRESS` · `TODO` · `DEFERRED`

Last updated: 2026-09-01  
**Active sprint:** S11+ (deploy live + storefront polish)  
**Fresh deploy:** [`FRESH_START.md`](./FRESH_START.md) · **Next steps:** [`NEXT_PHASES.md`](./NEXT_PHASES.md)

Roadmap: [`ROADMAP.md`](./ROADMAP.md) · Gate: [`RELEASE_GATE.md`](./RELEASE_GATE.md) · Code map: [`IMPLEMENTATION_MAP.md`](./IMPLEMENTATION_MAP.md)

---

## Executive verdict

> **poz-solo live on Vercel; storefront ~85%; admin at `/adminpoz` not linked from storefront; R1–R5 automated gate PASS (2026-09-01).**

Strong commerce/operations engine with unfinished experience + intelligence layers.

Do **not** rebuild POS. Prioritize: **migration reproducibility → storefront polish → WhatsApp automation → grounded Jarvis → agents/creative.**

| Layer | Status |
|-------|--------|
| Waves 0–5 (durable core) | DONE |
| Dual surface (storefront `/` + staff `/app` via `/adminpoz`) | DONE |
| Vercel + Supabase production deploy | DONE |
| Storefront UX (stone/gold theme, motion) | ~85% |
| Sprint S1 (migrations + Jarvis session + docs) | DONE |
| Sprint S2 (RLS + settings persistence) | DONE |
| Release R1 gate | CONDITIONALLY READY (automated PASS 2026-09-01) |
| Release R6 agents | CONDITIONALLY READY (12 agents — [`AGENTS.md`](./AGENTS.md)) |
| Repairs storefront MVP | DONE — push `c74e829+` for prod HTTP cert |
| Full Business OS (doc §106 E2E) | BLOCKED |

---

## Phase 0 — Freeze baseline

| ID | Item | Class | Status |
|----|------|-------|--------|
| P0-01 | Git + production behaviour checkpoint documented | KEEP | DONE |
| P0-02 | Feature classification map | KEEP | DONE → [`IMPLEMENTATION_MAP.md`](./IMPLEMENTATION_MAP.md) |
| P0-03 | Seven-release roadmap | KEEP | DONE → [`ROADMAP.md`](./ROADMAP.md) |
| P0-04 | Release gate doc | KEEP | DONE → [`RELEASE_GATE.md`](./RELEASE_GATE.md) |
| P0-05 | Stop using `db:push` as production SSOT | FIX | DONE (`db:bootstrap` + guarded `0002`) |

---

## Phase 1 — Database first (Release 1)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| DB-01 | CRITICAL | `0002_legacy_column_canonicalization.sql` | DONE |
| DB-02 | CRITICAL | `npm run db:bootstrap` (0000→0002 + align) | DONE |
| DB-03 | CRITICAL | Resolve `shifts.cashier_id` without interactive push | DONE (in 0002) |
| DB-04 | HIGH | Legacy column sync triggers (PO, PO lines, tax_rates) | DONE (bridge) |
| DB-05 | HIGH | `scripts/align-missing-columns.mjs` | DONE |
| DB-06 | HIGH | Drop legacy columns + triggers after backfill | TODO (S2) |
| DB-07 | CRITICAL | Fresh DB: migrate → seed → certify path documented | DONE |
| DB-08 | HIGH | RLS baseline apply + automated tests | DONE (`db:apply-rls`, `db:test-rls`, `release:gate-r1`) |

**Target flow:**

```text
Drizzle schema → numbered migrations → db:bootstrap → seed → certify → production
```

---

## Phase 2 — Resellable Solo (Release 1)

| ID | Item | Status |
|----|------|--------|
| RSL-01 | One codebase, per-customer DB/env/branding | DONE |
| RSL-02 | `scripts/sync-vercel-env.mjs` | DONE |
| RSL-03 | `scripts/provision-client.mjs` runbook | DONE |
| RSL-04 | Onboarding wizard (no code edits per customer) | TODO (S3+) |
| RSL-05 | Business + brand + payment + WhatsApp setup checklist | PARTIAL |
| SET-01 | Business profile API (`/api/settings/business`) | DONE |
| SET-02 | Marketing pixels API (`/api/settings/marketing`) | DONE |
| SET-03 | Settings UI loads/saves from DB | DONE |
| SET-04 | Backup export wired to `/api/backup/export` | DONE |

---

## Phase 3 — Security + real session (Release 1)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| SEC-01 | Jarvis hardcoded `user_owner_01` removed | CRITICAL | DONE |
| SEC-02 | `buildJarvisContext()` from `getSession()` | CRITICAL | DONE |
| SEC-03 | Jarvis API requires staff session in production | CRITICAL | DONE |
| SEC-04 | RLS automated probes in certify | HIGH | DONE (`db:apply-rls`, `db:test-rls`) |
| SEC-05 | Rate limits on Jarvis / public APIs | MEDIUM | DONE (`src/lib/security/rate-limit.ts`, middleware) |
| SEC-06 | Granular permission matrix | MEDIUM | DEFERRED (R2+) |

---

## Phase 4 — MyPoz core services (preserve)

| ID | Item | Status |
|----|------|--------|
| CORE-01 | `checkout-repo.ts` atomic sales | DONE — KEEP |
| CORE-02 | Commerce engines (pricing/tax/inventory/credit/GL) | DONE — KEEP |
| CORE-03 | No duplicate pricing/checkout for Jarvis/WhatsApp | IN_PROGRESS |
| CORE-04 | API-first: UI + Jarvis share same repos | IN_PROGRESS |

---

## Phase 5–6 — Commerce complete (Release 2)

| ID | Item | Status |
|----|------|--------|
| COM-01 | POS hold / resume | DONE (S4) |
| COM-02 | Split payment (not collapsed to CASH) | DONE (S3) |
| COM-03 | Product variants UI + stock by variant | DONE (S4) |
| COM-04 | Multi-barcode, member price, SEO product fields | TODO (S5) |
| COM-05 | Inventory reservations + incoming | DONE (`/api/inventory/reserve`) |
| COM-06 | Unified order state machine (POS + store + admin) | DONE (S3) |
| COM-07 | Promotion rules engine (server-side) | DONE (S3) |
| COM-08 | Import validate → preview → commit | DONE (S4) |

---

## Phase 7–11 — Storefront flagship (Release 3)

| ID | Item | Status |
|----|------|--------|
| STR-01 | SSR `/products/[slug]` | DONE (S5) |
| STR-02 | Category / brand / collection routes | DONE (`/categories/[slug]`, `/collections/[slug]` → category) |
| STR-03 | Server-side search + filters | DONE (`GET /api/storefront/search`) |
| STR-04 | Cart + checkout pages | DONE (`/shop/checkout`) |
| STR-05 | Guest + account COD checkout | DONE |
| STR-06 | Homepage block CMS (persisted) | DONE |
| STR-07 | Theme engine (stone/gold) | DONE |
| STR-08 | SEO meta + OG + JSON-LD | DONE (S5) |
| STR-09 | `sitemap.xml` + `robots.txt` | DONE (S5) |
| STR-08 | Storefront banner slots (TOP/HERO/MID/PRE_CATALOG/FOOTER) | DONE |
| STR-09 | CMS theme tokens → live `--sf-*` vars + WhatsApp CTA | DONE |
| VRT-01 | Settings UI for vertical flags | DONE |
| VRT-02 | Vertical PATCH/DELETE APIs (appointments, loyalty, HP, restaurant, quotes, repairs) | DONE |
| STR-11 | Storefront shell + repairs nav | DONE (`StorefrontShell`, `/shop/repairs`) |

---

## Phase 12–13 — WhatsApp + automation (Release 4)

| ID | Item | Status |
|----|------|--------|
| REP-01 | Public repairs landing + wizard + track | DONE |
| REP-02 | Staff queue status + WhatsApp on READY | DONE |
| REP-03 | Repair agent (R6) | DONE |
| REP-04 | Staff ticket workspace `/repairs/[id]` | DONE (parts-from-stock via `/api/repairs/[id]/parts`) |
| WA-01 | Outbound send (live when env set) | DONE |
| WA-02 | Inbound webhooks + signature verify | DONE |
| WA-03 | Template registry + variables | DONE (declare/validate variables on save) |
| AUTO-01 | Event → condition → action engine | DONE |
| AUTO-02 | `ORDER_CREATED` → WhatsApp rule | DONE |
| AUTO-03 | `STOCK_LOW` → owner notify | DONE (checkout + repair parts; default rules) |
| AUTO-04 | Retry + idempotency + delivery log | DONE (dedup keys, failed-log retry API + UI) |

---

## Phase 14–17 — Jarvis (Release 5)

| ID | Item | Status |
|----|------|--------|
| JAR-01 | DB tools: sales, inventory, orders, customers | DONE (11+ tools) |
| JAR-02 | `get_dashboard_summary` | DONE |
| JAR-03 | Draft tools (promotion, PO, message) | DONE (DRAFT → Approvals queue) |
| JAR-04 | EXECUTE → approval required | PARTIAL (Jarvis token + agent EXECUTE at `/approvals`) |
| JAR-05 | Approval Center UI | DONE |
| JAR-06 | Daily business brief | DONE |
| JAR-07 | LLM orchestrator (intent → tool) | PARTIAL |
| JAR-08 | AI provider abstraction | DEFERRED |

---

## Phase 18–22 — Agents + Creative (Release 6)

| ID | Item | Status |
|----|------|--------|
| AGT-01 | Agent orchestrator (12 agents, vertical flags) | DONE |
| AGT-02 | Core + vertical agents (SALES…CREATIVE) | DONE |
| AGT-03 | `/api/agents/brief` + run-all | DONE |
| AGT-04 | Agent → Approval EXECUTE bridge | DONE (PROPOSE drafts + EXECUTE via `/approvals` + audit) |
| CRE-01 | Brand brain in config | DONE |
| CRE-02 | Brief → generate → review → approve → publish | PARTIAL (approve-to-storefront) |
| CRE-03 | Store banner + WhatsApp from creative | DONE (MID_BANNER slot + owner WhatsApp on approve) |
| INT-01 | Jarvis → agents → creative → approval pipeline | PARTIAL |

---

## Phase 23–30 — Advanced (Release 7)

| ID | Item | Status |
|----|------|--------|
| VERT-01 | Restaurant / repair / HP / appointments depth | PARTIAL (delivery + barcodes wired; warranties POST; loyalty redeem; appointments DELETE) |
| CRM-01 | Segmentation UI + Jarvis targeting | TODO |
| LOY-01 | Points / tiers / rewards | DONE (earn/redeem/enroll/delete via `/api/loyalty` + UI) |
| PROM-01 | Full IF/THEN promotion engine | TODO |
| ANA-01 | Deterministic KPI layer | PARTIAL (dashboard stats) |
| TST-01 | E2E doc §106 workflow | TODO → `E2E-01` |
| TST-02 | Migration fresh + upgrade tests | TODO |
| TST-03 | HTTP cert extension | OPTIONAL |

---

## E2E master test

| ID | Item | Status |
|----|------|--------|
| E2E-01 | Full doc §106 workflow from fresh DB | BLOCKED |

---

## Completed waves (historical — do not regress)

### Wave 0 — Honesty & gate integrity — DONE

W0-01 … W0-10 — see git history.

### Wave 1 — Durable core — DONE

W1-01 … W1-11 — **Note:** W1-10 updated: prefer `db:bootstrap` over `db:push`.

### Wave 2 — Auth, RLS, security — DONE (RLS apply manual)

W2-01 … W2-08

### Wave 3 — Counter hardware & ops — DONE

W3-01 … W3-06

### Wave 4 — Accessibility — DONE

A11Y-01 … A11Y-10

### Wave 5 — Integrations & verticals — DONE

W5-01 … W5-06

### Wave D — Design system — DONE

WD-01 … WD-06

### Dual surface — DONE

DUAL-01 … DUAL-04

---

## Schema SSOT rules

1. **Canonical schema:** `src/db/schema.ts` (49 tables).
2. **Migrations:** `drizzle/migrations/0000` → `0002` via `npm run db:bootstrap`.
3. **Do not** rely on interactive `db:push` for production.
4. **Legacy bridges:** triggers in `0002` are temporary until DB-06.
5. **COA codes:** `1010`, `1020`, `1090`, `1100`, `1200`, `2000`, `2100`, `4000`, `5000`.
6. **Verticals:** `business_config.config_json.verticalFlags`.

---

## Cert pillars — honesty matrix

| Pillar | Status |
|--------|--------|
| Schema & COA | YES |
| Owner user present | YES |
| POS cash + stock + GL (SQL) | YES |
| Polim / returns / purchasing | YES |
| Webhook idempotency | YES |
| Jarvis DB-grounded tools | PARTIAL (S1) |
| HTTP API cert | OPTIONAL (`client:certify:http`) |
| RLS automated | PARTIAL (`db:apply-rls`, `db:test-rls`) |
| Storage CDN | NO (honest) |
| Storefront SEO | YES (S5 SSR + sitemap) |
| Automation engine | DONE (rules + logs + idempotency + retry + STOCK_LOW) |

---

## Operator quick path

```bash
# 1. Environment
cp .env.example .env.local   # fill DATABASE_URL, AUTH_SECRET

# 2. Database (migration-driven)
npm run db:bootstrap
# optional: npm run db:bootstrap -- --rls --certify

# 3. Seed (dev)
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"storeName":"Shopping Station","slug":"shopping-station","ownerPin":"1234"}'

# 4. Verify
npm run typecheck && npm test && npm run client:certify

# 5. Deploy
npm run ops:sync-env   # production secrets
npx vercel --prod --yes
```

Staff: `/adminpoz` → `/app` · Shopper: `/` · Jarvis tools: `POST /api/jarvis/chat` with staff cookie.

---

## Sprint log

| Sprint | Focus | Status |
|--------|-------|--------|
| **S1** | Migrations, bootstrap, Jarvis session + DB tools, docs | DONE |
| **S2** | RLS scripts/tests, settings + marketing persistence | DONE |
| **S3** | Order unification, promotions, split pay | DONE |
| **S4** | POS polish, variants, import | DONE |
| **S5** | SSR storefront + SEO | DONE |
| **S6** | CMS blocks, themes, `/shop/checkout`, categories SSR | DONE |
| **S7** | Automation engine (ORDER_CREATED rules + logs) | DONE |
| **S8** | WhatsApp webhook + templates API | DONE |
| **S9** | Approval Center + Jarvis EXECUTE queue | DONE |
| **S10** | Daily brief API + HTTP cert script | DONE |
| S11+ | R6–R7 + repairs storefront | 12 agents, `/shop/repairs`, automations | DONE |
| R7 vertical depth | Restaurant/repair/loyalty polish (Phase 2 ops) | PARTIAL |

---

## Next steps (recommended order)

1. **Fresh cloud** — follow [`FRESH_START.md`](./FRESH_START.md): new Supabase + Vercel, `db:bootstrap`, seed, deploy
2. **Live WhatsApp credentials** on Vercel (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`)
3. **Media pipeline** — `FAL_KEY` / `REPLICATE_API_TOKEN` for real video render
4. **DB-06** — drop legacy column bridges after verification
5. **Lighthouse budgets** — product + checkout mobile perf
6. **R7** — vertical depth + CRM campaigns (deferred)

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-31 | Waves 0–5, dual surface, design parity |
| 2026-09-01 | Ready for re-testing gate opened |
| 2026-09-01 | **S2:** RLS apply/test scripts, business + marketing settings APIs, settings UI persistence |
| 2026-09-01 | **S3:** Channel-aware checkout statuses, split payments, promotion engine + APIs, orders PATCH transitions |
| 2026-09-01 | **S4:** POS hold/resume (DRAFT orders), variant CRUD + catalog, CSV import validate/commit |
| 2026-09-01 | **S5:** SSR `/products/[slug]`, Product JSON-LD, sitemap.xml, robots.txt, storefront PDP links |
| 2026-09-01 | **S11+:** AGT-04 bridge, storefront CMS, vertical CRUD, `/repairs/[id]`, parts-from-stock, rate limits, STOCK_LOW |
| 2026-09-01 | **S11+ (cont.):** Stock reservation API, agent EXECUTE at `/approvals`, WhatsApp retry |
