# GRABBER BUSINESS OS — RESILIENCE & FAILURE SCENARIO MATRIX

Every client instance is stress-tested against the following real-world edge cases to guarantee data integrity, double-entry balance, and financial conservation.

---

## 1. Commerce & Concurrency Failures

| Failure Scenario | Threat / Root Cause | Expected Safe Behavior | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Double-Click Checkout** | Cashier double-taps "Pay" or network latency causes twin POST requests. | Idempotency Key (`idempotency_key` or `order_number`) deduplicates; exactly **1 order, 1 stock deduction, 1 journal**. | Single transactional state |
| **Concurrent Last-Unit Sale** | 2 terminals simultaneously attempt to sell the last item on hand (`on_hand = 1`). | Database atomic update (`WHERE on_hand >= quantity`) succeeds for the first terminal, fails with `INSUFFICIENT_STOCK` for the second. | Stock non-negativity ($\text{OnHand} \ge 0$) |
| **Browser Refresh During Sale** | Network drop or tab crash mid-checkout. | Wrapped in atomic DB transaction (`BEGIN ... COMMIT`). Either full order + GL commit or complete rollback. | Zero orphan orders |

---

## 2. External Integration & Webhook Failures

| Failure Scenario | Threat / Root Cause | Expected Safe Behavior | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Duplicate Payment Webhook** | PayHere / Stripe fires multiple `PAYMENT_SUCCESS` retries for one transaction. | Unique index on `webhook_events(provider, provider_event_id)` catches duplicate; records as processed without re-crediting cash or inventory. | Idempotent settlements |
| **Payment Gateway Timeout** | Payment gateway times out after order initiation. | Order remains in `PAYMENT_PENDING` with temporary stock reservation; auto-expires if not paid within TTL. | Stock recovery on timeout |
| **Courier API Downtime** | Koombiyo / Domex API is unreachable during dispatch. | Order state transitions to `DISPATCH_QUEUED` with exponential retry backoff; in-house manual override option remains active. | Non-blocking dispatch |

---

## 3. Financial & Accounting Anomalies

| Failure Scenario | Threat / Root Cause | Expected Safe Behavior | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Asymmetrical Journal Entry** | Software bug attempts to insert debit of 1,000 without balancing 1,000 credit. | Database foreign key and transaction validator blocks insertion and rolls back. | $\sum \text{Debits} = \sum \text{Credits}$ |
| **Unauthorized Negative AR** | Customer repayment exceeds total outstanding debt. | Validation constraint flags overpayment as a customer credit deposit, preventing negative debt. | $\text{AR} \ge 0$ |
| **Return Without Original Sale** | Attempted return of unrecorded item or quantity greater than sold. | Return engine checks original `order_items` reference; flags unauthorized return for Manager PIN override. | Valid return lineage |
