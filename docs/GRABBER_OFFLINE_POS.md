# GRABBER SOLO — OFFLINE POS & SYNCHRONIZATION ENGINE

This document details the offline architecture, IndexedDB persistence layer, synchronization protocols, conflict resolution strategies, and crash-recovery procedures in Grabber Solo.

---

## 1. Architectural Overview

Offline operation in Grabber Solo is an enterprise-grade offline commerce engine. A cashier can open shifts, scan barcodes, apply validated discounts, select cached customers, compute taxes, generate print receipts, and persist transactions even with complete network or power failure.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OFFLINE POS BROWSER                           │
├────────────────────────────────────────────────────────────────────────┤
│ IndexedDB Database: grabber_offline_pos_v2                             │
│ ┌───────────────────────────┬────────────────────────────────────────┐ │
│ │ 1. product_catalog        │ SKU, Barcode, Prices, Variants, Tax    │ │
│ │ 2. customer_cache         │ Phone, Name, Credit Limit, Balance     │ │
│ │ 3. transaction_journal    │ UUID, Monotonic Sequence, Sync Status  │ │
│ │ 4. config_cache           │ Tax Rates, Terminal ID, Active Shift   │ │
│ │ 5. checkout_queue         │ Pending Post Queue for Reconnect Sync  │ │
│ └───────────────────────────┴────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Network Reconnect
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CANONICAL SERVER COMMERCE                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Validate Terminal UUID + Idempotency Filter                         │
│ 2. Deduplicate Sequence Numbers (Prevent Duplicate Submissions)        │
│ 3. Server-Authoritative Price & Promotion Recalculation                │
│ 4. Atomic PostgreSQL Transaction:                                      │
│    - Insert Order & OrderItems                                         │
│    - Record Stock Move & Reconcile Physical Underruns                  │
│    - Post Balanced Double-Entry GL Journals                            │
│ 5. Return Acknowledged Sync Timestamp to Client Device                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. IndexedDB Storage Schema

The offline database `grabber_offline_pos_v2` encapsulates 5 object stores:

1. **`product_catalog`**: KeyPath `id`, indexed on `barcode`, `sku`, `name`. Stores complete product snapshots including variants, active prices, tax profile IDs, and unit costs.
2. **`customer_cache`**: KeyPath `id`, indexed on `phone`. Caches frequent customers for fast POS lookup and credit validation.
3. **`transaction_journal`**: KeyPath `clientUuid`. Stores immutable local records of every completed offline sale with local sequence number, timestamp, totals, and sync status (`PENDING`, `SYNCED`, `FAILED`).
4. **`config_cache`**: KeyPath `key`. Stores store configurations, tax rates, branch ID, register ID, and active cashier session.
5. **`checkout_queue`**: KeyPath `clientUuid`. The active FIFO submission queue for background sync retries.

---

## 3. Offline Transaction Life Cycle & Invariants

1. **Client UUID & Sequence Generation:** Every offline checkout generates a cryptographically random UUID (`clientUuid`) and increments a monotonic `localSequence` stored in `config_cache`.
2. **Crash Recovery:** If the browser tab crashes or power is lost mid-checkout, the `transaction_journal` persists the state. Upon reopening, pending checkouts are auto-recovered and queued.
3. **Reconnect & Exponential Backoff Sync:**
   - Background sync triggers on `window.addEventListener('online')` and periodic heartbeat timers.
   - Retries employ jittered exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}, \dots, \max 30\text{s}$).
4. **Reconciliation & Conflict Handling:**
   - **Stale Stock / Underrun:** If an item is sold offline and server stock is lower than sold quantity, the transaction is accepted to honor the physical retail sale, stock movement is recorded, and a notification alert is raised for the store manager.
   - **Duplicate Webhook / Re-Sync:** Server idempotency filter on `clientUuid` prevents duplicate order creation or double-charging.
