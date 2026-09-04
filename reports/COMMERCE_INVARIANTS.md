# COMMERCE INVARIANTS

Machine-testable rules for Grabber checkout. Implementation: `src/lib/commerce/authoritative-pricing.ts`, `src/lib/inventory/stock-invariants.ts`. Tests: `tests/commerce-integrity.test.ts`.

Status: ✅ **M3 CERTIFIED (CI-001–CI-012)** · residual hardening debt listed below · next productization milestone **M7**

| ID | Rule | Status |
|----|------|--------|
| CI-001 | Selling price comes from catalog, never client `unitPrice` | ✅ |
| CI-002 | Variant sell/cost overrides product base when set | ✅ |
| CI-003 | Tax comes from `tax_rates` via `TaxEngine`, never hardcoded 18% | ✅ |
| CI-004 | Discount cannot exceed authorized promotion / staff rule | ✅ |
| CI-005 | `available = on_hand - reserved`; never negative available | ✅ |
| CI-006 | Concurrent checkouts cannot oversell | ✅ |
| CI-007 | Captured payment amount equals order grand total | ✅ |
| CI-008 | Completed sale has balanced journal of equal economic value | ✅ |
| CI-009 | COGS = quantity × catalog cost, never client `unitCost` | ✅ |
| CI-010 | Cashier cannot transact on an unauthorized branch | ✅ |
| CI-011 | Request cannot mutate another customer's credit / Polim | ✅ |
| CI-012 | POS and storefront use the same money function for the same intent | ✅ |

### Residual debt (do not block M7; fix in hardening pass)

| Debt | Where | Risk |
|------|--------|------|
| Credit path hardcodes `staffRole: 'OWNER'` | `checkout-repo.ts` | Role checks in `authorizeCreditSale` are bypassed |
| Discount/branch auth may use `body.staffRole` | `pos-checkout-service.ts` | Client can escalate role unless route injects session role |
| UI still estimates VAT as 18% | POS / shop checkout / CartDrawer | Display only; server totals win |
| Quotation → order still trusts line `unitPrice` | `convert-to-order.ts` | Off durable checkout path |

---

## CI-001 — Server-authoritative selling price

**Given** a product with catalog `salePrice = P`  
**When** checkout receives `unitPrice = X` where `X ≠ P`  
**Then** line unit price is `P`.

---

## CI-002 — Variant price correctness

**Given** product base `B` and variant V with `salePrice = V`  
**When** checkout intent includes that `variantId`  
**Then** unit price is `V`, not `B`.  
Null variant prices inherit product base.

---

## CI-003 — Server-authoritative tax

**Given** an active rate `R` on the product's (or default STANDARD_VAT) tax profile  
**When** checkout computes tax  
**Then** `taxTotal = round(taxable * R / 100, 2)`.

Changing `R` in the registry changes totals with **no checkout code change**.

---

## CI-004 — Server-Authoritative Discount Authorization

A client/browser may REQUEST a discount, but only the server may determine whether that discount is authorized and economically valid:

1. **Subtotal Cap (CI-004-A):** No discount may exceed the authoritative eligible subtotal.
2. **Negative Rejection (CI-004-B):** Negative amounts or percentages are strictly rejected with 400.
3. **Non-Authoritative Client Inputs (CI-004-C/D):** Client `discountTotal`, `discountPercent`, and `finalPrice` are advisory; server derives value from catalog subtotal.
4. **Staff Role Authority (CI-004-E/F):**
   - `CASHIER`: Maximum 15% discount without override. Exceeding 15% requires Manager/Owner override (PIN).
   - `MANAGER` / `ADMIN`: Maximum 30% discount without Owner override.
   - `OWNER`: Full override authority up to 100% of subtotal.
   - `WAREHOUSE`, `MARKETING`, `ACCOUNTANT`, Unauthenticated: 0% manual discount authority (rejected with 403).
   - Staff role is pulled from server session; clients cannot escalate authority in payload.
5. **Storefront Policy:** Public storefront strictly forbids manual staff discounts; only server-evaluated promotions and verified trade-in vouchers are permitted.
6. **Promotion Stacking Policy (CI-004-H):** Manual and promotion discounts combine within policy caps.
7. **Tax After Discount (CI-004-I):** Output tax is strictly computed on the discounted taxable amount: `taxable = max(0, subtotal - authorizedDiscount)`.
8. **Audit Trail (CI-004-K):** Every discount produces an audit record containing actor ID, role, rule applied, reason, and timestamp.

---

## CI-005 — Available stock

`available = max(0, on_hand - reserved)`.

Selling or reserving `qty` requires `available >= qty`. `on_hand` and `reserved` never go negative on the canonical path.

