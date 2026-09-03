# SECURITY AUDIT — Grabber Business OS (Solo)

**Phase:** 1 — Security investigation (no application fixes in this phase)  
**Date:** 2026-09-03  
**Method:** Trace execution (middleware → handler → session → mutation), not string search alone.  
**Graph:** `getSession` 175 edges · `assertCanMutateCommerce` 95 edges.

**Milestone status:** DONE (audit).  
**P0 remediation (in progress):** HMAC middleware via `decodeSessionEdge`; `AUTH_OPTIONAL` ignored in production; `requireStaffSession` on previously open GETs/mutations; PayHere/WhatsApp/cron fail-closed without secrets; `validate-env` blocks `AUTH_OPTIONAL=true` and missing `CRON_SECRET` in production. See `tests/security-p0.test.ts`.

---

## Executive summary

Cryptographic sessions (`HMAC-SHA256` + expiry) and role asserts **exist and work** on the happy path in production **when handlers call them**.

The production hole is **not** “HMAC is fake.” It is:

1. Middleware trusts **cookie presence**, not signature (`decodeSessionEdge` is unused).
2. Several **data/action APIs never call `getSession`**, so a **non-empty forged `grabber_session` cookie** passes the edge gate and the handler returns business data or performs side effects.
3. `AUTH_OPTIONAL=true` disables the middleware cookie gate even when `NODE_ENV=production`. Handlers that only check `NODE_ENV === 'production'` still auth — handlers with **no session check** stay open.
4. `scripts/validate-env.mjs` does **not** fail on `AUTH_OPTIONAL`.
5. Seed is **middleware-public**; production handler still requires OWNER/ADMIN.
6. Cron and PayHere/WhatsApp signatures **no-op when secrets are unset**.

Dev/preview (`NODE_ENV !== 'production'`) injects a **hardcoded OWNER** (`00000000-0000-0000-0000-000000000001`) on ~50 mutating routes. That is acceptable for local DX only if **preview/staging always run `NODE_ENV=production`**.

---

## Auth chain (actual)

```text
Request
  → middleware
       PUBLIC_PREFIXES / isPublic()  → next() (no cookie)
       else if AUTH_OPTIONAL or NODE_ENV≠production → next()
       else if /api/* and cookie grabber_session missing → 401
       else if cookie present → next()   ← NO HMAC
  → route handler
       getSession() → decodeSession() HMAC + exp     ← REAL AUTH
       OR fake OWNER if NODE_ENV≠production
       OR no session call at all                     ← P0
  → assertCanMutateCommerce / assertRole
  → DB (service role / Drizzle; RLS is DB-side, not a substitute for API auth)
```

Session cookie: `grabber_session`, httpOnly, `sameSite=lax`, `secure` only in production, **12h** (`MAX_AGE_SEC`).  
Shopper cookie: `grabber_customer_session`.

`decodeSession` uses `timingSafeEqual` on HMAC. `exp` is enforced. Production throws if `AUTH_SECRET` missing. Non-production falls back to `'dev-only-insecure-auth-secret-change-me'`.

Plaintext PIN compare is allowed **only** when stored hash is not `scrypt$` and `NODE_ENV !== 'production'`. `TEMP$` prefix compares PIN in all environments (onboarding rotation).

Login: `POST /api/auth/login` — public. Non-production accepts PIN `1234` as a shortcut.

---

## Findings

### P0 — Critical

| ID | Finding | Trace | Impact |
|----|---------|-------|--------|
| P0-1 | **Unauthenticated handlers behind cookie-presence only** | Middleware lets any non-empty `grabber_session` through. Handlers with **no** `getSession` never verify HMAC. | Attacker sets `grabber_session=x` and reads/writes those APIs in production. |
| P0-2 | **Sensitive GETs with no session** | `GET /api/inventory` returns stock + locations + movements. `GET /api/polim-potha` returns AR accounts/phones/balances. `GET /api/reports/tax` returns up to 5000 orders. `GET /api/products` returns catalog **including cost**. `GET /api/serials/lifecycle`, `GET /api/setup/progress`. | Cost, credit ledger, tax, inventory leakage. |
| P0-3 | **Unauthenticated mutations / side effects** | `POST /api/integrations/whatsapp/send` — no session; sends WhatsApp if tokens configured. `POST /api/integrations/koombiyo/create` — creates shipment if API key set. `POST /api/promotions/evaluate-cart` / `validate` — no session (discount probing). | Message spam, courier fraud, promo abuse. |
| P0-4 | **`AUTH_OPTIONAL=true` in production** | `middleware.ts` line ~140: `optional = NODE_ENV !== 'production' \|\| AUTH_OPTIONAL === 'true'`. Env validator does **not** check this flag. | Staff UI + APIs skip cookie gate. Handlers without `getSession` are fully public. |
| P0-5 | **PayHere signature skipped if secret empty** | `if (secret && !verifyPayHereSignature)` — missing secret ⇒ treat as valid. | Forged payment webhooks can mark orders paid. |
| P0-6 | **WhatsApp webhook signature skipped if app secret empty** | `verifyWhatsAppWebhookSignature`: `if (!appSecret) return true`. | Forged inbound messages drive automation. |
| P0-7 | **Cron open if `CRON_SECRET` unset** | `process-jobs`: `if (secret && auth !== Bearer) 401`. No secret ⇒ any GET/POST runs job worker. Listed as public `/api/cron/`. | Job execution / outbox drain by anyone. |

