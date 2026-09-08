# GRABBER SOLO / BUSINESS OS — GAP REGISTER & REMEDIATION LEDGER

This document records the exact audit findings, remediation actions, and verification status across Pass 1 and Pass 2.

---

## 1. Resolved Gaps Ledger (Pass 2 Completed)

| Gap ID | Priority | Category | Finding in Pass 1 | Pass 2 Remediation & Proof | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-001** | **P0** | Persistence | Legacy `app_collections` and `configJson` fallback persistence used in damages, warranties, and quotations. | Eliminated all `app_collections` callers. Created canonical relational tables `damages`, `serialNumbers`, `quotations`. Verified by `tests/damages-relational.test.ts`, `tests/warranties-relational.test.ts`. | **CLOSED / RESOLVED** |
| **GAP-002** | **P0** | Commerce Integrity | Returns lacked itemized line tracking (`orderReturnLines`) with prorated discount/tax and restock grading. | Implemented `orderReturnLines` schema, `processOrderReturn` service with multi-line returns, grading (`RESTOCKABLE`, `DAMAGED`, `SCRAP`), GL ledger reversals, and Polim Potha customer credit refunds. Verified by `tests/order-return-lines.test.ts`. | **CLOSED / RESOLVED** |
| **GAP-003** | **P0** | Offline POS | Offline mode was limited to a simple checkout queue without catalog, customer snapshots, or local sequence numbers. | Implemented `offline-engine.ts` with 5-store IndexedDB (`product_catalog`, `customer_cache`, `transaction_journal`, `config_cache`, `checkout_queue`), local sequence counters, terminal UUIDs, and reconnect backoff sync. Verified by `tests/offline-pos-sync.test.ts`. | **CLOSED / RESOLVED** |
| **GAP-004** | **P1** | Restaurant / Food | `/restaurant/kds` was a basic display without domain-driven state transitions, station routing, and kitchen notes. | Created live KDS screen with audio/visual alerts, station filtering (`KITCHEN`, `GRILL`, `BAR`, `DESSERT`, `PACKING`), bump/reopen lifecycle, and BOM recipe ingredient depletion. Verified by `tests/kds-lifecycle.test.ts`. | **CLOSED / RESOLVED** |
| **GAP-005** | **P1** | Hardware | POS lacked native Hardware Abstraction Layer (HAL) for ESC/POS receipt generation and cash drawer kick. | Built `src/lib/pos/hardware-layer.ts` with WebUSB/Bluetooth direct streaming, ESC/POS byte buffers, and drawer pulses. Verified by `tests/pos-hardware.test.ts`. | **CLOSED / RESOLVED** |
| **GAP-006** | **P0** | API Security | Auth coverage needed verification across all routes and roles. | Audited all 119 routes. 100% covered with staff session RBAC, customer auth, webhook HMAC signatures, and cron secret gates. Verified by `tests/security-http-auth.test.ts`, `tests/security-p0.test.ts`. | **CLOSED / RESOLVED** |

---

## 2. Invariant & Architecture Compliance

1. **Single-Business Purity:** All multi-tenant SaaS baggage eliminated. Single business, single database, unlimited branches/warehouses.
2. **Canonical Commerce Engine:** 100% of POS, Storefront, WhatsApp, and Jarvis transactions route through the canonical pricing, stock, and double-entry accounting engines.
3. **Double-Entry Balance:** Invariant $\sum \text{Debits} = \sum \text{Credits}$ enforced across all transaction types.
