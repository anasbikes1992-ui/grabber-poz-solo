# M4 PAYMENT GATEWAY ADAPTER FRAMEWORK REPORT

**Release Milestone:** M4 — Payment Gateway Adapter Framework  
**Date:** 2026-09-03  
**Status:** 🟢 **FRAMEWORK COMPLETE & REGRESSION VERIFIED**  
**Preceding Milestone:** M3 Commerce Integrity (CERTIFIED & FROZEN)  

---

## 1. Architecture Overview

The Payment Gateway Adapter Framework integrates provider-specific payment channels cleanly around the **already-certified M3 canonical commerce engine**. No payment gateway directly mutates inventory, pricing, tax, discounts, COGS, GL journals, or customer credit ledgers.

```text
                     CANONICAL CHECKOUT / STOREFRONT
                                    │
                                    ▼
                             PAYMENT SERVICE
                                    │
       ┌───────────┬───────────┬────┴──────┬───────────┬───────────┐
       ▼           ▼           ▼           ▼           ▼           ▼
      COD       PayHere     WebXPay      Koko       Mintpay     Payzy
       │           │           │           │           │           │
       └───────────┴───────────┴────┬──────┴───────────┴───────────┘
                                    ▼
                         CANONICAL PAYMENT LIFECYCLE
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
            ORDER                 STOCK                  GL
                                                          │
                                                          ▼
                                                   CUSTOMER LEDGER
```

---

## 2. Gateway Contract & Interfaces

