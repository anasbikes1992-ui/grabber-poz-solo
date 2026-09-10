# Code Review — Vertical Prod (Contabo Redeploy)

**Reviewed:** 2026-09-11  
**Scope:** restaurant/menu route, restaurant-service (settle/bill-split), salon complete-appointment/commission, marketing ROAS/spend, Dockerfile, auth patterns  

---

## CRITICAL

### 0. Hardcoded AUTH_SECRET fallback (session forge)
**Files:** `session.ts`, `session-edge.ts`, `customer-session.ts`  
**Status:** FIXED 2026-09-11 — production throws if unset; non-prod uses `dev-only-insecure-auth-secret-change-me` (removed repo hardcode `grabber-poz-production-secure-vault-key-2026`). **Rotate Coolify `AUTH_SECRET` if that old string was ever live.**

### 0b. Unauthenticated GET floor / appointments PII
**Files:** `api/restaurant/route.ts` GET, `api/appointments/route.ts` GET  
**Status:** FIXED 2026-09-11 — both require `actor()` / `assertCanMutateCommerce`.

### 1. Guest QR order accepts client-dictated price and unvalidated item names
**File:** `src/app/api/restaurant/menu/route.ts` — POST handler  
**Status:** FIXED 2026-09-11 — require `productId`, resolve name/price from active `products`, reject unknown ids.

### 2. QR token brute-forceable — no rate limiting on guest order endpoint
**File:** `src/app/api/restaurant/menu/route.ts` + `restaurant-service.ts` seed/create + `rate-limit.ts`  
**Status:** FIXED 2026-09-11 — UUID tokens; in-route + middleware `RATE_LIMIT_RULES` for `/api/restaurant/menu` (20/min). Re-seed floor on existing tenants.

---

## HIGH

### 3. `completeAppointmentAndCharge` — non-atomic: POS charge committed before appointment update
**File:** `src/lib/salon/complete-appointment.ts` (lines 49–78)

`processPosCheckout` (line 49) commits a revenue order. `depleteRecipeForProduct` runs in a separate transaction (line 58–60). The appointment `COMPLETED` update (line 66–78) happens after both, outside any transaction. A crash between the checkout and the DB update leaves money collected but the appointment stuck as non-COMPLETED, causing double-charge on retry.

**Fix:** Wrap the checkout + appointment status update in a single `db.transaction`, or use the existing `idempotencyKey` to detect and short-circuit retries.

### 4. `settle_kot` — partial settlement with no rollback on multi-part split
**File:** `src/lib/restaurant/restaurant-service.ts` — `handleRestaurantPatch` (lines 358–382)

The `for` loop calls `processPosCheckout` per bill-split part sequentially. If part 2 fails after part 1 commits, revenue is partially recorded and the KOT is not closed. The caller receives a 500 with no indication of which parts succeeded.

**Fix:** Collect all checkout calls, only close the KOT after all succeed, or pre-validate that every part has resolvable `productId`s before any checkout is committed.

### 5. `marketing/spend` GET — data exposed without auth in non-production environments
**File:** `src/app/api/marketing/spend/route.ts`  
**Status:** FIXED 2026-09-11 — GET always requires session.

### 6. `close_kot` / `update_table` — missing input validation
**File:** `src/lib/restaurant/restaurant-service.ts`  
**Status:** FIXED 2026-09-11 — explicit `tableId` / `ticketId` required guards.

---

## MEDIUM

### 7. `campaign-roas.ts` — N+1 queries on creative project title lookup
**File:** `src/lib/marketing/campaign-roas.ts` (lines 63–67)

Up to 50 individual `SELECT` statements execute inside a `for` loop to fetch creative project titles. At current scale this is slow; under load it is a connection-pool risk.

**Fix:** Batch with a single `inArray(creativeProjects.id, creativeIds.slice(0, 50))`.

### 8. Internal error messages leaked to API clients
**Files:** `src/app/api/restaurant/menu/route.ts` (lines 68, 134), `restaurant-service.ts`, and most route catch blocks

`(err as Error).message` is returned verbatim in 500 responses. DB errors, schema names, and query fragments can surface to end-users / QR-scan guests.

**Fix:** Return a generic "Internal server error" string to clients; log `err` server-side only.

### 9. Dockerfile — placeholder secrets baked into builder stage image history
**File:** `Dockerfile` (lines 28–30)

```dockerfile
ENV AUTH_SECRET="build_time_placeholder_secret_32chars_long_minimum"
ENV CRON_SECRET="build_time_placeholder_cron_secret"
```

These are compile-time placeholders (not injected at runtime), but they persist in intermediate image layer history. Anyone with access to the image registry can inspect them with `docker history`.

**Fix:** Use `--secret id=auth_secret,env=AUTH_SECRET` (Docker BuildKit secrets) so values never appear in image metadata, or pass empty strings and assert non-empty at app startup.

### 10. Hardcoded commission rates require code deploy to change
**File:** `src/lib/salon/commission.ts` (lines 4–9)

`STYLIST_COMMISSION_DEFAULTS` is a static in-code map. Any commission adjustment requires a code change and redeploy.

**Fix:** Move to a `business_config` setting or a small DB table, matching the pattern used for other business-configurable constants.

---

## LOW

### 11. KOT number collision under concurrent load
**Files:** `src/app/api/restaurant/menu/route.ts` (line 100), `restaurant-service.ts` (line 276)

`` `KOT-${Date.now().toString().slice(-6)}` `` — the last 6 ms digits collide for any two simultaneous orders within the same second window. Uniqueness is not enforced at the DB level either.

**Fix:** Use `nanoid(8)` or add a DB sequence. Add a `UNIQUE` constraint on `kotNumber`.

### 12. `getKdsState` fetches all dining tables without LIMIT
**File:** `src/lib/restaurant/restaurant-service.ts` (line 74)

`db.select().from(diningTables)` — no `.limit()`. On a multi-branch deployment this grows unbounded and is called on every KDS poll.

**Fix:** Add `.limit(200)` or scope by branch.

---

## Solid Parts

- **Auth architecture is clean.** `requireStaffSession` / `assertCanMutateCommerce` guards are consistently applied on all staff-facing mutating routes. The dev-mode bypass is correctly gated behind `NODE_ENV !== 'production'`.
- **Idempotency keys** on `processPosCheckout` (`appt-complete-*`, `kot-settle-*`) protect against double-charge on network retries.
- **Bill-split logic** (`partitionItemIndexes` + `checkoutLinesFromIndexes`) is cleanly separated and reusable.
- **Commission math** in `commission.ts` is safe: clamp 0–100, `Math.round` to 2 dp, no floating-point surprise.
- **Dockerfile runner stage** is correct: non-root `nextjs` user, standalone output copy, no dev dependencies in final image.
- **`/api/restaurant/menu` GET** is appropriately public and uses `.limit(200)` with an active-only filter.

---

## Must-Fix Before Contabo Redeploy

| # | Severity | Action |
|---|----------|--------|
| 1 | CRITICAL | Validate items against product catalog, resolve price server-side on guest order POST |
| 2 | CRITICAL | Replace short sequential QR tokens with 128-bit random UUID; add rate limiting |
| 3 | HIGH | Make `completeAppointmentAndCharge` atomic (single transaction or idempotent retry guard) |
| 5 | HIGH | Fix `marketing/spend` GET to use `requireStaffSession()` unconditionally |
| 6 | HIGH | Add null-checks for `ticketId`/`tableId` before DB mutations in `close_kot` / `update_table` |
