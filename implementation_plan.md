# Grabber POZ Solo — Next Phase Agentic Engineering Master Plan

Building on the certified M3-M6 foundation (118/118 M3 assertions, 15/15 M5 assertions, 6/6 M6 assertions), this plan implements the unified **Agentic Engineering Control Loop**:
1. **P0 Security Hardening**: Seal role-spoofing vulnerabilities and single-tender payment amount manipulation.
2. **Operational Core (Warehouses & Staff)**: Full multi-warehouse CRUD, inter-location stock transfers (`DRAFT` → `IN_TRANSIT` → `RECEIVED` / `CANCELLED`) with pre-dispatch checks, and warehouse staff management with `WAREHOUSE` role.
3. **Client Onboarding Console (M7)**: 11-step interactive deployment wizard moving a new VPS install from `UNCONFIGURED` to `CERTIFIED FOR GO-LIVE`.
4. **Agent Control Plane & Preflight Engine**: Turn Jarvis into a verifiable, deterministic business copilot with explicit tool contracts, preflight safety gates, L0-L5 autonomy boundaries, human-in-the-loop approval, and zero raw SQL.
5. **Agent Security Suite & Release Gate**: `scripts/release-gate-agent.mjs` enforcing 12 Agent Invariants (`AG-001` → `AG-012`).

---

## User Review Required

> [!IMPORTANT]
> - **Single-Business Invariant**: 1 Client = 1 Installation = 1 Dedicated Postgres DB. No multi-tenancy or `tenant_id` proliferation will be introduced.
> - **Security Rule**: Client-provided `staffRole` or tender amounts will be strictly rejected. All authorization is derived solely from the server-validated cryptographic session (`session.role`).
> - **Zero Raw LLM SQL**: Jarvis and any future AI agents interact only via typed tool contracts executing canonical services (`recordSale`, `recordTransfer`, `receiveTransfer`, `durableCheckout`).

---

## Phase 0: Verification & Baseline (Completed)
- **Git Commit**: `d198858` (branch `main`).
- **Release Gates Status**:
  - `release:gate-m3`: 118/118 tests passing (12/12 Commerce Invariants).
  - `release:gate-m5`: 15/15 tests passing (12/12 Promotion Invariants).
  - `release:gate-m6`: 6/6 tests passing (Installation Identity & Standalone Licensing).
  - `API Auth Coverage`: 108/108 endpoints classified and protected.
  - `TypeScript`: Clean (`npx tsc --noEmit` passes with 0 errors).

---

## Proposed Changes

### 1. Phase 1 — P0 Security Hardening

#### [MODIFY] [`checkout-repo.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/repositories/checkout-repo.ts)
- Add `staffRole?: UserRole` to `CheckoutExecutionInput`.
- At line 287, replace hardcoded `staffRole: 'OWNER'` with `staffRole: input.staffRole || 'CASHIER'` so cashier credit limits are properly evaluated.
- At line 146, enforce `amount: grandTotal` on single-tender lines to prevent client-side payment amount manipulation.
- At line 184, wrap `consumeFefoLot` with error auditing instead of silent `.catch(() => null)`.

#### [MODIFY] [`pos-checkout-service.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/commerce/pos-checkout-service.ts)
- In `processPosCheckout`, reject client-provided `body.staffRole`. Use authenticated `session.role` exclusively across `buildUserBranchProfile`, `authorizeDiscount`, and `durableCheckout`.

#### [MODIFY] [`stock-invariants.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/inventory/stock-invariants.ts)
- Export typed `class InsufficientStockError extends Error` with `available` and `requested` fields.

#### [NEW] [`tests/p0-security-hardening.test.ts`](file:///d:/GRABBER%20POZ%20SOLO/tests/p0-security-hardening.test.ts)
- Test credit sale authorization fails when cashier role attempts to exceed limit without owner override.
- Test client cannot spoof `staffRole: 'OWNER'` in `processPosCheckout`.
- Test single-tender payment cannot be underpaid via client `amount` injection.

---

### 2. Phase 2 — Warehouse & Multi-Location Operations