All adapters implement the unified `PaymentGateway` interface in [`src/lib/payments/payment-gateway.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/payment-gateway.ts):

* `readonly id: PaymentGatewayId` (`'COD' | 'PAYHERE' | 'WEBXPAY' | 'KOKO' | 'MINTPAY' | 'PAYZY'`)
* `capabilities(): PaymentGatewayCapabilities`
* `isConfigured(): boolean`
* `createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>`
* `getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult>`
* `verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPaymentEvent>`
* `handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult>`
* `refund?(input: RefundPaymentInput): Promise<RefundResult>`
* `cancel?(input: CancelPaymentInput): Promise<CancelPaymentResult>`

---

## 3. Gateway Capabilities Matrix

| Capability | COD | PayHere | WebXPay | Koko | Mintpay | Payzy |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Supports Online Payment** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Supports Redirect** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Supports Webhook Callback** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Supports Refund API** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Supports Cancellation API** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Supports Partial Refund** | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ |
| **Supports COD / Cash** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Supports POS In-Store** | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| **Supports Storefront** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Currencies** | LKR | LKR, USD | LKR, USD | LKR | LKR | LKR |

---

## 4. Provider Implementation Summary

1. **COD (`src/lib/payments/cod/`):** Native payment handler. POS counter sales are marked `CAPTURED` immediately; Storefront COD orders remain `PENDING` until delivery completion. Order cancellation restores stock with zero fake cash disbursement.
2. **PayHere (`src/lib/payments/payhere/`):** Unified into the adapter contract without breaking existing routes. Handles MD5 signature calculation and verification (`MD5(merchant + order + amount + currency + status + MD5(secret))`), status code mapping, and duplicate replay defense.
3. **WebXPay (`src/lib/payments/webxpay/`):** Sri Lanka credit/debit card and LankaQR gateway adapter. Redirects to WebXPay secure payment window and verifies callback signatures.
4. **Koko BNPL (`src/lib/payments/koko/`):** Sri Lanka 3-installment BNPL. Supports both online checkout and in-store POS merchant checkout. Validates HMAC-SHA256 callback signatures.
5. **Mintpay BNPL (`src/lib/payments/mintpay/`):** Sri Lanka 3-installment interest-free BNPL. Supports online and POS merchant scanning; merchant is paid in full upfront. Validates `X-Mintpay-Signature`.
6. **Payzy (`src/lib/payments/payzy/`):** Dialog / ADL installment and digital checkout solution with Custom Web integration and HMAC webhook verification.

---

## 5. Security & Secret Management

* **No Secret Leaks:** Private gateway secrets (`payhereSecret`, `webxpaySecret`, `kokoApiSecret`, `mintpayApiSecret`, `payzyAppSecret`) are strictly server-only. They are never exposed via `NEXT_PUBLIC_*`, local storage, client bundles, error logs, or public API endpoints.
* **Encrypted at Rest:** Stored in `business_config.config_json.encryptedSecrets` using AES-256-GCM via `encryptSecret()`.
* **Owner Management UI Route:** `GET/POST /api/settings/payments` provides secure configuration with secret masking (`••••••••••••`).
* **Client Method Discovery:** `GET /api/payments/methods` returns only enabled and configured gateways filtered by channel (POS vs Storefront) with zero sensitive data.

---

## 6. Financial Reconciliation & Invariant Preservation

* **Amount Authority:** The browser never determines the final payment amount. Payment amounts passed to adapters are derived strictly from authoritative catalog pricing.
* **Callback Reconcilation:** If a gateway callback reports an amount differing by more than LKR 0.01 from the authoritative expected total, it is rejected with `PaymentAmountMismatchError(400)`.
* **Balanced GL:** Captured payments map to balanced double-entry accounting (`Dr 1010 Cash` for Cash/COD, `Dr 1020 Bank` for Card/Online/BNPL).

---

## 7. Automated Test & Regression Evidence

* **TypeScript Compilation:** `npx tsc --noEmit` $\rightarrow$ Exit code 0 (Zero errors)
* **Vitest Suite:** **44 test files, 330/330 tests passing (100% green)**
* **M3 Release Gate:** `npm run release:gate-m3` $\rightarrow$ PASS (118/118 assertions green)
* **Auth Coverage:** `npm run auth:coverage` $\rightarrow$ 102/102 endpoints classified (PASS)
* **Git Diff Check:** `git diff --check` $\rightarrow$ Clean
* **Working Tree State:** `Clean (Committed & Tagged v4.0.0-m4)`

---

## 8. Provider Certification Status Table

| Provider | Adapter Built | Contract Tests | Sandbox Verification | Live Verification | Operational Status |
|:---|:---:|:---:|:---:|:---:|:---|
| **COD** | ✓ | ✓ | N/A | ✓ | 🟢 **Production Ready** |
| **PayHere** | ✓ | ✓ | ✓ | ✓ | 🟢 **Existing / Regression Certified** |
| **WebXPay** | ✓ | ✓ | ⏳ | ⏳ | 🟡 **Implemented / Sandbox Verification Pending** |
| **Koko** | ✓ | ✓ | ⏳ | ⏳ | 🟡 **Implemented / Sandbox Verification Pending** |
| **Mintpay** | ✓ | ✓ | ⏳ | ⏳ | 🟡 **Implemented / Sandbox Verification Pending** |
| **Payzy** | ✓ | ✓ | ⏳ | ⏳ | 🟡 **Implemented / Sandbox Verification Pending** |

---

## 9. Production-Route Trace Verification

The following trace verifies end-to-end wiring from storefront/POS through checkout to settlement:

```text
Storefront / POS
       ↓
Create Order (Authoritative Server Pricing)
       ↓
Select Payment Method
       ↓
PaymentService.createPayment()
       ↓
Gateway Adapter (COD / PayHere / WebXPay / Koko / Mintpay / Payzy)
       ↓
Provider Callback / Webhook
       ↓
verifyCallback() [HMAC / MD5 Signature]
       ↓
Payment Lifecycle (auditPaymentIdentity)
       ↓
Order Status Updated (PAID)
       ↓
Stock Relieved (recordSale)
       ↓
GL Double-Entry Journal Posted (Dr Bank/Cash, Cr Revenue, Cr Tax, Cr Inventory)
```

### Trace Checklist:
1. **PayHere existing production flow preserved:** `/api/payments/payhere/init` and `/api/webhooks/payhere` remain active, pass signature validation, and handle order settlement without bypass.
2. **Dynamic method exposure:** `/api/payments/methods` queries server configuration and strictly exposes enabled/configured methods per channel (POS vs Storefront).
3. **No client amount authority:** Browser cannot submit arbitrary payment amounts. Amounts passed to gateways are derived strictly from catalog prices.
4. **POS method gating:** POS cannot select payment methods that lack in-store capability (`supportsPOS === false`) or are marked disabled.
5. **Authoritative amount comparison:** Callback amounts are compared against authoritative expected order total; deviation $>0.01$ LKR throws `PaymentAmountMismatchError`.
6. **Idempotent duplicate callbacks:** Duplicate callbacks with existing `providerRef` return duplicate status without double-crediting or duplicate stock relief.
7. **Captured payments cannot be re-captured:** Payment state machine prevents transitioning already `CAPTURED` orders to newly captured states.
8. **Compensating refund journals:** Refunds create balancing compensating journals (`Dr 4000 Revenue, Cr 1020 Bank`) without mutating historical sale journal rows.
9. **Failed payment stock safety:** Failed or rejected payment attempts never trigger stock consumption or journal posting.
10. **Zero secret leakage:** `GET /api/settings/secrets` and `GET /api/settings/payments` never return plaintext keys; only masked previews (`••••••••`) or ciphertext hashes.
11. **Client component isolation:** Gateway credentials (`appSecret`, `merchantSecret`, `apiKey`) are never serialized to client components or `NEXT_PUBLIC_*` variables.
12. **Gateway disable enforcement:** Disabling a gateway in settings immediately filters it out of `/api/payments/methods` and blocks payment creation.
