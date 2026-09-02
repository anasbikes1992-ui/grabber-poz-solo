# GRABBER BUSINESS OS — 4-TIER CERTIFICATION FRAMEWORK

Before any client instance is declared ready for production handover, it is graded against four certification tiers.

> **Implementation status:** Waves 0–5 closed. Automated `npm run client:certify` covers **schema + synthetic SQL** (+ optional HTTP).  
> App durability is proven via [`READY_FOR_RETESTING.md`](../READY_FOR_RETESTING.md) + physical POS + (optional) 7-day acceptance — not cert SQL alone.  
> Contract language: [`CLAIMS_AND_SCOPE.md`](../CLAIMS_AND_SCOPE.md).

---

## Certification Levels

```
┌────────────────────────────────────────────────────────┐
│  LEVEL 4: OPERATIONAL RESILIENCE (Production Champion) │
├────────────────────────────────────────────────────────┤
│  LEVEL 3: FINANCIAL INTEGRITY (Double-Entry & AR/AP)   │
├────────────────────────────────────────────────────────┤
│  LEVEL 2: COMMERCE INTEGRITY (POS, Stock & Returns)    │
├────────────────────────────────────────────────────────┤
│  LEVEL 1: INSTANCE INTEGRITY (DB, Schema, Auth)        │
└────────────────────────────────────────────────────────┘
```

---

### Level 1 (L1) — Instance & Infrastructure Integrity

* **Scope:** PostgreSQL schema, COA seed, active users / OWNER.
* **Automated today:**
  1. All **49** tables from `src/db/schema.ts` present (incl. verticals).
  2. Chart of Accounts includes `1010`, `1200`, `4000`, `5000` (and seed set ≥5).
  3. At least one **active** user; **OWNER** role when users exist.
* **Manual / ops:**
  4. Apply `drizzle/rls_baseline.sql`; revoke anon DML (already removed from setup SQL).
  5. Storage bucket smoke (when using Supabase Storage).
  6. First-login credential rotation before client handover.
  7. Dual auth: staff cookie vs shopper cookie isolation.

---

### Level 2 (L2) — Commerce & Inventory Integrity

* **Scope:** POS checkout, barcode, stock movements, returns via **application APIs**.
* **Implemented in app (prove in Ready for Re-Testing):**
  1. Cash & card checkout via `/api/pos/checkout` with durable Postgres writes (POS + `STOREFRONT`).
  2. Stock decrements `on_hand` at branch location (concurrent-safe `UPDATE`).
  3. Returns restore `on_hand` and write `order_returns` + inverse GL.
  4. GRN / transfer / shifts bound to durable repos.
* **Cert script:** still approximates with **raw SQL** inserts for schema fitness; use optional HTTP + manual smoke for app wiring.

---

### Level 3 (L3) — Financial & Ledger Integrity

* **Scope:** Double-entry GL, Polim Potha AR, supplier AP.
* **Automated today (SQL chains):**
  1. Journal lines enforce Σ debit = Σ credit for cash sale and return.
  2. Cash sale posts to `1010` / `4000` / `5000` / `1200`.
  3. Polim `INVOICE` + `REPAYMENT` updates `polim_potha_accounts.current_balance`.
  4. Supplier `BILL` updates `supplier_accounts` with stock intake.
* **App-backed:** repay API, reports (sales by channel, AR aging, trial balance) — verify manually / via UI.
* **Still soft:** full VAT period lock / period-close enforcement depth.

---

### Level 4 (L4) — Operational Resilience

* **Automated today:**
  1. `webhook_events` unique on `(provider, provider_event_id)`.
  2. Synthetic entities purged with residue check.
* **Implemented in app (manual / optional HTTP):**
  3. Checkout idempotency keys / `client_uuid`.
  4. PayHere webhook signature verification.
  5. Concurrent stock guard in checkout repo.
* **Not automated:** multi-terminal load race suite.

**Level naming in reports:** successful full SQL run may report `L4_SCHEMA_SQL_CERTIFIED`. Production handover additionally requires **Ready for Re-Testing P0 PASS**.

---

## Related

* Re-test gate: [`docs/READY_FOR_RETESTING.md`](../READY_FOR_RETESTING.md)
* Playbook: [`docs/CLIENT_ONBOARDING_PLAYBOOK.md`](../CLIENT_ONBOARDING_PLAYBOOK.md)
* Fix tracker: [`docs/correction.md`](../correction.md)
