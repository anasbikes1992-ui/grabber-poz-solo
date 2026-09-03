# M5 PROMOTION INVARIANTS (PI-001 → PI-012)

**Milestone:** M5 Storefront Promotion & Conversion Engine  
**Status:** Canonical Invariant Specification  
**Architecture:** Promotion Engine is strictly subordinate to M3 Commerce Integrity  

---

## 1. Architectural Relationship

```text
PROMOTION ENGINE (Decision Layer)
         ↓
Eligibility & Stacking Checks
         ↓
Authoritative Server Discount
         ↓
M3 CANONICAL COMMERCE (Economic Authority)
  Gross − Authoritative Discount = Taxable Subtotal + Tax = Grand Total
         ↓
M4 PAYMENT GATEWAY (Adapter Framework)
         ↓
Payment Lifecycle & Audited Settlement (Stock / GL / Ledger)
```

---

## 2. The 12 Invariants

### PI-001: Server-Authoritative Promotion
The client browser may submit a suggested promotion code or request auto-promotions, but the browser **never** determines the discount amount, discount percentage, or product eligibility. The server derives the discount strictly from catalog item prices and active rules.

### PI-002: Promotion Validity
A promotion is valid if and only if:
* `status === 'ACTIVE'`
* Current timestamp $\ge \text{startsAt}$
* Current timestamp $\le \text{endsAt}$
* `usageCount < usageLimit` (if limit set)
Promotions with status `DRAFT`, `PAUSED`, `EXPIRED`, `EXHAUSTED`, or `ARCHIVED` are rejected.

### PI-003: Promotion Scope & Eligibility
When a promotion targets specific products, categories, brands, branches, or customer segments:
* The discount applies strictly to the subtotal of the **qualifying items**, not the entire cart.
* If a customer does not meet segment or first-order requirements, the promotion is rejected with a safe error code.

### PI-004: Promotion Amount Safety
* The computed discount cannot exceed the authoritative qualifying subtotal.
* If `maximumDiscountAmount` is set, the discount is capped at $\min(\text{calculatedDiscount}, \text{maximumDiscountAmount})$.

### PI-005: Tax Ordering
Promotion discounts reduce the taxable subtotal before tax calculation:
$$\text{Gross} - \text{Discount} = \text{Taxable Subtotal}$$
$$\text{Taxable Subtotal} \times \text{Rate} = \text{Tax}$$
$$\text{Taxable Subtotal} + \text{Tax} + \text{Delivery} = \text{Grand Total}$$

### PI-006: Promotion Stacking Policy
Stacking must follow explicit server configuration:
* `NONE`: Only one promotion allowed per order.
* `BEST_PROMOTION`: The server compares all qualifying promotions and applies the single promotion yielding the highest savings for the customer.
* `STACK_ALLOWED`: Additive stacking allowed only if explicitly permitted.

### PI-007: Usage & Customer Limits
* Total global redemptions cannot exceed `usageLimit`.
* Redemptions per customer/phone cannot exceed `perCustomerLimit`.
* `firstOrderOnly` promotions verify that the customer has zero prior completed orders.

### PI-008: Idempotent Redemption
Redemptions are recorded with a unique constraint on `(promotionId, orderId)`. Retrying checkout or replaying callbacks cannot redeem a promotion twice for the same economic transaction.

### PI-009: Checkout Parity
POS counter sales and storefront e-commerce share the same server promotion engine. If a cashier enters code `"WELCOME500"`, the discount calculation rules are identical to the storefront.

### PI-010: Payment Identity
The promotion discount is locked into the authoritative order total **before** M4 payment gateway initiation. Payment gateways receive the exact post-discount grand total.

### PI-011: Auditability
All promotion administrative events (`PROMOTION_CREATED`, `PROMOTION_UPDATED`, `PROMOTION_ARCHIVED`) and checkout events (`PROMOTION_REDEEMED`, `PROMOTION_REJECTED`) are recorded with timestamps, user context, and metadata.

### PI-012: No Negative Totals
A promotion can never reduce the order grand total below zero:
$$\text{Final Payable} = \max(0, \text{Gross} - \text{Discount}) + \text{Tax} + \text{Delivery}$$
