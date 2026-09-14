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
| **GAP-008** | **P0** | Disaster Recovery | `verifyRestoredDatabaseIntegrity()`'s `ordersConsistent` and `stockIntegrity` checks were dead code — computed values were discarded and the booleans stayed hardcoded `true`, so a restore with orphaned order items or an unreconciled stock ledger still reported `valid: true`. | Implemented real order/orderItem referential checks and stock-movement-to-onHand ledger reconciliation in `src/lib/backup/crypto-backup.ts`. Verified by `tests/disaster-recovery.test.ts` (DR-005b, DR-005c). | **CLOSED** |
| **GAP-009** | **P0** | AI / Jarvis | `get_stock_summary` and `get_customer_credit_report` Jarvis tools read from disconnected in-memory `InventoryEngine`/`CreditEngine` singletons that are never populated from Postgres, silently returning empty/zero data in production while every other Jarvis stock/credit tool queried the database. | Rewired both tools in `src/lib/ai/jarvis-tools.ts` to query `stockBalances` / `polimPothaAccounts` / `polimPothaEntries` directly, with the same FIFO aging calculation applied to real ledger rows. Removed the unused engine constructor params. Verified by `tests/jarvis-tools-db-grounded.test.ts`. | **CLOSED** |
| **GAP-010** | **P1** | Loyalty Integrity | Loyalty earn/redeem mutations accepted invalid values, allowed inactive members to transact, and inserted the transaction separately from the balance update. A concurrent redemption could overspend points or leave the ledger out of sync. | Added positive/finite input validation, inactive-member rejection, conditional redemption updates, and one transaction covering balance mutation plus `loyalty_transactions` insert. | **CLOSED** |
| **GAP-011** | **P1** | Warranty Operations | Warranty was registration/search only. There was no persisted claim, expiry gate, repair linkage, resolution, or controlled claim status lifecycle. | Added `warranty_claims` relational table and migration `0017`, claim creation with serial and expiry validation, and staff status updates with repair/resolution linkage. | **CLOSED** |
| **GAP-012** | **P1** | Onboarding Certification | `/setup` displayed milestones but had no server-enforced completion operation. Operators could treat an incomplete installation as ready. | Added required branch and non-temporary OWNER credential gates, `goLiveReady`, persisted `onboardingCompletedAt`, and protected `POST /api/setup/progress` completion action. | **CLOSED** |
| **GAP-013** | **P1** | Delivery Operations | Dispatch was not idempotent and there was no guarded delivery status transition API; repeated dispatches could create/update shipments unpredictably. | Added reuse of active delivery records, terminal-state dispatch rejection, explicit status transition validation, delivered timestamping, and order fulfillment synchronization through `PATCH /api/delivery`. Multi-provider adapter support remains future scope. | **CLOSED** |

---

## 2. Scheduled Future Scope (Phase 4 Roadmapped)

| Item ID | Priority | Category | Description | Target Phase |
| :--- | :--- | :--- | :--- | :--- |
| **SCH-001** | **P2** | Vertical Engine | Dedicated `pharmacy.ts` pack with prescription scan capture and regulatory pharmacist approval gate. | Phase 4 |
| **SCH-002** | **P2** | Vertical Engine | Dedicated `rental.ts` pack with asset availability calendar and deposit dispute handling. | Phase 4 |
| **SCH-003** | **P2** | Vertical Engine | Relational `vehicle_compatibility` table (Make -> Model -> Generation -> Year -> Engine -> OEM). | Phase 4 |
