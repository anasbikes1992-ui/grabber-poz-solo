# GRABBER BUSINESS OS — CANONICAL COMMERCE ENGINE SPECIFICATION
**Shared Business Service Layer for POS, Storefront, WhatsApp & Jarvis**

---

## 1. Unified Service Layer Architecture

The commerce engine is the single source of truth for all commerce transactions. No channel (POS, Storefront, WhatsApp, or Jarvis) interacts with the database directly for commerce logic.

```
       POS COUNTER      STOREFRONT WEB      WHATSAPP HOTLINE      JARVIS COPILOT
            │                  │                    │                    │
            └───────────┬──────┴────────────┬───────┴────────────────────┘
                        │                   │
                        ▼                   ▼
           ┌────────────────────────────────────────────────┐
           │            CANONICAL COMMERCE CORE             │
           │                                                │
           │  • TaxEngine (Effective-dated Tax Profiles)    │
           │  • PricingEngine (Prices, Discounts, Totals)   │
           │  • StockReservationEngine (Reserve / Release)  │
           │  • InventoryMovementLedger (Immutable History) │
           │  • OrderStateMachine (Decoupled 3D States)     │
           │  • PaymentEngine (Multi-tender & Webhooks)     │
           │  • CreditEngine (Polim Potha AR & Aging)       │
           │  • AccountingEngine (Double-Entry Posting)     │
           │  • PurchasingEngine (PO, GRN, Supplier AP)     │
           └────────────────────────┬───────────────────────┘
                                    │
                                    ▼
                         POSTGRESQL RELATIONAL DB
```

---

## 2. Core Service Contracts

### 2.1 TaxEngine & Dynamic PricingEngine
```ts
export interface TaxResolutionContext {
  taxProfileId: string;
  transactionDate: Date;
  customerExemptStatus?: boolean;
}

export interface CartItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  discountAmount?: number;
  fulfillmentLocationId?: string;
}

export interface PricingResult {
  lines: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    lineDiscount: number;
    taxRatePercentage: number;
    lineTax: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxBreakdown: Record<string, { name: string; rate: number; amount: number }>;
  grandTotal: number;
}
```

### 2.2 Inventory Reservation & Immutable Stock Movement Engine
```ts
export interface StockState {
  onHand: number;
  reserved: number;
  available: number; // onHand - reserved
}

// Phase 1: Order Placement -> Reserve Stock
export async function reserveStock(params: {
  locationType: 'BRANCH' | 'WAREHOUSE';
  locationId: string;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  orderId: string;
  actorId: string;
}): Promise<void>;

// Phase 2: Order Cancellation -> Release Reservation
export async function releaseStockReservation(params: {
  locationType: 'BRANCH' | 'WAREHOUSE';
  locationId: string;
  orderId: string;
  actorId: string;
}): Promise<void>;

// Phase 3: Fulfillment -> Commit Stock Movement & Decrement On-Hand
export async function commitStockMovement(params: {
  locationType: 'BRANCH' | 'WAREHOUSE';
  locationId: string;
  productId: string;
  variantId?: string;
  type: 'TRANSFER_OUT' | 'TRANSFER_IN' | 'SALE' | 'RETURN' | 'PURCHASE_RECEIPT' | 'ADJUSTMENT' | 'DAMAGE';
  delta: number;
  unitCost?: number;
  referenceType: 'ORDER' | 'PURCHASE_ORDER' | 'TRANSFER' | 'ADJUSTMENT';
  referenceId: string;
  actorId: string;
  notes?: string;
}): Promise<StockState>;
```

### 2.3 Decoupled State Machines

#### 1. Order State Machine
```text
DRAFT ──► CONFIRMED ──► PROCESSING ──► PACKED ──► READY_FOR_PICKUP ──► SHIPPED ──► DELIVERED
  │           │                                                                 │
  ▼           ▼                                                                 ▼
CANCELLED   CANCELLED                                                  RETURN_REQUESTED ──► RETURNED
```

#### 2. Payment State Machine
```text
PENDING ──► AUTHORIZED ──► PAID
   │                       │
   ▼                       ▼
 FAILED          PARTIALLY_REFUNDED / REFUNDED
```

#### 3. Fulfillment / Delivery State Machine
```text
PENDING ──► ASSIGNED ──► PICKED_UP ──► IN_TRANSIT ──► OUT_FOR_DELIVERY ──► DELIVERED
   │                                                        │
   ▼                                                        ▼
CANCELLED                                            FAILED ──► RETURNED
```

### 2.4 CreditEngine (Polim Potha Customer AR)
```ts
export interface CreditApprovalRequest {
  customerId: string;
  saleAmount: number;
  authorizingUserId: string;
}

export interface CreditApprovalResult {
  approved: boolean;
  requiresManagerOverride: boolean;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  agingSummary: {
    days0to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
}
```
