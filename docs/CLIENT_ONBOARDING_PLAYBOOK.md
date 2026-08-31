# GRABBER BUSINESS OS — CLIENT ONBOARDING & PRODUCTION CERTIFICATION PLAYBOOK

Operational handbook for provisioning, validating, certifying, and handing over dedicated **GRABBER Business OS** client instances.

> **Readiness (2026-09-01):** Correction waves 0–5 + dual storefront/staff auth are **closed** ([`docs/correction.md`](./correction.md)). Commerce APIs persist to Postgres. Re-test gate: [`docs/READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md).  
> Automated `client:certify` still means **schema + synthetic SQL** (plus optional HTTP). RLS host apply and full CDN probes remain manual / not auto-certified.

---

## 1. Commercial Architecture & Service Level Standard

* **Architecture Model:** Dedicated Single-Business Instance (1 Business = 1 Isolated Supabase PostgreSQL + 1 Vercel Edge Deployment + optional Storage bucket).
* **Schema SSOT:** [`src/db/schema.ts`](../src/db/schema.ts) (**49 tables**). Prefer `npm run db:push`. `drizzle/supabase_setup.sql` is legacy reference only; RLS baseline is `drizzle/rls_baseline.sql` (apply manually).
* **Dual surface:** Public storefront at `/` (shoppers); staff OS at `/app` via `/login` (PIN session).
* **Delivery SLA:** Same-day go-live only after **schema/SQL cert passes**, **Ready for Re-Testing P0**, and **manual** owner auth + POS smoke — not after docs alone.
* **Zero Cross-Tenant Leakage:** Dedicated database isolates Polim Potha, GL, customers, and inventory.

---

## 2. End-to-End Client Lifecycle Workflow

```mermaid
flowchart TD
    A["1. Client Intake & Catalog Parsing"] --> B["2. Pre-Flight Env Validation (npm run env:validate)"]
    B --> C["3. Database Provisioning db:push + Seed"]
    C --> D["4. Vercel Production Deployment & Domain Binding"]
    D --> E["5. Instance Certification (npm run client:certify)"]
    E --> F["6. Ready for Re-Testing P0 checklist"]
    F --> G["7. Owner Credential Rotation"]
    G --> H["8. 7-Day Pilot / Handover"]
```

---

## 3. Operational Step-by-Step Execution

### Step 1: Pre-Flight Environment Validation

```bash
npm run env:validate -- --env-file .env.client-production
# Production-strict (AUTH_SECRET is P0):
npm run env:validate -- --env-file .env.client-production --production
```

* **P0 Checks:** `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`; in production/`--production`: `AUTH_SECRET` (≥32 chars).
* **P1 Warnings:** Transaction pooler detection; missing `MASTER_ENCRYPTION_KEY` when using settings secrets.
* **Integrations Detected:** PayHere, Koombiyo, Meta WhatsApp, Supabase Storage (optional).

---

### Step 2: Database Provisioning & Seed

1. Create a dedicated Supabase project in region `ap-southeast-1` (or agreed region).
2. Apply schema: `npm run db:push` against the client `DATABASE_URL`.
3. Optionally apply `drizzle/rls_baseline.sql` in the SQL editor.
4. Seed COA + demo catalog + OWNER + shopper:

```bash
# App running with DATABASE_URL
curl -X POST "$NEXT_PUBLIC_APP_URL/api/seed"
```

Or ingest a client catalog:

```bash
npm run client:migrate -- --client "Shopping Station" --file "excel/Shopping Station Products data.csv"
```

* Validate SKU uniqueness, barcode format, price positivity.
* Rejected rows → `reports/rejected_rows_[client].csv`.

**Seed demo (dev only):** OWNER PIN `1234`; shopper `+94771234567` / `1234`. **Rotate before production handover.**

---

### Step 3: Vercel Edge Deployment & Custom Domain

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_APP_URL="https://shoppingstation.lk"
AUTH_SECRET="[secure-random-64-char-secret]"
MASTER_ENCRYPTION_KEY="[32+ byte secret for settings vault]"
NEXT_PUBLIC_STORE_NAME="Shopping Station"
```

Bind custom domain and DNS. Do **not** ship hardcoded owner passwords in docs or repos.

---

### Step 4: Instance Certification Gate

```bash
npm run client:certify -- --dry-run --client "Shopping Station" --slug "shoppingstation"
npm run client:certify -- --client "Shopping Station" --slug "shoppingstation"
# Optional — app must be up:
CERTIFY_HTTP_BASE_URL=https://shoppingstation.lk npm run client:certify -- --client "Shopping Station" --slug "shoppingstation"
```

**What the suite verifies today**

1. **Schema:** All **49** tables from `schema.ts` present.
2. **COA:** Standard ledger codes including `1010` / `1200` / `4000` / `5000`.
3. **Users:** At least one active user; OWNER role when users exist.
4. **Live SQL chains (not dry-run):** cash sale + stock + balanced journals; Polim `INVOICE`/`REPAYMENT`; return reversal; supplier AP + stock intake; webhook unique `(provider, provider_event_id)`; zero-residue cleanup.
5. **Optional HTTP:** health + catalog (+ other probes when `CERTIFY_HTTP_BASE_URL` set).

**Not auto-verified**

* Full RLS policy probe matrix (baseline SQL exists — apply manually)
* Storage & CDN end-to-end smoke
* Concurrent last-unit race under load

> **P0 Gate Rule:** If `P0 Failures > 0`, handover is **BLOCKED**.  
> Report: `reports/CLIENT_CERTIFICATION_[SLUG].md`.  
> Level name may be `L4_SCHEMA_SQL_CERTIFIED` — see certification levels doc.

---

### Step 5: Ready for Re-Testing + Secure Owner Setup

1. Complete [`docs/READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) P0 checklist.
2. Staff: `/login` → `/app` (roles: OWNER, MANAGER, CASHIER, WAREHOUSE, ACCOUNTANT, MARKETING).
3. Shoppers: `/` + `/shop/login`.
4. Force first-login PIN rotation (`TEMP$` / PATCH login) before client go-live.
5. Verify currency/tax/receipt header in Settings.

---

### Step 6: Rollback & Emergency Recovery

```sql
TRUNCATE public.order_items, public.orders, public.stock_movements, public.stock_balances,
  public.product_variants, public.products CASCADE;
```

Full re-provision: drop/recreate schema from SSOT (`db:push`), re-seed, then re-run certify + Ready for Re-Testing.

---

## 4. Operational Handover Checklist

- [ ] `npm run env:validate -- --production` → 0 P0 errors
- [ ] Schema matches `src/db/schema.ts` (49 tables + COA seed)
- [ ] Catalog migrated / seeded; rejected rows reviewed
- [ ] Vercel domain + SSL active
- [ ] `npm run client:certify` → no P0 failures
- [ ] [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) P0 signed PASS
- [ ] Manual POS smoke (sale, receipt, drawer) on counter hardware
- [ ] Storefront shopper checkout smoke
- [ ] Owner credentials rotated (no shared demo PIN in production)
- [ ] Optional: RLS baseline applied

---

## 5. Related docs

* [`docs/READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) — re-test gate  
* [`docs/correction.md`](./correction.md) — master fix tracker  
* [`docs/certification/CERTIFICATION_LEVELS.md`](./certification/CERTIFICATION_LEVELS.md)  
* [`docs/certification/BUSINESS_INVARIANTS.md`](./certification/BUSINESS_INVARIANTS.md)  
* [`docs/certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md)  
* [`docs/certification/FAILURE_SCENARIOS.md`](./certification/FAILURE_SCENARIOS.md)  