Exception: `allowStockUnderrun` (offline POS sync) may take `on_hand` negative.

---

## CI-006 — Concurrent checkout cannot oversell

Postgres `UPDATE … WHERE (on_hand - reserved) >= qty` serializes on the balance row.

Model: 10 on hand, two checkouts of 6 → one SALE succeeds (`on_hand = 4`), one fails. Never `on_hand < 0`.

---

## CI-007 — Payment Identity & Reconciliation

**Given** an order with grand total `T`  
**When** audited against payment transaction records  
**Then**:
`orderTotal = sum(CAPTURED payments) + outstandingBalance`.

1. **State Differentiation:** Non-captured statuses (`PENDING`, `INITIATED`, `AUTHORIZED`, `FAILED`, `CANCELLED`) are **never** treated as captured money.
2. **Duplicate Protection:** Duplicate webhook or gateway callbacks with the same `providerRef` are rejected as duplicate replays, preventing double consideration.

---

## CI-008 — Authoritative GL Double-Entry Identity & Compensating Reversals

**Given** an authoritative checkout snapshot with `grandTotal`, `taxable`, `taxTotal`, and `totalCost`  
**When** journalizing the transaction  
**Then**:
- `Debits (Cash 1010 / Bank 1020 / AR 1100) = grandTotal`
- `Credits (Sales Revenue 4000) = taxable`
- `Credits (Tax Liability 2100) = taxTotal`
- `Debits (COGS 5000) = totalCost`
- `Credits (Inventory Relieved 1200) = totalCost`
- `Total Debit == Total Credit` (Zero imbalance).

**Refunds:** Post a **Compensating Journal Entry** reversing revenue and tax against refund consideration, plus restoring inventory asset against COGS if restocked. Never mutates historical journals.

**Cancellation:** Unpaid / COD pending cancellations do not manufacture a fake failed payment transaction or money movement; stock is restored if previously decremented. Paid orders require full/partial refund flow.

---

## CI-009 — Authoritative COGS

`unitCost` is `variant.costPrice ?? product.costPrice`. Client cost is ignored.

---

## CI-010 — Branch & Location Authorization ("Do Not Trust branchId from Browser")

**Hierarchy:**
`Authenticated Staff → Staff Role → Assigned Branch → Allowed Warehouse/Register → Commerce Mutation`

1. **Anti-Spoofing:** A cashier or manager cannot submit another `branchId` in the request body to operate, sell from, or inspect an unauthorized branch. Mismatches are rejected with 403 Forbidden.
2. **Global Roles:** `OWNER` and `ADMIN` have unrestricted multi-branch authority across all locations.
3. **Register $\leftrightarrow$ Branch Integrity:** POS registers must strictly belong to the authorized branch; ringing sales on a register belonging to another branch throws `REGISTER_BRANCH_MISMATCH(403)`. Inactive registers throw 400.
4. **Transfers & GRN:** Initiating stock transfers or receiving GRN requires verified authority over the source/target location.
5. **Branch Read & Report Isolation:** Inventory balances and reports are scoped strictly to the staff member's assigned branches.
6. **Default Fallback:** Omitted `branchId` resolves to the cashier's assigned default branch, avoiding client-side guesswork.

---

## CI-011 — Customer & Polim Potha Credit Authorization

**Hierarchy:**
`Customer → Credit Eligibility → Credit Limit → Existing Balance → Authoritative Credit Sale → Ledger Entry → Reconciliation`

1. **Authoritative Ledger Balance:**
   `newOutstanding = existingOutstanding + authoritativeCreditSale - authoritativePayments - authoritativeCredits`.
   Balances are never calculated from or manipulated by browser-supplied amounts.
2. **Credit Limit Enforcement:** Purchases require `currentBalance + saleAmount <= creditLimit`. Attempting to exceed credit limit throws 403 `CREDIT_LIMIT_EXCEEDED` unless authorized with Owner override.
3. **Credit Facility Eligibility:** Customers with zero credit limit or `BLOCKED` / `SUSPENDED` account status are barred from credit transactions.
4. **Idempotency Protection:** Duplicate transaction requests with the same `idempotencyKey` return existing ledger records without double-debiting.
5. **Returns & Refunds:** Credit sale returns reduce the customer's outstanding AR balance; no fake cash consideration is disbursed for an unpaid credit sale.
6. **Cancellations:** Cancelled credit sales restore pre-invoice credit balance via cancellation ledger entries without creating cash discrepancies.

---

## CI-012 — Channel parity

`computeAuthoritativeCheckoutTotals(lines, options)` is the only money function for POS, storefront, PayHere, and holds. Same catalog lines + discount + rates ⇒ same totals.

POS cash and storefront COD both set `decrementStock: true` → same `recordSale` / SALE movement.
