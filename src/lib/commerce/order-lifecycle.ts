/**
 * Unified order lifecycle — single source for checkout + admin transitions.
 */
import type { OrderChannel } from './order-state-machine';
import {
  StateMachineEngine,
  type FulfillmentStatus,
  type OrderStatus,
  type PaymentStatus,
} from './order-state-machine';

export type CheckoutPaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'CREDIT'
  | 'COD'
  | 'PAYHERE'
  | 'WEBXPAY'
  | 'STRIPE';

export type CheckoutStatuses = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  /** Whether to decrement stock immediately at checkout */
  decrementStock: boolean;
};

/** Statuses applied when an order is first created at checkout. */
export function resolveCheckoutStatuses(
  channel: OrderChannel | undefined,
  paymentMethod: CheckoutPaymentMethod,
  isSplit = false,
): CheckoutStatuses {
  const ch = channel || 'POS';

  if (ch === 'STOREFRONT' || ch === 'WHATSAPP') {
    if (paymentMethod === 'COD') {
      return {
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'PENDING',
        decrementStock: true,
      };
    }
    return {
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'ASSIGNED',
      decrementStock: true,
    };
  }

  // POS / in-person — immediate completion
  if (paymentMethod === 'CREDIT') {
    return {
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'DELIVERED',
      decrementStock: true,
    };
  }

  if (isSplit || paymentMethod === 'CASH' || paymentMethod === 'CARD') {
    return {
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'DELIVERED',
      decrementStock: true,
    };
  }

  return {
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'DELIVERED',
    decrementStock: true,
  };
}

export type OrderTransitionInput = {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
};

export function applyOrderTransitions(
  current: { orderStatus: OrderStatus; paymentStatus: PaymentStatus; fulfillmentStatus: FulfillmentStatus },
  next: OrderTransitionInput,
) {
  return {
    orderStatus: next.orderStatus
      ? StateMachineEngine.transitionOrder(current.orderStatus, next.orderStatus)
      : current.orderStatus,
    paymentStatus: next.paymentStatus
      ? StateMachineEngine.transitionPayment(current.paymentStatus, next.paymentStatus)
      : current.paymentStatus,
    fulfillmentStatus: next.fulfillmentStatus
      ? StateMachineEngine.transitionFulfillment(current.fulfillmentStatus, next.fulfillmentStatus)
      : current.fulfillmentStatus,
  };
}

/** Admin-friendly presets aligned with master doc §17 */
export const ORDER_STATUS_PRESETS: Record<string, OrderTransitionInput> = {
  confirm: { orderStatus: 'CONFIRMED' },
  process: { orderStatus: 'PROCESSING', fulfillmentStatus: 'ASSIGNED' },
  ready: { orderStatus: 'PACKED', fulfillmentStatus: 'OUT_FOR_DELIVERY' },
  ship: { orderStatus: 'SHIPPED', fulfillmentStatus: 'IN_TRANSIT' },
  deliver: { orderStatus: 'DELIVERED', paymentStatus: 'PAID', fulfillmentStatus: 'DELIVERED' },
  cancel: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED', fulfillmentStatus: 'FAILED' },
  mark_paid: { paymentStatus: 'PAID' },
};

export function displayOrderStatus(status: OrderStatus): string {
  return status.replace(/_/g, ' ');
}
