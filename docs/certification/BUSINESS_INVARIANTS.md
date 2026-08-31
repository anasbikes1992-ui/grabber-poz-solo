# GRABBER BUSINESS OS — CANONICAL BUSINESS INVARIANTS

Every client instance running GRABBER Business OS must strictly enforce and satisfy these mathematical, operational, and financial invariants.

> **Schema note:** Stock qty columns are `on_hand`, `reserved`, `damaged` (`src/db/schema.ts`). **Available** is derived: `on_hand - reserved`. Seeded COA codes use `4000` (Sales), `5000` (COGS), `2100` (VAT Payable) — not `4010`/`5010`/`2020`.

---

## 1. Inventory & Stock Invariants

1. **Availability Equation:**
   $$\text{Available Stock} = \text{On Hand Stock} - \text{Reserved Stock}$$
   * Derived `Available` must never drop below 0 unless backorders/negative stock is explicitly permitted in `business_config`.
   * When an online/WhatsApp order is placed: `reserved` increases; `on_hand` unchanged.
   * When an order is fulfilled/dispatched: `reserved` decreases, `on_hand` decreases.

2. **Inventory Stock Balance Conservation:**
   $$\text{Closing Stock} = \text{Opening Stock} + \text{Purchases (GRN)} + \text{Transfers In} + \text{Returns} - \text{Sales} - \text{Transfers Out} - \text{Damaged} \pm \text{Stock Adjustments}$$

---

## 2. Financial & Double-Entry Accounting Invariants

1. **Fundamental Double-Entry Symmetry:**
   $$\sum \text{Debits} = \sum \text{Credits}$$
   * For every journal entry in `journal_entries`, the sum of debit lines in `journal_lines` must exactly match the sum of credit lines to the nearest cent (`0.00`).

2. **Sales Journal Invariant (seeded COA codes):**
   * **Cash Sale:**
     * $\text{Debit: 1010 Cash on Hand} = \text{Gross Amount}$
     * $\text{Credit: 4000 Sales Revenue} = \text{Net Sales}$
     * $\text{Credit: 2100 VAT Payable} = \text{VAT 18\% (if applicable)}$
     * $\text{Debit: 5000 Cost of Goods Sold (COGS)} = \text{Cost Price} \times \text{Quantity}$
     * $\text{Credit: 1200 Merchandise Inventory} = \text{Cost Price} \times \text{Quantity}$

3. **Customer Debt (Polim Potha) AR Conservation:**
   $$\text{Closing AR} = \text{Opening AR} + \text{Credit Sales} - \text{Customer Repayments} - \text{Credit Notes}$$
   * Balance lives on `polim_potha_accounts.current_balance` (entry types: `INVOICE`, `REPAYMENT`, `ADJUSTMENT`, `WRITE_OFF`).
   * Outstanding balance must never exceed assigned `credit_limit`.

4. **Supplier Debt (AP) Conservation:**
   $$\text{Closing AP} = \text{Opening AP} + \text{Purchases (GRN)} - \text{Supplier Payments} - \text{Debit Notes}$$
   * Balance lives on `supplier_accounts.current_balance`.

---

## 3. Commerce & Settlement Invariants

1. **Order Total Balance:**
   $$\text{Order Total} = \sum (\text{Line Items} \times \text{Unit Price}) + \text{Tax} + \text{Shipping Fee} - \text{Discounts}$$

2. **Payment Reconciliation:**
   $$\text{Order Total} = \text{Cash Paid} + \text{Card/Online Paid} + \text{Polim Potha Credit} + \text{Store Credit Used}$$

3. **Returns & Reversal Invariant:**
   * A returned item must restore `on_hand` and generate an exact inverse GL entry using seeded codes:
     * Debit `4000` Sales (or contra-revenue) / Credit `1010` Cash (or `1100` AR)
     * Debit `1200` Inventory / Credit `5000` COGS