#### [NEW] [`src/app/api/warehouses/route.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/warehouses/route.ts)
- `GET`: List active warehouses with linked branch, address, code, and stock summary.
- `POST`: Create warehouse with unique code validation (`name`, `code`, `address`, `branchId`).
- `PUT`: Update warehouse details or active status.
- Protected by `assertCanMutateCommerce(session)`.

#### [MODIFY] [`src/app/api/settings/staff/route.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/settings/staff/route.ts)
- Add `POST` handler: Create staff account with `name`, `email`, `role` (`OWNER`, `MANAGER`, `CASHIER`, `WAREHOUSE`, `ACCOUNTANT`, `MARKETING`), `pin` (hashed via `hashPin`), and location link (`branchId` or `warehouseId`).
- Add `PUT` handler: Update staff details, status, or rotate PIN.

#### [MODIFY] [`src/lib/inventory/transfer-workflow.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/inventory/transfer-workflow.ts)
- Add pre-dispatch stock check ensuring source has sufficient available stock before creating/dispatching.
- Add `cancelTransfer`: Allow cancelling `DRAFT` or `REQUESTED` transfers without mutating inventory.
- Ensure audit log records every dispatch, receipt, variance, and cancellation.

#### [MODIFY] [`src/app/api/inventory/transfer/route.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/inventory/transfer/route.ts)
- Support `action: 'cancel'`.
- Validate location types (`WAREHOUSE <-> BRANCH`, `BRANCH <-> BRANCH`, `WAREHOUSE <-> WAREHOUSE`).

#### [NEW] [`src/app/settings/warehouses/page.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/app/settings/warehouses/page.tsx)
- UI for warehouse management: create warehouse, link to branch, toggle active status, view location code.

#### [MODIFY] [`src/app/settings/staff/page.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/app/settings/staff/page.tsx)
- Add "Add Staff Member" modal supporting `WAREHOUSE` role and location dropdown.

#### [MODIFY] [`src/app/inventory/transfer/page.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/app/inventory/transfer/page.tsx)
- Add "New Transfer" modal with source/destination selector, item search, quantity validation, and live dispatch/receive status tracking.

#### [NEW] [`tests/warehouses-and-transfers.test.ts`](file:///d:/GRABBER%20POZ%20SOLO/tests/warehouses-and-transfers.test.ts)
- Test warehouse creation and branch linkage.
- Test transfer full lifecycle: `DRAFT` → `DISPATCH` (source deduction) → `RECEIVE` (destination addition + variance check).
- Test transfer cancellation and insufficient stock rejection.

---

### 3. Phase 3 — Client Onboarding Console (M7)

#### [NEW] [`src/app/onboarding/page.tsx`](file:///d:/GRABBER%20POZ%20SOLO/src/app/onboarding/page.tsx)
- Interactive 11-step wizard:
  1. Business Identity (Name, Legal Name, Currency, Timezone, Logo)
  2. Tax Profile (Standard VAT 18%, Zero-Rated, Exempt)
  3. Retail Branches (Main store setup)
  4. Warehouses (Central distribution hub)
  5. Staff Accounts & PINs (Owner, Cashier, Warehouse)
  6. Payment Methods (Cash, Card, WebXPay, PayHere, Stripe, Koko)
  7. Catalog Setup (Product import or starter template)
  8. Storefront & WhatsApp Configuration
  9. Counter Hardware & Printer Profile (80mm receipt headers)
  10. Test Commerce Transaction (Deterministic sandbox checkout)
  11. Production Certification Gate & Go-Live Activation

#### [NEW] [`src/app/api/onboarding/route.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/onboarding/route.ts)
- `GET`: Return current setup progress and step completion status.
- `POST`: Save step data, execute test transaction, and issue `CERTIFIED` status.

---

### 4. Phase 4–7 — Agent Control Plane & Preflight Engine

#### [NEW] [`src/lib/agents/control-plane.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/agents/control-plane.ts)
- Typed agent definitions:
  - `AgentAction` model: `actionId`, `agentId`, `tool`, `input`, `riskLevel`, `autonomyLevel`, `approvalStatus`, `executionStatus`, `result`, `error`, `correlationId`.
  - Risk classification: `READ` (L0), `LOW_RISK_WRITE` (L1/L2), `HIGH_RISK_WRITE` (L3 - Human Approval Required), `IRREVERSIBLE` (L5 - Forbidden for autonomous AI).
