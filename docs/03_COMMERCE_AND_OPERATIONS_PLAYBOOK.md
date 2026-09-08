# GRABBER BUSINESS OS — COMMERCE & PHYSICAL OPERATIONS PLAYBOOK

---

## 1. Fast Counter POS Operations (`/pos`)

### Key Capabilities:
* **Instant Barcode Scanning**: USB/Bluetooth barcode scanner input with debounce handling and audio feedback.
* **Hold & Resume Carts**: Cashiers can hold multiple customer baskets in memory while waiting for item lookups or price checks.
* **Multi-Tender Split Payments**: Pay a single bill across Cash, Card, and Polim Potha customer credit.
* **Shift Drawer Management**: Register opening float, mid-shift cash drops, and end-of-shift drawer reconciliation with variance auditing.
* **Offline-First Resilience**: If the internet disconnects, transactions buffer locally with unique UUID keys and automatically reconcile against `/api/pos/checkout-sync` upon reconnection.

```
┌────────────────────────────────────────────────────────┐
│                   COUNTER POS SCREEN                   │
├────────────────────────────┬───────────────────────────┤
│  BARCODE / SEARCH INPUT    │  ACTIVE CART ITEMS        │
│  [ SCANNER LISTENER ]      │  • 2x Ceylon Tea (1,200)  │
│                            │  • 1x Linen Shirt (4,500) │
│  CATEGORY QUICK GRID       │  Subtotal:   LKR 6,900    │
│  [Grocery] [Fashion] [Tech]│  Tax (18%):  LKR 1,242    │
│  [Drink]   [Snack]   [Sale]│  Grand Total: LKR 8,142   │
│                            ├───────────────────────────┤
│  NUMPAD / QUICK CASH       │  [ SPLIT PAY ] [ POLIM ]  │
│  [5000] [2000] [1000] [500]│  [ COMPLETE CASH SALE ]   │
└────────────────────────────┴───────────────────────────┘
```

---

## 2. Customer Credit Ledger (Polim Potha)

Designed for traditional local credit bookkeeping with modern accounting controls:

* **Credit Limit Enforcement**: Each customer has a verified `creditLimitLkr`. POS prevents checkout if the bill exceeds remaining credit without manager override.
* **Aging Analysis**: Automatically categorizes outstanding receivables into `0–30 days`, `31–60 days`, and `> 60 days` buckets.
* **Repayment Recording**: Cashiers or accountants record partial or full repayments, instantly updating the customer's balance and emitting General Ledger repayment entries.
* **Automated Statement Generation**: One-click WhatsApp statement dispatch summarizing invoices and balance due.

---

## 3. Purchasing, Supplier Invoices & GRN Receiving

* **Purchase Orders (`/purchasing`)**: Draft orders to suppliers specifying expected unit cost, quantities, and delivery dates.
* **Goods Received Notes (GRN)**: When shipments arrive, warehouse staff verify quantities, log batch numbers, and record any supplier discrepancies.
* **Automated Landed Costing & Ledger**:
  * Stock balances increase upon GRN commit.
  * Supplier balance increments under Accounts Payable.
  * Stock movements record reference to the GRN receipt number.

---

## 4. Damages, Stock Write-downs & Inter-Branch Transfers

* **Damage Logging (`/damages`)**: Damaged or expired goods are logged with photo proof and write-down reasons. Inventory is immediately decremented, and an Expense/Loss journal entry is recorded.
* **Inter-Branch Stock Transfers (`/inventory/transfer`)**: Move stock between central warehouse and retail branches with a 2-step dispatch and receipt confirmation workflow.

---

## 5. Multi-Gateway Payment Adapters

| Gateway | Supported Channels | Settlement | Features |
|:---|:---|:---|:---|
| **Cash / COD** | POS + Storefront | Immediate (Counter) / On Delivery | Zero fees, instant receipt. |
| **PayHere** | Storefront + POS QR | Visa / Mastercard / Genie / LankaQR | Automated MD5 webhook reconciliation. |
| **WebXPay** | Storefront + POS QR | Visa / Mastercard / LankaPay | Direct bank checkout with fraud screening. |
| **Koko** | Storefront + POS | Buy Now Pay Later (3 Installments) | Merchant receives 100% upfront settlement. |
| **Mintpay** | Storefront + POS | Buy Now Pay Later (Debit / Credit) | Real-time credit eligibility check. |
| **Payzy** | Storefront | Direct Bank Pay & Installments | Low merchant transaction fee. |
