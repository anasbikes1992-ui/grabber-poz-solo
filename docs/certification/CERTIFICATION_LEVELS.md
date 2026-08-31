# GRABBER BUSINESS OS — 4-TIER CERTIFICATION FRAMEWORK

Before any client instance is declared ready for production handover, it is graded against four certification tiers.

> **Implementation status (2026-08-31):** Automated `npm run client:certify` covers **schema + synthetic SQL** chains for L1 (partial), L3 (partial), and L4 (idempotency + cleanup).  
> L1 RLS/CDN, L2 HTTP POS latency/reservation, and L4 concurrent last-unit races are **not** automated yet — see [`docs/correction.md`](../correction.md).

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
  1. All **41** tables from `src/db/schema.ts` present.
  2. Chart of Accounts includes `1010`, `1200`, `4000`, `5000` (and seed set ≥5).
  3. At least one **active** user; **OWNER** role when users exist.
* **Not automated yet (manual / Wave 2):**
  4. RLS policies on commerce tables; revoke anon DML.
  5. Storage CDN bucket read/write smoke.
  6. First-login credential rotation flag.

---

### Level 2 (L2) — Commerce & Inventory Integrity

* **Scope:** POS checkout, barcode, stock movements, returns via **application APIs**.
* **Target checks (Wave 1 — not in cert script yet):**
  1. Cash & card checkout via `/api/pos/checkout` with durable Postgres writes.
  2. Stock decrements `on_hand` at branch location.
  3. Online/WA orders use `reserved` without premature branch sale deduction.
  4. Returns restore `on_hand` and write `order_returns`.

*Current cert script approximates L2/L3 with **raw SQL** inserts — useful for schema fitness, not app wiring.*

---

### Level 3 (L3) — Financial & Ledger Integrity

* **Scope:** Double-entry GL, Polim Potha AR, supplier AP.
* **Automated today (SQL chains):**
  1. Journal lines enforce Σ debit = Σ credit for cash sale and return.
  2. Cash sale posts to `1010` / `4000` / `5000` / `1200`.
  3. Polim `INVOICE` + `REPAYMENT` updates `polim_potha_accounts.current_balance`.
  4. Supplier `BILL` updates `supplier_accounts` with stock intake.
* **Still missing:** aging buckets, credit-limit enforcement via app, VAT period reports.

---

### Level 4 (L4) — Operational Resilience

* **Automated today:**
  1. `webhook_events` unique on `(provider, provider_event_id)`.
  2. Synthetic entities purged with residue check.
* **Not automated yet:**
  3. Checkout idempotency keys end-to-end via API.
  4. Provider webhook signature verification.
  5. Concurrent last-unit race (`UPDATE … WHERE available qty`).

**Level naming in reports:** successful full run may report `L4_SCHEMA_SQL_CERTIFIED` — intentionally **not** “production certified” until Wave 1–2 close.

---

## Related

* Playbook: [`docs/CLIENT_ONBOARDING_PLAYBOOK.md`](../CLIENT_ONBOARDING_PLAYBOOK.md)
* Fix tracker: [`docs/correction.md`](../correction.md)
