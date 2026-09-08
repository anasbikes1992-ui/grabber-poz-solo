# GRABBER SOLO / BUSINESS OS — CANONICAL DOMAIN ARCHITECTURE

This document specifies the single-business, canonical domain architecture for Grabber Solo / Grabber Business OS.

---

## 1. Architectural Philosophy: Single-Business Pure Commerce Core

Grabber Solo is architected as an Odoo-class, dedicated business operating system for single enterprises with complex multi-location and multi-channel commerce needs.

```
                          ┌───────────────────────────┐
                          │   SALES & COMMERCE CHANNELS│
                          ├───────────┬───────────────┤
                          │  POS App  │  Storefront   │
                          │ (Counter) │ (Next.js SSR) │
                          ├───────────┼───────────────┤
                          │ Restaurant│   WhatsApp    │
                          │ Table/KDS │   Commerce    │
                          └─────┬─────┴───────┬───────┘
                                │             │
                                ▼             ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                CANONICAL COMMERCE ENGINE                    │
     ├─────────────────────────────────────────────────────────────┤
     │  1. Server-Authoritative Pricing & Promotions Engine        │
     │  2. Itemized Returns & Refunds Domain Engine                │
     │  3. Multi-Location Inventory & Reservation Ledger           │
     │  4. Double-Entry General Ledger Accounting Subsystem        │
     │  5. Polim Potha (AR Ledger) & Supplier AP Subsystem         │
     └──────────────────────────────┬──────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              CANONICAL POSTGRESQL DATABASE                  │
     │  Single Business • Single Database • Zero SaaS Multi-Tenancy │
     └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Services

### A. Pricing & Promotions Engine (`src/lib/promotions/promotion-engine.ts`)
- **Server Recalculation:** Client submissions of prices, discounts, or taxes are never trusted.
- **Precedence & Stacking:** Evaluates active promo codes, Buy-X-Get-Y rules, automatic quantity tier discounts, and customer group rates in strict deterministic order.

### B. Returns & Refunds Engine (`src/lib/returns/returns-service.ts`)
- **Granular Line Tracking (`orderReturnLines`):** Prorates item-level discounts, line taxes, and restocking fees.
- **Inventory & Damaged Grading:** Restockable returns increment location inventory via `stockMovements`; damaged/scrapped returns create recorded damage write-offs.
- **Financial Balance:** Generates matching double-entry reversals (Debits to Sales Returns / Inventory, Credits to Cash/Bank/Polim Potha AR).

### C. Inventory Ledger Subsystem (`src/lib/stock/stock-service.ts`)
- **Immutable Movement Ledger:** Every inventory event (sale, return, purchase receipt, branch transfer, cycle count, damage write-off) writes a signed `stockMovements` row.
- **Multi-Location Hierarchy:** Supports `Branch -> Warehouse -> Zone -> Bin Location`.
- **Negative Stock Protection:** Configurable strict policy prevents unallocated stock depletion.

### D. Double-Entry Accounting Subsystem (`src/lib/accounting/*`)
- **General Ledger Atomicity:** Every financial event posts a balanced `journalEntries` record with multiple `journalLines`.
- **Invariant:** $\sum \text{Debits} = \sum \text{Credits}$ is verified on every transaction boundary.

### E. Offline POS Subsystem (`src/lib/pos/offline-engine.ts`)
- **5-Store IndexedDB Engine:** Maintains local catalog snapshot, customer cache, sequence counters, and transaction journal.
- **Crash Recovery & Reconciliation:** Offline transactions are identified by device UUID + monotonic local sequence counters, reconciled idempotently on reconnection.
