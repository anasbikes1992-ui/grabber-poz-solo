export type AutomationStepStatus = 'done' | 'ready' | 'pending' | 'blocked' | 'failed';

export type OrderAutomationInput = {
  orderId: string;
  orderNumber: string;
  channel: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotal: number;
  lineCount: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  paymentMethods?: string[];
  delivery?: {
    courierPartner?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
  } | null;
};

export type PersistedOrderAutomationEvent = {
  eventKey: string;
  label: string;
  status: string;
  detail?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
};

export type OrderAutomationStep = {
  key: string;
  label: string;
  status: AutomationStepStatus;
  detail: string;
  actionHref?: string;
};

const DONE_FULFILLMENT = new Set(['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']);
const READY_ORDER_STATUSES = new Set(['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP', 'SHIPPED']);

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase();
}

function hasUsablePhone(phone: string | null | undefined) {
  return String(phone || '').replace(/\D/g, '').length >= 9;
}

function overlayPersistedStatus(
  step: OrderAutomationStep,
  eventsByKey: Map<string, PersistedOrderAutomationEvent>,
): OrderAutomationStep {
  const event = eventsByKey.get(step.key);
  if (!event) return step;
  const status = normalize(event.status);
  if (status === 'DONE' || status === 'SUCCESS') return { ...step, status: 'done' };
  if (status === 'FAILED') return { ...step, status: 'failed', detail: `${step.detail} Last run failed.` };
  if (status === 'READY') return { ...step, status: 'ready' };
  if (status === 'BLOCKED') return { ...step, status: 'blocked' };
  return step;
}

export function buildOrderAutomationTimeline(
  input: OrderAutomationInput,
  persistedEvents: PersistedOrderAutomationEvent[] = [],
): OrderAutomationStep[] {
  const orderStatus = normalize(input.orderStatus);
  const paymentStatus = normalize(input.paymentStatus);
  const fulfillmentStatus = normalize(input.fulfillmentStatus);
  const channel = normalize(input.channel);
  const paid = paymentStatus === 'PAID' || paymentStatus === 'AUTHORIZED';
  const codPending = input.paymentMethods?.some((m) => normalize(m) === 'COD') && paymentStatus === 'PENDING';
  const hasItems = input.lineCount > 0;
  const hasDelivery = Boolean(input.delivery?.trackingNumber || input.delivery?.courierPartner);
  const canContact = hasUsablePhone(input.customerPhone);
  const hasAddress = Boolean(String(input.customerAddress || '').trim());

  const eventsByKey = new Map(persistedEvents.map((event) => [event.eventKey, event]));
  const steps: OrderAutomationStep[] = [
    {
      key: 'order_created',
      label: 'Order captured',
      status: orderStatus === 'DRAFT' ? 'pending' : 'done',
      detail: `${input.orderNumber} from ${channel || 'UNKNOWN'} for LKR ${input.grandTotal.toLocaleString('en-LK')}.`,
    },
    {
      key: 'invoice_ready',
      label: 'Tax invoice ready',
      status: orderStatus === 'DRAFT' || !hasItems ? 'blocked' : 'done',
      detail: hasItems ? 'Invoice can be printed or shared from the canonical order lines.' : 'Order has no item lines.',
      actionHref: `/api/orders/${encodeURIComponent(input.orderNumber)}/invoice`,
    },
    {
      key: 'stock_posted',
      label: 'Stock posted',
      status: hasItems && orderStatus !== 'DRAFT' ? 'done' : 'blocked',
      detail: hasItems ? 'Checkout/stock flows have order lines to reconcile against the stock ledger.' : 'No order lines found for stock posting.',
    },
    {
      key: 'ledger_posted',
      label: 'Books posted',
      status: paid || codPending ? 'done' : 'pending',
      detail: paid
        ? 'Paid order is ready for sales, tax, and settlement reporting.'
        : codPending
          ? 'COD order is posted with cash collection pending at delivery.'
          : 'Payment is not yet captured.',
    },
    {
      key: 'receipt_send',
      label: 'Receipt message',
      status: canContact ? 'ready' : 'blocked',
      detail: canContact ? 'Customer has a usable phone number for WhatsApp/SMS receipt.' : 'Customer phone is missing or too short.',
    },
    {
      key: 'pick_pack',
      label: 'Pick and pack',
      status: DONE_FULFILLMENT.has(fulfillmentStatus)
        ? 'done'
        : READY_ORDER_STATUSES.has(orderStatus)
          ? 'ready'
          : 'pending',
      detail: 'Pick list and packing slip can be generated from order item lines.',
    },
    {
      key: 'delivery_dispatch',
      label: 'Delivery dispatch',
      status: hasDelivery || DONE_FULFILLMENT.has(fulfillmentStatus)
        ? 'done'
        : channel === 'STOREFRONT' && canContact && hasAddress
          ? 'ready'
          : channel === 'STOREFRONT'
            ? 'blocked'
            : 'pending',
      detail: hasDelivery
        ? `Delivery assigned to ${input.delivery?.courierPartner || 'courier'}${input.delivery?.trackingNumber ? ` (${input.delivery.trackingNumber})` : ''}.`
        : channel === 'STOREFRONT'
          ? 'Storefront delivery needs customer phone and address before dispatch.'
          : 'Delivery is optional for counter/manual orders.',
    },
    {
      key: 'bank_match',
      label: 'Bank match',
      status: paid && !codPending ? 'ready' : 'pending',
      detail: paid && !codPending ? 'Ready to match against bank feed or gateway settlement.' : 'Waiting for paid non-COD settlement.',
    },
    {
      key: 'review_request',
      label: 'Review request',
      status: fulfillmentStatus === 'DELIVERED' && canContact ? 'ready' : 'pending',
      detail: fulfillmentStatus === 'DELIVERED'
        ? 'Ready to schedule post-delivery review request.'
        : 'Review request waits until delivery is complete.',
    },
  ];

  return steps.map((step) => overlayPersistedStatus(step, eventsByKey));
}

export function summarizeOrderAutomationTimeline(steps: OrderAutomationStep[]) {
  return {
    total: steps.length,
    done: steps.filter((s) => s.status === 'done').length,
    ready: steps.filter((s) => s.status === 'ready').length,
    pending: steps.filter((s) => s.status === 'pending').length,
    blocked: steps.filter((s) => s.status === 'blocked').length,
    failed: steps.filter((s) => s.status === 'failed').length,
  };
}