### P1 — High

| ID | Finding | Notes |
|----|---------|-------|
| P1-1 | Seed is **middleware-public** (`/api/seed`) | Production handler requires OWNER/ADMIN + `assertCanMutateCommerce`. Staging with `NODE_ENV≠production` can seed without auth. Default PIN `1234` in seed body. |
| P1-2 | Storefront checkout is **middleware-public** (`/api/pos/checkout`) | Handler: STOREFRONT requires shopper unless `AUTH_OPTIONAL`; POS requires `assertCanMutateCommerce`. Guest checkout possible if AUTH_OPTIONAL. Channel default `POS`. |
| P1-3 | ~50 routes inject **hardcoded OWNER** when `NODE_ENV !== 'production'` | Preview deployments that forget `NODE_ENV=production` become owner. UUID `00000000-0000-0000-0000-000000000001` (`isDemoUserId`). |
| P1-4 | ~22 routes 401 **only in production**; `session` may be null in dev and still run | Weaker than fake-OWNER pattern; still different from prod. |
| P1-5 | Login / checkout / seed **not** in `RATE_LIMIT_RULES` | Only `/api/jarvis/`, `/api/repairs/public`, `/api/agents/`. In-memory buckets reset per serverless instance. |
| P1-6 | Middleware does not use `decodeSessionEdge` | Forged cookie still hits P0 handlers; signed-but-expired cookies still hit those handlers. |
| P1-7 | `GET /api/config/flags` has **no session**; PUT is prod OWNER/ADMIN only | Flag reads may leak vertical config. |
| P1-8 | Storage upload asserts mutate **only in production** | `assertCanMutateCommerce` skipped in non-prod. |
| P1-9 | No automated test: `AUTH_OPTIONAL=true` + privileged API = **must fail** in production certify | Gap vs definition of done. |
| P1-10 | No automated test: garbage cookie + `GET /api/inventory` = **401** | Would fail today. |

### P2 — Medium

| ID | Finding |
|----|---------|
| P2-1 | Public path lists duplicated in middleware, AppShell, layout theme script. |
| P2-2 | `/api/creative/commands` unauthenticated (prompt catalog leak — low secrecy, still staff IP). |
| P2-3 | Invoice GET is public via regex (`/api/orders/:n/invoice`) — intended if token/phone gated; verify that gate in Phase 2. |
| P2-4 | Session `secure` flag off outside production (MITM on HTTP staging). |
| P2-5 | `MUTATING_ROLES` includes CASHIER through ACCOUNTANT — broad; no per-route least privilege on many commerce APIs. |
| P2-6 | Rate limiter is per-instance memory — ineffective as a fleet control. |
| P2-7 | `POST /api/auth/login` PIN `1234` shortcut in non-production. |

### P3 — Low

| ID | Finding |
|----|---------|
| P3-1 | Graphify did not extract `AUTH_OPTIONAL` as a node (env string). |
| P3-2 | Demo user ID skipped as `actorId` on checkout (`isDemoUserId`) — audit attribution gap in dev. |
| P3-3 | Marketing pixels / public storefront APIs correctly unauthenticated. |

---

## Mutation matrix (revenue / ops critical)

Legend: **Auth** = handler calls `getSession`/`getCustomerSession` and asserts in production. **MW** = middleware public?

