# GRABBER SOLO — RETURNS, REFUNDS & REVERSE COMMERCE ENGINE

This document details the itemized returns architecture, discount/tax proration math, grading status handling, and double-entry accounting reversals in Grabber Solo.

---

## 1. Line-Item Granular Returns Architecture

In Grabber Solo, returns operate at the individual line-item level with strict unreturned-quantity caps. Returns support multi-line partial returns, damaged grading, and multiple refund destinations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RETURN REQUEST INITIATION                       │
├────────────────────────────────────────────────────────────────────────┤
│ Input:                                                                 │
│ - orderId                                                              │
│ - lines: [ { orderItemId, quantity, reason, gradingStatus, restockLoc } ]│
│ - refundMethod: ORIGINAL_PAYMENT | CASH | CARD | CUSTOMER_CREDIT       │
│ - restockStatus: RESTOCKED | DAMAGED | SCRAP                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   QUANTITY & PRO-RATA CALCULATION                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Validate: QtyToReturn <= SoldQty - PreviouslyReturnedQty            │
│ 2. Line Discount Proration: UnitDiscount = LineDiscount / SoldQty       │
│ 3. Line Tax Proration:      UnitTax      = LineTax / SoldQty           │
│ 4. Unit Refund Amount:      UnitNetRefund = UnitPrice - UnitDisc + Tax │
│ 5. Total Refund:            Sum(QtyToReturn * UnitNetRefund)           │
│ 6. Cost of Goods Reversal:  Sum(QtyToReturn * UnitCost)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ATOMIC DATABASE TRANSACTIONS                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Insert `returns` record + `orderReturnLines` itemized rows          │
│ 2. Stock Ledger Execution:                                             │
│    - If RESTOCKED:  `stockMovements` (type: RETURN, delta: +qty)       │
│    - If DAMAGED:    `damages` row + `stockMovements` (type: DAMAGE)    │
│ 3. Refund Posting:                                                     │
│    - If CASH/CARD:  Record payment reversal                            │
│    - If CREDIT:     Deduct `polimPothaAccounts` & log repayment entry  │
│ 4. Double-Entry General Ledger Journal:                                │
│    - Debit:  Sales Returns & Allowances Account                        │
│    - Debit:  Sales Tax Payable (reversal)                              │
│    - Credit: Cash / Bank / Customer AR (Refund payout)                 │
│    - Debit:  Inventory Asset Account (for restocked goods)             │
│    - Credit: Cost of Goods Sold (COGS reversal)                        │
│ 5. Update Order Status: PARTIALLY_REFUNDED (if partial) / RETURNED     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariant Checklist for Returns

1. **Over-Return Prevention:** An item can never be returned for more units than were originally sold minus prior returns.
2. **Double-Entry Balance:** Debits always equal Credits ($\sum D = \sum C$).
3. **Lot / Serial Tracking:** When serial-tracked electronics are returned, the `serialNumbers` record is unassigned from customer and marked `IN_STOCK` or `DEFECTIVE`.
4. **Polim Potha Credit Integrity:** Credit balance on Polim Potha cannot be reduced below zero on return refunds.
