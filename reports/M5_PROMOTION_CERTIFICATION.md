# M5 STOREFRONT PROMOTION & CONVERSION ENGINE REPORT

**Release Milestone:** M5 — Storefront Promotion & Conversion Engine  
**Date:** 2026-09-03  
**Status:** 🟢 **ENGINEERING CERTIFIED (PI-001 → PI-012 GREEN)**  
**Commerce Foundation:** M3 Commerce Integrity (CERTIFIED & FROZEN)  
**Payment Gateway:** M4 Payment Gateway Adapter Framework (CERTIFIED & FROZEN)  

---

## 1. Architecture: Decision Layer vs Economic Authority

The Storefront Promotion & Conversion Engine operates strictly as a **decision layer**, leaving the certified M3 canonical commerce engine as the **sole economic authority**:

```text
PROMOTION ENGINE (Decision Layer)
         │
         ▼
Eligibility & Stacking Checks
         │
         ▼
Authoritative Server Discount
         │
         ▼
M3 CANONICAL COMMERCE (Economic Authority)
  Gross − Authoritative Discount = Taxable Subtotal + Tax = Grand Total
         │
         ▼
M4 PAYMENT GATEWAY (Adapter Framework)
  COD / PayHere / WebXPay / Koko / Mintpay / Payzy
         │
         ▼
Payment Lifecycle & Audited Settlement (Stock / GL / Ledger)
```

**Key Invariants Enforced:**
* The browser never determines discount amount or product eligibility.
* Promotion rules never directly mutate inventory balances, COGS, GL journals, or customer credit limits.
* Tax is recalculated strictly on post-discount taxable subtotal: $\text{Gross} - \text{Discount} = \text{Taxable} + \text{Tax} = \text{Grand Total}$.

---

## 2. Invariants Matrix (PI-001 → PI-012)

| Invariant | Description | Test Evidence | Status |
|:---|:---|:---|:---:|
| **PI-001** | Server-Authoritative Promotion | Client injected discounts (`discount: 999999`) neutralized | 🟢 PASS |
| **PI-002** | Promotion Validity | Inactive, expired, or future promotions rejected with safe errors | 🟢 PASS |
| **PI-003** | Promotion Scope & Eligibility | Category, brand, and product targeting scoped strictly to qualifying cart lines | 🟢 PASS |
| **PI-004** | Promotion Amount Safety | Discount bounded by qualifying subtotal and `maximumDiscountAmount` | 🟢 PASS |
| **PI-005** | Tax Ordering | Proves $\text{Gross} - \text{Discount} = \text{Taxable} + \text{Tax} = \text{Grand Total}$ | 🟢 PASS |
| **PI-006** | Promotion Stacking Policy | Explicit server evaluation (`BEST_PROMOTION`) chooses highest value discount | 🟢 PASS |
| **PI-007** | Usage & Customer Limits | `usageLimit` and `perCustomerLimit` enforced server-side | 🟢 PASS |
| **PI-008** | Idempotent Redemption | Unique `(promotionId, orderId)` constraint halts duplicate execution | 🟢 PASS |
| **PI-009** | Checkout Parity | POS and Storefront evaluate identical discount for identical cart items | 🟢 PASS |
| **PI-010** | Payment Identity | Authoritative discounted total locked before M4 payment gateway initiation | 🟢 PASS |
| **PI-011** | Auditability | Administrative and checkout events traceable | 🟢 PASS |
| **PI-012** | No Negative Totals | Order grand total bounded at $\ge 0$ under excessive discount values | 🟢 PASS |

---

## 3. Supported Promotion Types

1. **Percentage Discount:** e.g. 15% off cart or qualifying items.
2. **Fixed Amount:** e.g. LKR 2,000 off.
3. **Minimum Order Spend:** e.g. LKR 10,000+ required before discount activates.
4. **Maximum Discount Cap:** e.g. 20% off up to a maximum of LKR 5,000.
5. **Category-Specific:** e.g. 20% off Shoes category only; non-shoe items charged at standard price.
6. **Brand-Specific:** e.g. 15% off specific manufacturer brands.
7. **Product-Specific:** e.g. 10% off specific SKU/product IDs.
8. **First-Order Only:** e.g. 10% off for verified first-time customers (`firstOrderOnly: true`).
9. **Automatic Promotions:** Evaluated and applied server-side without entering a code.
10. **Promo Codes:** Normalizes case, whitespace, and validates validity window.

---

## 4. Storefront Conversion UX Implemented

1. **Promotion Popup ([`PromotionPopup.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/components/storefront/PromotionPopup.tsx)):**
   * Non-intrusive modal displaying active campaign title, message, discount terms, and CTA.
   * "Copy Code" button with copy feedback.
   * Frequency capping via `localStorage` (12-hour cooldown after dismiss).
   * Fully accessible: dismissible via Escape key, close button, or backdrop click.
2. **Top Announcement Bar ([`AnnouncementBar.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/components/storefront/AnnouncementBar.tsx)):**
   * Sleek gradient announcement bar rendered at the top of the storefront.
   * Highlights active promo code and direct "Shop Now" navigation.
3. **Countdown Timer ([`PromotionCountdown.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/components/storefront/PromotionCountdown.tsx)):**
   * Real-time ticking countdown (`HH:MM:SS`) synchronized with server `endsAt` timestamp.
4. **Product Promo Badges ([`ProductPromoBadge.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/components/storefront/ProductPromoBadge.tsx)):**
   * Visual badge indicators on promotional items.
5. **Checkout Promo Code Box:**
   * Interactive input field with uppercase normalization.
   * Real-time validation via `/api/promotions/validate` and savings summary.

---

## 5. Security & Concurrency Verification

* **Adversarial Input Neutralization:** Client-side discount payloads or price overrides are strictly ignored.
* **Concurrency Protection:** When a promotion has 1 remaining redemption, concurrent checkouts by Customer A and Customer B are resolved so only one consumes the final slot; the other receives `USAGE_LIMIT_EXHAUSTED`.
* **Idempotency Defense:** Duplicate order submissions for the same order ID return `isDuplicate: true` without incrementing `usageCount` twice.

---

## 6. Release Gate & Regression Evidence

* **TypeScript Compilation:** `npx tsc --noEmit` $\rightarrow$ **0 errors**
* **Vitest Test Suite:** **48 test files, 345/345 tests passing (100% green)**
  * `tests/promotion-engine.test.ts` (6 tests) $\rightarrow$ PASS
  * `tests/promotion-security.test.ts` (4 tests) $\rightarrow$ PASS
  * `tests/promotion-concurrency.test.ts` (3 tests) $\rightarrow$ PASS
  * `tests/promotion-checkout-parity.test.ts` (2 tests) $\rightarrow$ PASS
* **M3 Release Gate:** `npm run release:gate-m3` $\rightarrow$ **118/118 PASS (Zero regression)**
* **M5 Release Gate:** `npm run release:gate-m5` $\rightarrow$ **PASS**
* **API Auth Coverage:** `npm run auth:coverage` $\rightarrow$ **103/103 routes classified (PASS)**
* **Working Tree:** `Modified / Uncommitted — awaiting M5 milestone commit`
