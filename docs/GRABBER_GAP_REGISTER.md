# GRABBER SOLO / BUSINESS OS — MASTER GAP REGISTER & REMEDIATION LEDGER (PASS 3)

---

## 1. Closed Remediation Ledger

| Gap ID | Priority | Category | Finding | Remediation & Proof | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-001** | **P0** | Persistence | Legacy `app_collections` and `configJson` fallback persistence. | Eliminated all `app_collections` callers. Created canonical relational tables `damages`, `serialNumbers`, `quotations`. Verified by `tests/damages-relational.test.ts`. | **CLOSED** |
| **GAP-002** | **P0** | Commerce Integrity | Returns lacked itemized line tracking (`orderReturnLines`) with prorated discount/tax and restock grading. | Implemented `orderReturnLines` schema, `processOrderReturn` service with multi-line returns, grading (`RESTOCKABLE`, `DAMAGED`, `SCRAP`), GL ledger reversals, and Polim Potha customer credit refunds. Verified by `tests/order-return-lines.test.ts`. | **CLOSED** |
| **GAP-003** | **P0** | Offline POS | Offline mode was limited to simple queue. | Implemented `offline-engine.ts` with 5-store IndexedDB, local sequence counters, terminal UUIDs, and reconnect backoff sync. Verified by `tests/offline-pos-sync.test.ts`. | **CLOSED** |
| **GAP-004** | **P1** | Restaurant / Food | `/restaurant/kds` was a basic display without domain-driven state transitions. | Created live KDS screen with audio/visual alerts, station filtering, bump/reopen lifecycle, and BOM recipe ingredient depletion. Verified by `tests/kds-lifecycle.test.ts`. | **CLOSED** |
| **GAP-005** | **P1** | Hardware | POS lacked native Hardware Abstraction Layer (HAL). | Built `src/lib/pos/hardware-layer.ts` with ESC/POS byte buffers and drawer pulses. Verified by `tests/pos-hardware.test.ts`. | **CLOSED** |
| **GAP-006** | **P0** | API Security | Auth coverage needed verification across all routes and roles. | Audited all 119 routes. 100% covered with staff session RBAC, customer auth, webhook HMAC signatures, and cron secret gates. Verified by `tests/security-http-auth.test.ts`. | **CLOSED** |
| **GAP-007** | **P1** | Input Validation | Returns quantity accepted 0 or negative values via Math.max fallback. | Added strict positive integer validation throwing 400 when `rawQty <= 0` or item already fully returned. Verified by `tests/pass3-adversarial-verification.test.ts`. | **CLOSED** |

---

## 2. Scheduled Future Scope (Phase 4 Roadmapped)

| Item ID | Priority | Category | Description | Target Phase |
| :--- | :--- | :--- | :--- | :--- |
| **SCH-001** | **P2** | Vertical Engine | Dedicated `pharmacy.ts` pack with prescription scan capture and regulatory pharmacist approval gate. | Phase 4 |
| **SCH-002** | **P2** | Vertical Engine | Dedicated `rental.ts` pack with asset availability calendar and deposit dispute handling. | Phase 4 |
| **SCH-003** | **P2** | Vertical Engine | Relational `vehicle_compatibility` table (Make -> Model -> Generation -> Year -> Engine -> OEM). | Phase 4 |