- Explicit Tool Contracts:
  - `get_inventory_balance` (READ, L0)
  - `search_products` (READ, L0)
  - `draft_stock_transfer` (LOW_RISK_WRITE, L2)
  - `draft_purchase_order` (LOW_RISK_WRITE, L2)
  - `execute_stock_transfer` (HIGH_RISK_WRITE, L3 - Approval Required)
  - `adjust_stock` (HIGH_RISK_WRITE, L3 - Approval Required)
  - `issue_refund` (HIGH_RISK_WRITE, L3 - Approval Required)

#### [NEW] [`src/lib/agents/preflight.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/agents/preflight.ts)
- Preflight evaluation engine:
  - **Identity**: Verify agent identity and requesting staff context.
  - **Authorization**: Validate agent role permissions.
  - **Scope**: Validate location (`branchId` / `warehouseId`) boundaries.
  - **Invariants**: Run commerce invariant checks before execution.
  - **Approval Check**: Halt execution and create approval ticket if `riskLevel === HIGH_RISK_WRITE`.
  - **Idempotency**: Block duplicate `actionId` or replay attempts.
  - **Execution Bridge**: Call canonical services (`stock-service.ts`, `checkout-repo.ts`, `transfer-workflow.ts`).
  - **Post-Verification**: Verify state change and write immutable `audit_logs` record.

---

### 5. Phase 8–9 — Agent Security Suite & Release Gate

#### [NEW] [`tests/agents/agent-security.test.ts`](file:///d:/GRABBER%20POZ%20SOLO/tests/agents/agent-security.test.ts)
- Comprehensive test suite attacking the agent control plane:
  - Reject prompt injection attempting raw SQL execution.
  - Reject high-risk inventory mutation without human approval.
  - Reject privilege escalation (agent trying to bypass cashier limit).
  - Verify idempotency on repeated action submissions.
  - Verify audit trail creation for all executed actions.

#### [NEW] [`scripts/release-gate-agent.mjs`](file:///d:/GRABBER%20POZ%20SOLO/scripts/release-gate-agent.mjs)
- Automated verification of Agent Invariants:
  - `AG-001`: Every agent tool has a formal input/output schema.
  - `AG-002`: Every write tool enforces authorization.
  - `AG-003`: Every high-risk write requires approval queue ticket.
  - `AG-004`: Zero arbitrary SQL execution.
  - `AG-005`: All mutations use canonical services.
  - `AG-006`: Every mutation emits an immutable audit log.
  - `AG-007`: Actions are strictly idempotent.
  - `AG-008`: Failed actions cleanly rollback.
  - `AG-009`: Prompt injections cannot bypass preflight.
  - `AG-010`: Agents cannot escalate privileges.
  - `AG-011`: Agents cannot modify immutable records (paid orders/journal entries).
  - `AG-012`: Agents preserve all 12 commerce invariants (CI-001 to CI-012).

---

## Verification Plan

### Automated Tests
```powershell
# 1. TypeCheck
npx tsc --noEmit

# 2. P0 Security Tests
npx vitest run tests/p0-security-hardening.test.ts

# 3. Warehouse & Transfer Tests
npx vitest run tests/warehouses-and-transfers.test.ts

# 4. Agent Security & Control Plane Tests
npx vitest run tests/agents/agent-security.test.ts

# 5. Full Release Gates (M3, M5, M6, AGENT)
npm run release:gate-m3
npm run release:gate-m5
npm run release:gate-m6
node scripts/release-gate-agent.mjs

# 6. Build Validation
npm run build
```

### Manual Verification
- Verify Warehouse CRUD via `/settings/warehouses`.
- Create staff account with `WAREHOUSE` role via `/settings/staff`.
- Execute inter-location stock transfer via `/inventory/transfer`.
- Step through the 11-step onboarding wizard at `/onboarding`.
- Verify Jarvis preflight approval queue in `/approvals`.
