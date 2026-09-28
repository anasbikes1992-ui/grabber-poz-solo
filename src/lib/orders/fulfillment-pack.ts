export type FulfillmentLine = {
  productId: string;
  variantId?: string | null;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  variant?: string | null;
  quantity: number;
};

export type FulfillmentOrderInput = {
  orderId: string;
  orderNumber: string;
  channel: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lines: FulfillmentLine[];
  delivery?: {
    courierPartner?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
  } | null;
};

export type FulfillmentReadinessStatus = 'ready' | 'done' | 'blocked' | 'pending';

export type FulfillmentWorkStep = {
  key: 'pick_list' | 'packing_slip' | 'delivery_note' | 'courier_manifest' | 'barcode_labels';
  label: string;
  status: FulfillmentReadinessStatus;
  detail: string;
  href?: string;
};

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase();
}

function hasPhone(phone: string | null | undefined) {
  return String(phone || '').replace(/\D/g, '').length >= 9;
}

export function buildFulfillmentWorkSteps(order: FulfillmentOrderInput): FulfillmentWorkStep[] {
  const fulfillment = normalize(order.fulfillmentStatus);
  const channel = normalize(order.channel);
  const hasLines = order.lines.length > 0;
  const hasContact = hasPhone(order.customerPhone);
  const hasAddress = Boolean(String(order.customerAddress || '').trim());
  const dispatched = Boolean(order.delivery?.trackingNumber || ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(fulfillment));
  const delivered = fulfillment === 'DELIVERED';

  return [
    {
      key: 'pick_list',
      label: 'Pick list',
      status: hasLines ? (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(fulfillment) ? 'done' : 'ready') : 'blocked',
      detail: hasLines ? `${order.lines.length} line(s) available for warehouse picking.` : 'Order has no item lines to pick.',
      href: `/api/orders/${encodeURIComponent(order.orderNumber)}/pick-list`,
    },
    {
      key: 'packing_slip',
      label: 'Packing slip',
      status: hasLines ? (dispatched || delivered ? 'done' : 'ready') : 'blocked',
      detail: hasLines ? 'Packing slip can travel inside the parcel without price emphasis.' : 'Order has no item lines to pack.',
      href: `/api/orders/${encodeURIComponent(order.orderNumber)}/packing-slip`,
    },
    {
      key: 'delivery_note',
      label: 'Delivery note',
      status: channel === 'STOREFRONT'
        ? hasContact && hasAddress
          ? dispatched || delivered
            ? 'done'
            : 'ready'
          : 'blocked'
        : 'pending',
      detail: channel === 'STOREFRONT'
        ? hasContact && hasAddress
          ? 'Customer contact and address are ready for courier handover.'
          : 'Storefront delivery needs customer phone and address.'
        : 'Delivery note is optional for non-storefront orders.',
      href: `/api/orders/${encodeURIComponent(order.orderNumber)}/delivery-note`,
    },
    {
      key: 'courier_manifest',
      label: 'Courier manifest',
      status: dispatched || delivered ? 'done' : channel === 'STOREFRONT' && hasContact && hasAddress ? 'ready' : 'pending',
      detail: dispatched
        ? `Courier handover exists${order.delivery?.trackingNumber ? `: ${order.delivery.trackingNumber}` : ''}.`
        : 'Ready orders can be grouped into a courier manifest queue.',
    },
    {
      key: 'barcode_labels',
      label: 'Barcode labels',
      status: hasLines ? 'ready' : 'blocked',
      detail: hasLines ? 'Order lines can seed barcode labels for items needing stickers before packing.' : 'No order lines available for label queue.',
    },
  ];
}

export function buildBarcodeQueueSeed(order: FulfillmentOrderInput) {
  return order.lines
    .filter((line) => line.productId && line.quantity > 0)
    .map((line) => ({
      sourceType: 'ORDER',
      sourceId: order.orderNumber,
      productId: line.productId,
      variantId: line.variantId || null,
      quantity: Math.max(1, Math.round(line.quantity)),
      detailJson: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        name: line.name,
        sku: line.sku || '',
        barcode: line.barcode || line.sku || '',
        variant: line.variant || '',
      },
    }));
}

export function summarizeFulfillmentWork(steps: FulfillmentWorkStep[]) {
  return {
    total: steps.length,
    ready: steps.filter((s) => s.status === 'ready').length,
    done: steps.filter((s) => s.status === 'done').length,
    blocked: steps.filter((s) => s.status === 'blocked').length,
    pending: steps.filter((s) => s.status === 'pending').length,
  };
}
