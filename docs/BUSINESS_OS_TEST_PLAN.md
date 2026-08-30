# GRABBER BUSINESS OS — VERIFICATION & TEST PLAN
**Unit Tests, Ledger Mathematical Invariants & Golden Business E2E Test**

---

## 1. Automated Test Hierarchy

```
                               ┌─────────────────────────────┐
                               │   GOLDEN BUSINESS E2E TEST  │
                               │   Full Business Lifecycle   │
                               └──────────────┬──────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       │                                             │
         ┌─────────────▼─────────────┐                 ┌─────────────▼─────────────┐
         │  LEDGER INVARIANT TESTS   │                 │   SERVICE UNIT TESTS      │
         │  (Stock & Accounting Math)│                 │   (Tax, Price, FSM, Credit│
         └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Core Invariant Checks

### 2.1 Stock Movement Ledger Invariant
$$\text{Opening Stock} + \sum \text{Purchases} + \sum \text{Transfers In} + \sum \text{Returns} - \sum \text{Sales} - \sum \text{Transfers Out} - \sum \text{Damaged} \pm \sum \text{Adjustments} = \text{Current On-Hand Stock}$$

### 2.2 Financial Double-Entry Invariant
$$\sum \text{Journal Line Debits} = \sum \text{Journal Line Credits} \quad (\forall \text{ transaction headers})$$

### 2.3 Customer Credit (Polim Potha) & Supplier Payable Invariant
$$\text{Opening Balance} + \sum \text{Credit Invoices} - \sum \text{Repayments} \pm \sum \text{Adjustments} = \text{Current Outstanding Balance}$$

---

## 3. The Comprehensive Golden Business E2E Test

The automated E2E test suite executes the complete operational lifecycle in sequence:

```text
1. INITIALIZATION: Run Setup Wizard for Fashion Retail store.
2. STAFF SETUP: Create Owner, Manager, Cashier, Warehouse, Accountant users with assigned roles & locations.
3. LOCATIONS: Create Colombo Branch, Kandy Branch, Central Warehouse.
4. CATALOG: Create products with variants (Sizes S/M/L) and effective-dated Tax Profiles.
5. PURCHASING: Create PO to Supplier -> Receive GRN at Central Warehouse -> Verify AP entry & Stock entry.
6. TRANSFER: Propose & approve transfer of 20 units from Central Warehouse to Colombo Branch.
7. COUNTER POS SALE: Cashier opens shift -> Scans items -> Multi-tender payment (Cash + Card) -> Shift reconciliation.
8. WEB STOREFRONT SALE: Online order -> Reserve stock at Colombo Branch -> Payment verified -> Packed & Delivered.
9. WHATSAPP SALE: Customer chats -> COD order placed -> Dispatched with courier -> Marked Delivered & Collected.
10. POLIM POTHA CREDIT SALE: Credit check verifies limit -> Sale recorded -> Aging bucket updated -> Cash repayment posted.
11. RETURN & REFUND: Return 1 item -> Stock restocked to branch balance -> Refund journal entry created.
12. JARVIS COPILOT: Read analytical query (instant) -> Propose stock transfer (High-risk write with confirmation modal).
13. CREATIVE FACTORY: Upload asset to Media Library -> Enqueue video render job -> Verify status transition.
14. AUDIT & PORTABILITY: Verify immutable audit log completeness -> Trigger Backup & Data Export.
```
