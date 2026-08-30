/**
 * GRABBER BUSINESS OS — DECOUPLED STATE MACHINE ENGINE
 * Distinct Order, Payment, and Fulfillment/Delivery Finite State Machines
 */

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type FulfillmentStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

export type OrderChannel =
  | 'POS'
  | 'STOREFRONT'
  | 'WHATSAPP'
  | 'JARVIS'
  | 'MANUAL'
  | 'IMPORT'
  | 'API';

export class InvalidStateTransitionError extends Error {
  constructor(domain: string, from: string, to: string) {
    super(`Invalid ${domain} state transition from "${from}" to "${to}".`);
    this.name = 'InvalidStateTransitionError';
  }
}

// 1. ORDER STATE TRANSITIONS
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'DELIVERED', 'CANCELLED'],
  PACKED: ['READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  CANCELLED: [],
  RETURNED: [],
};

// 2. PAYMENT STATE TRANSITIONS
const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['AUTHORIZED', 'PAID', 'FAILED'],
  AUTHORIZED: ['PAID', 'FAILED'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: ['PENDING', 'PAID'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
};

// 3. FULFILLMENT / DELIVERY TRANSITIONS
const VALID_FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  ASSIGNED: ['PICKED_UP', 'DELIVERED', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  FAILED: ['PENDING', 'ASSIGNED', 'RETURNED'],
  RETURNED: [],
};

export class StateMachineEngine {
  public static transitionOrder(current: OrderStatus, next: OrderStatus): OrderStatus {
    if (current === next) return next;
    const allowed = VALID_ORDER_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new InvalidStateTransitionError('Order', current, next);
    }
    return next;
  }

  public static transitionPayment(current: PaymentStatus, next: PaymentStatus): PaymentStatus {
    if (current === next) return next;
    const allowed = VALID_PAYMENT_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new InvalidStateTransitionError('Payment', current, next);
    }
    return next;
  }

  public static transitionFulfillment(current: FulfillmentStatus, next: FulfillmentStatus): FulfillmentStatus {
    if (current === next) return next;
    const allowed = VALID_FULFILLMENT_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new InvalidStateTransitionError('Fulfillment', current, next);
    }
    return next;
  }
}