| API | Methods | MW public? | Handler auth (prod) | Input validation | Auth before mutation | Notes |
|-----|---------|------------|---------------------|------------------|----------------------|-------|
| `/api/pos/checkout` | POST | **yes** | POS: `assertCanMutateCommerce`; storefront: shopper unless AUTH_OPTIONAL | Body parsed; service-level | Yes when asserts run | Dual channel |
| `/api/products` GET | GET | no | **None** | n/a | n/a | **P0-2 costs** |
| `/api/products` POST/PATCH/DELETE | mut | no | Fake OWNER in non-prod else assert | Partial (sku/name) | Yes in prod | |
| `/api/inventory` GET | GET | no | **None** | n/a | n/a | **P0-2** |
| `/api/purchasing/grn` | POST | no | assert via session/OWNER inject | Service | Yes in prod | |
| `/api/returns` | POST | no | same | Service | Yes in prod | |
| `/api/orders` PATCH | PATCH | no | same | Partial | Yes in prod | |
| `/api/seed` | POST | **yes** | OWNER/ADMIN in prod only | Preset/body | Yes in prod | **P1-1** |
| `/api/webhooks/payhere` | POST | yes | Signature if secret set | Form/JSON | Signature | **P0-5** |
| `/api/webhooks/whatsapp` | GET/POST | yes | Verify token / HMAC if secret | JSON | Signature | **P0-6** |
| `/api/integrations/whatsapp/send` | POST | no | **None** | to/text | **No** | **P0-3** |
| `/api/cron/process-jobs` | GET/POST | **yes** | Bearer if secret set | n/a | Optional | **P0-7** |
| `/api/settings/secrets` | GET/POST | no | Session; extra prod checks | Partial | Mostly | Secrets surface |
| `/api/backup/export` | GET | no | Prod 401 if no session | n/a | Read | |
| `/api/polim-potha` GET | GET | no | **None** | n/a | n/a | **P0-2 AR** |
| `/api/polim-potha/repay` | POST | no | **Always** getSession (rare) | Service | Yes | Good pattern |
| `/api/auth/login` | POST | yes | PIN verify | PIN | n/a | No login rate limit **P1-5** |

Transactions / audit: checkout repo is durable; not every mutation writes `audit_logs`. Approvals path is stronger. Treat missing audit as Phase 2 invariant, not this P0 list.

RLS: `drizzle/rls_baseline.sql` + `npm run db:test-rls`. API uses server DB credentials; **RLS does not replace missing `getSession`**.

---

## Environment / deploy

| Control | Status |
|---------|--------|
| `AUTH_SECRET` required in production (`session.ts` + `env:validate --production`) | Yes |
| `AUTH_OPTIONAL` blocked in production certify | **No** |
| Preview `NODE_ENV=production` | Operator-dependent |
| `CRON_SECRET` required | **No** |
| PayHere / WhatsApp app secrets required when integration on | Partial (validator warns WhatsApp, does not fail PayHere-empty webhook) |

---

## Tests that do **not** exist yet (needed for P0 close)

1. Production-mode: `AUTH_OPTIONAL=true` → privileged API → **certify FAIL**.
2. Garbage `grabber_session` → `GET /api/inventory` / `GET /api/products` / `GET /api/polim-potha` → **401**.
3. Valid cashier session → OWNER-only seed → **403**.
4. PayHere webhook with empty secret in production → **reject**.
5. Cron without `CRON_SECRET` in production → **401**.
6. WhatsApp send without session → **401**.

Existing: `tests/rate-limit.test.ts` (unit of limiter, not login). Commerce golden tests do not cover HTTP auth.

---

## Recommended fix order (do not implement until approved)

Bounded PR — **god-node rules apply** (`getSession`, middleware):

1. Require `getSession()` (or shopper session) on every non-public handler in P0-2/P0-3; fail closed.
2. Middleware: HMAC via `decodeSessionEdge` for staff APIs (or keep presence check **plus** handler — both).
3. Fail closed: PayHere / WhatsApp / Cron secrets in production.
4. `env:validate --production`: `AUTH_OPTIONAL` must be unset/false; `CRON_SECRET` required if cron enabled.
5. Add the six tests above; run `release-gate` R1.

**Out of scope for that PR:** UI Modal/Field, RSC, React Query, installation IDs, import center.

---

## Risk summary (what remains dangerous)

Until the PR above ships, a production install is **CONDITIONALLY READY** only if operators guarantee: `NODE_ENV=production`, `AUTH_OPTIONAL` unset, `AUTH_SECRET` ≥32 chars, `CRON_SECRET` set, PayHere/WhatsApp secrets set when those channels are live, **and** staff cookies are not forgeable against the unauthenticated GET/POST list. That last clause is **not true today** (P0-1).

**Do not sell “production certified” on auth until P0-1–P0-7 are closed.**
