# GRABBER Business OS — Correction Tracker

Master fix list from full code review (security, database, quality, a11y, completeness).  
**Status legend:** `DONE` · `IN_PROGRESS` · `TODO` · `DEFERRED`

Last updated: 2026-09-01 (**READY_FOR_RETESTING** opened)

---

## Gate status

| Gate | Status | Doc |
|------|--------|-----|
| Waves 0–5 + dual auth | DONE | this file |
| Process docs refreshed | DONE | playbook, cert levels, acceptance, test plan |
| **Ready for Re-Testing** | **OPEN** | [`docs/READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) |

---

## Verdict

Durable Postgres commerce is wired end-to-end for core retail ops **and W5-06 verticals** (repairs, restaurant/KOT, hire-purchase, appointments, loyalty) behind feature flags. **`/` = public storefront**; **`/app` + staff PIN login** = backend; **`/shop/login`** = shopper accounts. Host RLS apply + live `db:push` E2E remain operator steps. **Re-test before handover** using the Ready for Re-Testing checklist.

| ID | Item | Status |
|----|------|--------|
| DUAL-01 | Landing `/` = live catalog storefront (not staff hub) | DONE |
| DUAL-02 | Shopper cookie `grabber_customer_session` + `/api/auth/shopper` | DONE |
| DUAL-03 | Staff hub moved to `/app`; `/login` defaults `next=/app` | DONE |
| DUAL-04 | Seed shopper password on demo customer (PIN/password `1234`) | DONE |

---

## Wave 0 — Honesty & gate integrity

| ID | Severity | Item | Status |
|----|----------|------|--------|
| W0-01 | CRITICAL | Align `scripts/certify-client.mjs` to `src/db/schema.ts` | DONE |
| W0-02 | CRITICAL | Stop claiming RBAC/CDN/API cert when not implemented | DONE |
| W0-03 | HIGH | Fail User Accounts check when `count === 0`; require OWNER | DONE |
| W0-04 | HIGH | Dynamic `commitSha` / sanitize `--slug` | DONE |
| W0-05 | HIGH | `validate-env.mjs`: AUTH_SECRET = P0 in production | DONE |
| W0-06 | MEDIUM | Harden `copy-skills.mjs` | DONE |
| W0-07 | MEDIUM | `.gitignore` reports + env client files | DONE |
| W0-08 | CRITICAL | Revoke `GRANT ALL … TO anon` in `supabase_setup.sql` | DONE |
| W0-09 | HIGH | Document schema drift — SSOT = Drizzle | DONE |
| W0-10 | HIGH | A11y foundation | DONE |

---

## Wave 1 — Durable core (P0 product)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| W1-01 | CRITICAL | Repository layer: checkout + repay + GRN + transfer → Drizzle txns | DONE |
| W1-02 | CRITICAL | Wire POS / products / inventory / purchasing / polim / returns / shifts / customers / suppliers → APIs | DONE |
| W1-03 | CRITICAL | Concurrent stock: `UPDATE … WHERE on_hand - reserved >= qty` | DONE |
| W1-04 | CRITICAL | Idempotent checkout (`idempotency_key` / `client_uuid`) | DONE |
| W1-05 | CRITICAL | Real `/api/seed` writing Postgres (+ demo APPROVED PO for GRN) | DONE |
| W1-06 | CRITICAL | Real `/api/storage/upload` (fail loud — no fabricated CDN) | DONE |
| W1-07 | HIGH | Persist shifts + bind sales to `shift_id` | DONE |
| W1-08 | HIGH | Return flow → `order_returns` + stock + inverse GL | DONE |
| W1-09 | HIGH | GRN path → PO + supplier entries + WAVG cost | DONE |
| W1-10 | HIGH | Deprecate `supabase_setup.sql` as SSOT — prefer `db:push` | DONE |
| W1-11 | HIGH | FK indexes on order_items / payments / orders / journal_lines / supplier_entries | DONE |

---

## Wave 2 — Auth, RLS, security (P0)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| W2-01 | CRITICAL | Hashed PIN, signed session cookies | DONE |
| W2-02 | CRITICAL | `middleware.ts` route protection (prod cookie gate) | DONE |
| W2-03 | CRITICAL | Role checks on mutating commerce APIs | DONE |
| W2-04 | CRITICAL | First-login forced credential rotation (`TEMP$` / PATCH login) | DONE |
| W2-05 | CRITICAL | RLS baseline SQL (`drizzle/rls_baseline.sql`) — **apply manually on host** | DONE |
| W2-06 | HIGH | `audit_logs` on checkout path | DONE |
| W2-07 | HIGH | PayHere webhook signature + `webhook_events` dedupe | DONE |
| W2-08 | MEDIUM | Settings secrets via `encryption.ts` + `/api/settings/secrets` | DONE |

---

## Wave 3 — Counter hardware & ops (P0/P1)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| W3-01 | HIGH | ESC/POS receipt + Z-report buffer on POS / Z-close | DONE |
| W3-02 | MEDIUM | Barcode scanner listener on POS | DONE |
| W3-03 | HIGH | Durable backup/export from Postgres | DONE |
| W3-04 | HIGH | Honest `provision-client.mjs` (env + runbook artifacts) | DONE |
| W3-05 | MEDIUM | Optional HTTP cert via `CERTIFY_HTTP_BASE_URL` + `/api/health` | DONE |
| W3-06 | MEDIUM | Offline queue IndexedDB + flush on POS | DONE |

---

## Wave 4 — Accessibility (WCAG 2.2 AA)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| A11Y-01 | P0 | Shared `<Modal>` focus trap / Escape / aria-modal | DONE |
| A11Y-02 | P0 | Destructive contrast + focus-visible + reduced motion | DONE |
| A11Y-03 | P0 | Skip link + main landmark + titles | DONE |
| A11Y-04 | P0 | POS labels / live region / named qty | DONE |
| A11Y-05 | P0 | Mobile nav escape hatch | DONE |
| A11Y-06 | P1 | Primary nav + aria-current | DONE |
| A11Y-07 | P1 | Migrate key modals to `<Modal>` | DONE |
| A11Y-08 | P1 | htmlFor/id on login, shifts, products, settings | DONE |
| A11Y-09 | P1 | Tender / role toggles → radio semantics | DONE |
| A11Y-10 | P2 | a11y smoke tests (`tests/a11y-smoke.test.ts`) | DONE |

---

## Wave 5 — Integrations & verticals (P1/P2)

| ID | Item | Status |
|----|------|--------|
| W5-01 | WhatsApp send API (live if env set; honest stub in dev) | DONE |
| W5-02 | Koombiyo create API (same honesty pattern) | DONE |
| W5-03 | Reports: sales by channel, stock valuation, AR aging | DONE |
| W5-04 | Trial balance + VAT worksheet + period-close check | DONE |
| W5-05 | Feature flags via `business_config` (`/api/config/flags`) | DONE |
| W5-06 | Repairs / restaurant / HP / appointments / loyalty (schema + APIs + flag-gated UI) | DONE |

---

## Wave D — Design system (MyPoz parity)

| ID | Item | Status |
|----|------|--------|
| WD-01 | Persist MASTER.md tokens | DONE |
| WD-02 | POS page override | DONE |
| WD-03 | Plus Jakarta + zinc-950 / emerald / glass / mesh | DONE |
| WD-04 | BrandLogo + header hairline | DONE |
| WD-05 | Shell + POS restyle | DONE |
| WD-06 | Roll design to dashboard / shifts / products / inventory / polim / purchasing / returns / settings / customers | DONE |

---

## Schema SSOT rules

1. **Canonical schema:** `src/db/schema.ts` (49 tables).
2. **Do not invent tables** in cert scripts beyond schema.ts.
3. **COA codes:** `1010`, `1020`, `1090`, `1100`, `1200`, `2000`, `2100`, `4000`, `5000`.
4. **Polim types:** `INVOICE` \| `REPAYMENT` \| `ADJUSTMENT` \| `WRITE_OFF`.
5. **Order status:** no `COMPLETED` — use `DELIVERED` / `CONFIRMED` for POS cash.
6. **Balances:** `polim_potha_accounts.current_balance`.
7. **Verticals:** gated by `business_config.config_json.verticalFlags` + `/api/config/flags`.

---

## Cert pillars — honesty matrix

| Pillar | Status |
|--------|--------|
| Schema & COA | YES |
| Owner user present | YES |
| POS cash + stock + GL (SQL synthetic) | YES |
| Polim invoice/repay (SQL) | YES |
| Return + GL reverse (SQL) | YES |
| Purchasing stock intake | YES (SQL + app GRN API) |
| Webhook idempotency | YES |
| HTTP API path | OPTIONAL — `CERTIFY_HTTP_BASE_URL` |
| Security & RBAC / RLS automated probes | NO — baseline SQL exists, not auto-applied |
| Storage & CDN | NO — upload is local/Supabase without fake CDN claim |

---

## Operator quick path (durable E2E)

1. Set `DATABASE_URL`, `AUTH_SECRET` (and `MASTER_ENCRYPTION_KEY` in prod).
2. `npm run db:push` (49 tables incl. verticals)
3. `POST /api/seed` (OWNER PIN `1234`, COA, products, PO, credit shopper Sarath phone `+94771234567` / password `1234`, vertical flags).
4. Shoppers: `/` storefront → `/shop/login`. Staff: `/login` → `/app` / `/pos`.
5. Staff: open shift `POST /api/shifts` → POS checkout.
6. Verticals: `/repairs`, `/restaurant`, `/hire-purchase`, `/appointments`, `/loyalty` (toggle via `PUT /api/config/flags`).
7. Optional: apply `drizzle/rls_baseline.sql` on Supabase.
8. Optional cert HTTP: run app, then `CERTIFY_HTTP_BASE_URL=http://localhost:3000 npm run client:certify`.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-31 | Created tracker; Wave 0 honesty + a11y foundation |
| 2026-08-31 | Design system MyPoz parity (WD-01…05) |
| 2026-08-31 | Waves 1–5 durable APIs, auth, offline queue, integrations stubs, design rollout; tracker statuses updated |
| 2026-08-31 | Closed remaining mock UIs: products/customers/suppliers/PO CRUD APIs; inventory + polim list; honest creative stub; seed credit customer |
| 2026-08-31 | Dual surface: `/` storefront + shopper auth; staff hub `/app`; checkout accepts STOREFRONT |
| 2026-09-01 | Process docs completed; gate **READY_FOR_RETESTING** opened |
