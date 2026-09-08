# GRABBER SOLO — COMMERCE INTEGRITY & INVARIANTS LEDGER

This document specifies the mandatory transactional invariants governing double-entry General Ledger bookkeeping, inventory balance calculations, payments, and offline reconciliation.

---

## 1. The 20 Golden Invariants of Grabber Solo

| Invariant ID | Domain | Invariant Rule & Mathematical Condition | Automated Verification |
| :--- | :--- | :--- | :--- |
| **INV-001** | Sales Total | $\text{GrandTotal} = \sum \text{LineTotals} + \text{TotalTax} - \text{Discount} + \text{Shipping}$ | `tests/commerce-integrity.test.ts` |
| **INV-002** | Double-Entry Balance | $\sum_{\text{lines}} \text{Debit} = \sum_{\text{lines}} \text{Credit}$ for every single `journalEntries` record | `tests/ensure-coa.test.ts` |
| **INV-003** | Inventory Delta | $\text{Current Stock} = \text{Initial Stock} + \sum \Delta \text{stockMovements}$ | `tests/stock-service.test.ts` |
| **INV-004** | COGS Integrity | Every inventory-depleting sale must record matching Cost of Goods Sold journal lines. | `tests/commerce-s6.test.ts` |
| **INV-005** | Return Bounds | $\text{ReturnedQty} \le \text{SoldQty} - \sum \text{PriorReturns}$ per order line. | `tests/order-return-lines.test.ts` |
| **INV-006** | Refund Proration | Itemized refund values cannot exceed unit net paid price $(\text{UnitPrice} - \text{UnitDiscount} + \text{UnitTax})$. | `tests/order-return-lines.test.ts` |
| **INV-007** | Payment Allocation | $\sum \text{Payments} = \text{PaidAmount}$; order marked `PAID` only when fully settled. | `tests/payment-service.test.ts` |
| **INV-008** | Webhook Idempotency | Duplicate gateway callbacks (PayHere, WebXPay) must not create duplicate payment records. | `tests/payment-webhook-security.test.ts` |
| **INV-009** | Offline Deduplication | Repeated offline sync attempts with identical `clientUuid` return the cached completed order. | `tests/offline-pos-sync.test.ts` |
| **INV-010** | Polim Potha Balance | $\text{Customer AR Balance} = \sum \text{Invoice Debits} - \sum \text{Repayment Credits}$. | `tests/customer-credit.test.ts` |
| **INV-011** | Serial Exclusivity | A single serial number (`serialNumbers`) cannot be simultaneously assigned to multiple active owners. | `tests/warranties-relational.test.ts` |
| **INV-012** | Damage Write-off | Every approved damage record posts an inventory reduction and an inventory shrinkage expense journal. | `tests/damages-relational.test.ts` |
| **INV-013** | Transfer Conservation | Transfer dispatch from Location A to Location B does not alter total enterprise stock on hand. | `tests/warehouses-and-transfers.test.ts` |
| **INV-014** | Multi-Branch Pricing | Branch-level pricing overrides standard retail price without modifying the canonical catalog. | `tests/promotion-engine.test.ts` |
| **INV-015** | Supplier AP Balance | $\text{Supplier Balance} = \sum \text{GRN Bills} - \sum \text{Supplier Payments}$. | `tests/commerce-s5.test.ts` |
| **INV-016** | Loyalty Ledger | Points available = $\sum \text{Earned} - \sum \text{Redeemed}$. Points cannot be redeemed if balance is insufficient. | `tests/commerce-integrity.test.ts` |
| **INV-017** | Recipe BOM Depletion | Menu item sale automatically depletes raw ingredient stock balances atomically. | `tests/kds-lifecycle.test.ts` |
| **INV-018** | Action Policy Gate | DESTRUCTIVE and HIGH_RISK Jarvis actions require signed manager approval tokens before execution. | `tests/autonomy-policy-matrix.test.ts` |
| **INV-019** | Zero SaaS Leakage | Single-business database with zero `org_id` / `tenant_id` column contamination. | `tests/installation-identity.test.ts` |
| **INV-020** | Immutable Audit Trail | 100% of stock adjustments, price overrides, returns, and AI actions write immutable audit logs. | `tests/golden-business.test.ts` |
