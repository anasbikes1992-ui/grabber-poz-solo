# GRABBER BUSINESS OS — CLIENT ONBOARDING & PRODUCTION CERTIFICATION PLAYBOOK

Operational handbook for provisioning, validating, certifying, and handing over dedicated **GRABBER Business OS** client instances.

> **Readiness honesty:** Until Wave 1–2 in [`docs/correction.md`](./correction.md) are complete, treat UI pages as demos, commerce engines as in-memory, and `client:certify` as a **schema + synthetic SQL** gate — not full production proof (RBAC/RLS, CDN, or HTTP API durability are deferred).

---

## 1. Commercial Architecture & Service Level Standard

* **Architecture Model:** Dedicated Single-Business Instance (1 Business = 1 Isolated Supabase PostgreSQL + 1 Vercel Edge Deployment + 1 CDN Storage Bucket).
* **Schema SSOT:** [`src/db/schema.ts`](../src/db/schema.ts) (41 tables). Prefer `npm run db:push` / Drizzle migrations. `drizzle/supabase_setup.sql` must stay in sync (tracked as W1-10).
* **Delivery SLA:** Same-day go-live only after **schema/SQL cert passes** and **manual** owner auth + POS smoke — not after docs alone.
* **Zero Cross-Tenant Leakage:** Dedicated database isolates Polim Potha, GL, customers, and inventory.

---

## 2. End-to-End Client Lifecycle Workflow

```mermaid
flowchart TD
    A["1. Client Intake & Catalog Parsing"] --> B["2. Pre-Flight Env Validation (npm run env:validate)"]
    B --> C["3. Database Provisioning & Parameterized Ingestion"]
    C --> D["4. Vercel Production Deployment & Domain Binding"]
    D --> E["5. Instance Certification (npm run client:certify)"]
    E --> F["6. Owner Credential Setup & First-Login Reset"]
    F --> G["7. Final Handover & Training"]
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
* **P1 Warnings:** Transaction pooler detection; missing AUTH_SECRET in non-production.
* **Integrations Detected:** PayHere, Koombiyo, Meta WhatsApp, Supabase CDN (optional).

---

### Step 2: Database Provisioning & Parameterized Ingestion

1. Create a dedicated Supabase project in region `ap-southeast-1`.
2. Apply schema from SSOT:
   - Prefer `npm run db:push` against the client `DATABASE_URL`, **or**
   - Run a SQL dump that matches `src/db/schema.ts` (do not assume older column names in a stale `supabase_setup.sql`).
3. Seed Chart of Accounts codes: `1010`, `1020`, `1090`, `1100`, `1200`, `2000`, `2100`, `4000`, `5000`.
4. Ingest catalog:

```bash
npm run client:migrate -- --client "Shopping Station" --file "excel/Shopping Station Products data.csv"
```

* Validate SKU uniqueness, barcode format, price positivity.
* Rejected rows → `reports/rejected_rows_[client].csv`.

---

### Step 3: Vercel Edge Deployment & Custom Domain

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_APP_URL="https://shoppingstation.lk"
AUTH_SECRET="[secure-random-64-char-secret]"
NEXT_PUBLIC_STORE_NAME="Shopping Station"
```

Bind custom domain and DNS. Do **not** ship hardcoded owner passwords in docs or repos.

---

### Step 4: Instance Certification Gate

```bash
npm run client:certify -- --dry-run --client "Shopping Station" --slug "shoppingstation"
npm run client:certify -- --client "Shopping Station" --slug "shoppingstation"
```

**What the suite actually verifies today**

1. **Schema:** All 41 tables from `schema.ts` present.
2. **COA:** Standard ledger codes including `1010` / `1200` / `4000` / `5000`.
3. **Users:** At least one active user; OWNER role when users exist.
4. **Live SQL chains (not dry-run):** cash sale + stock + balanced journals; Polim `INVOICE`/`REPAYMENT`; return reversal; supplier AP + stock intake; webhook unique `(provider, provider_event_id)`; zero-residue cleanup.

**Not verified yet (blocked / deferred — see correction.md)**

* Security & RBAC / RLS policy probes
* Storage & CDN read/write smoke
* HTTP `/api/pos/checkout` path (engines still in-memory)

> **P0 Gate Rule:** If `P0 Failures > 0`, handover is **BLOCKED**.  
> Report: `reports/CLIENT_CERTIFICATION_[SLUG].md`.  
> A green report means **schema/SQL gates passed**, not that the Next.js app persists commerce to Postgres.

---

### Step 5: Secure Owner Account Setup

1. Provision OWNER via secure onboarding (hashed PIN/password — Wave 2).
2. Until auth is durable, treat `/login` as a **demo gate** only.
3. Target state: first login forces password + POS PIN rotation and verifies currency/tax/receipt header.

---

### Step 6: Rollback & Emergency Recovery

```sql
TRUNCATE public.order_items, public.orders, public.stock_movements, public.stock_balances,
  public.product_variants, public.products CASCADE;
```

Full re-provision: drop/recreate schema from SSOT, then re-run certify.

---

## 4. Operational Handover Checklist

- [ ] `npm run env:validate -- --production` → 0 P0 errors
- [ ] Schema matches `src/db/schema.ts` (41 tables + COA seed)
- [ ] Catalog migrated with rejected rows reviewed
- [ ] Vercel domain + SSL active
- [ ] `npm run client:certify` → no P0 failures
- [ ] [`docs/correction.md`](./correction.md) Wave 1–2 blockers accepted or closed
- [ ] Manual POS smoke (sale, receipt, drawer) on counter hardware
- [ ] Owner credentials rotated (no shared demo PIN in production)

---

## 5. Related docs

* [`docs/correction.md`](./correction.md) — master fix tracker  
* [`docs/certification/CERTIFICATION_LEVELS.md`](./certification/CERTIFICATION_LEVELS.md)  
* [`docs/certification/BUSINESS_INVARIANTS.md`](./certification/BUSINESS_INVARIANTS.md)  
