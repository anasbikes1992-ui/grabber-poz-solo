# GRABBER Business OS — Ready for Re-Testing

**Gate status:** `READY_FOR_RETESTING` (**OPEN** — automated kickoff 2026-09-01)  
**Opened:** 2026-09-01  
**Commit baseline:** `6cdecb0` (+ docs follow-up)  
**Prerequisite:** Waves 0–5 + dual storefront/staff auth closed in [`docs/correction.md`](./correction.md)

**Kickoff log:** [`reports/RETEST_RUN_2026-09-01.md`](../reports/RETEST_RUN_2026-09-01.md) — RT-A01/A02 PASS; RT-A03–A05 blocked pending `DATABASE_URL`.

This document is the **process entry** for re-testing after the correction waves. Do not treat a green unit-test run alone as production handover — complete the checklist below, then optionally the 7-day pilot in [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).

---

## 1. What “Ready for Re-Testing” means

| Claim | Truth |
|-------|--------|
| Correction waves 0–5 closed in tracker | Yes |
| Durable Postgres commerce APIs wired | Yes |
| Dual surface: public store + staff OS | Yes |
| Automated unit / golden / vertical tests | Must pass before re-test sign-off |
| Schema + synthetic SQL cert | Must pass (or dry-run documented) |
| Live HTTP cert against running app | Optional but recommended |
| RLS applied on Supabase host | Manual — not auto |
| Full role-matrix RBAC / CDN proofs | Still out of automated cert |

**Exit criteria for this gate:** all **P0** items in §3 PASS; P1 either PASS or explicitly WAIVED with owner sign-off.

---

## 2. Surfaces under test

| Surface | URL | Auth |
|---------|-----|------|
| Public storefront | `/` | None to browse; shopper cookie to checkout |
| Shopper account | `/shop/login`, `/shop/account` | `grabber_customer_session` |
| Staff login | `/login?next=/app` | PIN → `grabber_session` |
| Staff hub | `/app` | Staff session |
| Counter POS | `/pos` | Staff session |
| Verticals | `/repairs`, `/restaurant`, `/hire-purchase`, `/appointments`, `/loyalty` | Staff + feature flags |

**Demo credentials (dev/seed only — rotate before production):**

* Staff OWNER PIN: `1234`
* Shopper: phone `+94771234567`, password `1234`

---

## 3. Re-test checklist

### P0 — Automated (run first)

```bash
npm run typecheck
npm test
npm run env:validate -- --env-file .env.local
# With DATABASE_URL:
npm run db:push
npm run client:certify -- --dry-run --client "Re-Test" --slug "retest"
npm run client:certify -- --client "Re-Test" --slug "retest"
# Optional live HTTP (app must be running):
# CERTIFY_HTTP_BASE_URL=http://localhost:3000 npm run client:certify -- --client "Re-Test" --slug "retest"
```

| ID | Check | Pass criteria | Result |
|----|--------|---------------|--------|
| RT-A01 | `npm run typecheck` | Exit 0 | ✅ PASS (2026-09-01) |
| RT-A02 | `npm test` | All tests pass (≥25) | ✅ PASS 25/25 |
| RT-A03 | `env:validate` | 0 P0 errors | ⛔ BLOCKED — no env file |
| RT-A04 | `db:push` | 49 tables applied | ⏳ pending env |
| RT-A05 | `client:certify` (SQL) | 0 P0 failures; report under `reports/` | ⏳ pending env |

### P0 — Manual smoke (dual auth + core commerce)

| ID | Check | Pass criteria | Result |
|----|--------|---------------|--------|
| RT-M01 | `/` shows live catalog (or clear empty-state after seed) | Not staff dashboard | ☐ |
| RT-M02 | Shopper register/login → bag → checkout `STOREFRONT` | Order number returned; stock drops | ☐ |
| RT-M03 | Staff `/login` → lands `/app` | Hub, not storefront | ☐ |
| RT-M04 | Open shift → POS cash sale | Order + receipt path; stock/GL | ☐ |
| RT-M05 | GRN against seeded APPROVED PO | Stock up; supplier AP | ☐ |
| RT-M06 | Return against POS order | Stock restore; journal reverse | ☐ |
| RT-M07 | Polim repay for Sarath | Balance decreases | ☐ |
| RT-M08 | Vertical flag toggle | Sidebar shows/hides modules | ☐ |

### P1 — Recommended before client pilot

| ID | Check | Result |
|----|--------|--------|
| RT-P01 | Apply `drizzle/rls_baseline.sql` on Supabase | ☐ / WAIVE |
| RT-P02 | `CERTIFY_HTTP_BASE_URL` cert against preview/prod URL | ☐ / WAIVE |
| RT-P03 | Offline queue: kill network mid-POS, flush on reconnect | ☐ / WAIVE |
| RT-P04 | PayHere webhook signature + duplicate event | ☐ / WAIVE |
| RT-P05 | Backup export download contains orders/products | ☐ / WAIVE |

---

## 4. Suggested re-test day plan

| Block | Focus |
|-------|--------|
| **Morning** | RT-A01…A05 automated + seed |
| **Midday** | RT-M01…M04 storefront + staff POS |
| **Afternoon** | RT-M05…M08 purchasing, returns, Polim, verticals |
| **End of day** | Fill §5 sign-off; open 7-day pilot if P0 all PASS |

Full multi-day store protocol: [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).

---

## 5. Sign-off

| Role | Name | Date | Signature / note |
|------|------|------|------------------|
| Engineering | | | |
| Ops / onboarding | | | |
| Client (optional for internal re-test) | | | |

**Gate outcome:** ☐ PASS — proceed to pilot / handover ☐ FAIL — reopen items in `correction.md` ☐ CONDITIONAL — P1 waived listed: _______________

---

## 6. Related process docs

* [`CLIENT_ONBOARDING_PLAYBOOK.md`](./CLIENT_ONBOARDING_PLAYBOOK.md) — provision → certify → handover  
* [`certification/CERTIFICATION_LEVELS.md`](./certification/CERTIFICATION_LEVELS.md) — L1–L4 honesty  
* [`certification/BUSINESS_INVARIANTS.md`](./certification/BUSINESS_INVARIANTS.md)  
* [`certification/FAILURE_SCENARIOS.md`](./certification/FAILURE_SCENARIOS.md)  
* [`BUSINESS_OS_TEST_PLAN.md`](./BUSINESS_OS_TEST_PLAN.md) — unit / golden hierarchy  
* [`correction.md`](./correction.md) — master fix tracker  
