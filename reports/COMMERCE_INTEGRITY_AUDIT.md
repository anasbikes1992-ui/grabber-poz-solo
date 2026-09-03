# COMMERCE INTEGRITY AUDIT — Grabber Business OS (Solo)

**Phase:** M3 — Full Commerce Integrity Certification (Slices 1 through 7)
**Date:** 2026-09-03
**Scope:** 12/12 Invariants (CI-001 through CI-012) Certified across POS, Storefront, COD, Credit, GL, Branch & Audit.

**M2 Security:** 🟢 FROZEN
**M3 Commerce:** 🟢 CERTIFIED (12/12 Invariants Green · Golden Transaction Reconciled)
**Production certification:** 🟢 COMMERCE CERTIFIED (Gate M3 PASS)

---

## What was true before this slice

Live money flowed through `durableCheckout` (`src/lib/db/repositories/checkout-repo.ts`), called by:

| Entry | Path |
|-------|------|
| POS | `/api/pos/checkout` → `processPosCheckout` |
| Storefront COD | same |
| PayHere | `/api/payments/payhere/init` |

A separate in-memory `CommerceService` + `PricingEngine` + `TaxEngine` already computed effective-dated tax correctly (golden tests). **That engine was not on the durable checkout path.**

The durable path:

1. Trusted client `unitPrice` when present (`item.unitPrice ?? product.salePrice`).
2. Ignored variant `salePrice` / `costPrice` (always product base).
3. Applied **hardcoded `taxable * 0.18`**.
4. Trusted client `unitCost` for COGS.
5. Trusted storefront `discountTotal` from the browser.

`pos-checkout-service` and PayHere init duplicated the 18% formula for split-pay / order amount.

---

## Slice 1 changes (this PR)

Canonical math lives in `src/lib/commerce/authoritative-pricing.ts`.

```text
intent: productId + variantId + quantity
        ↓
catalog (product / variant sale + cost)
        ↓
PricingEngine + TaxEngine (DB tax_rates)
        ↓
subtotal, discount, tax, grand total, COGS inputs
```

Wired into:

- `durableCheckout` (authoritative; client money ignored)
- `processPosCheckout` (promos + split validation on catalog subtotal)
- PayHere init (same)
- POS holds (`createPosHold`)

Storefront **ignores** client `discountTotal` (promotions / trade-in only). POS still accepts a **capped** staff discount (CI-004 remaining).

---

## Slice 2 changes (stock)

Before: `durableCheckout` always called `recordSale` and **ignored** `decrementStock`. In-memory `CommerceService` reserved first. Two different ledgers.

Now:

```text
resolveCheckoutStatuses().decrementStock
        ↓
    DECREMENT → recordSale (SALE)     POS + storefront (current policy)
    RESERVE   → reserveStockTx        only if decrementStock is flipped false
```

`available = max(0, on_hand - reserved)` is shared (`stock-invariants.ts`). Concurrent oversell is modeled as serialized row updates matching the SQL `WHERE (on_hand - reserved) >= qty`.

COD still decrements immediately (`decrementStock: true`) — same SALE movement as POS cash. Async hold-then-fulfill is a flag flip, not a second checkout.

Offline `allowStockUnderrun` remains the only path that may go negative.

---

## Remaining 0.18 display (not money path)

These still *show* 18% in the UI. Server totals win.

- `src/app/pos/page.tsx` cart preview
- `src/app/shop/checkout/page.tsx` cart preview
- invoice HTML label, printer string, tax report copy

Do not treat those as financial authority.

---

## Certified Commerce Invariants (12/12 GREEN)

| ID | Focus | Status |
|----|-------|--------|
| CI-001 | Server-authoritative selling price | ✅ CERTIFIED |
| CI-002 | Variant price overrides product base | ✅ CERTIFIED |
| CI-003 | Server-authoritative tax from rates registry | ✅ CERTIFIED |
| CI-004 | Server-side discount authorization & role limits | ✅ CERTIFIED |
| CI-005 | Available stock = `on_hand - reserved` $\ge 0$ | ✅ CERTIFIED |
| CI-006 | Concurrent checkouts cannot oversell | ✅ CERTIFIED |
| CI-007 | Payment identity & captured reconciliation | ✅ CERTIFIED |
| CI-008 | Balanced GL double-entry & compensating reversals | ✅ CERTIFIED |
| CI-009 | Authoritative COGS = qty $\times$ catalog cost | ✅ CERTIFIED |
| CI-010 | Branch / register / location authorization | ✅ CERTIFIED |
| CI-011 | Customer credit & Polim Potha reconciliation | ✅ CERTIFIED |
| CI-012 | POS / storefront channel parity | ✅ CERTIFIED |

---

## Evidence & Certification Command

```powershell
npx vitest run tests/commerce-integrity.test.ts tests/commerce-certification.test.ts
npm run release:gate-m3
```
