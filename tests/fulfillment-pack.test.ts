import { describe, expect, it } from 'vitest';
import {
  buildBarcodeQueueSeed,
  buildFulfillmentWorkSteps,
  summarizeFulfillmentWork,
} from '../src/lib/orders/fulfillment-pack';

const storefrontOrder = {
  orderId: 'order-1',
  orderNumber: 'ORD-2001',
  channel: 'STOREFRONT',
  orderStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  fulfillmentStatus: 'PENDING',
  customerName: 'Kasun',
  customerPhone: '0771234567',
  customerAddress: 'Colombo',
  lines: [
    {
      productId: 'prod-1',
      variantId: 'var-1',
      name: 'Birthday Balloon Pack',
      sku: 'BAL-001-MIX',
      barcode: '479000001',
      variant: 'Mixed',
      quantity: 2,
    },
  ],
};

describe('fulfillment pack', () => {
  it('marks pick list, packing slip, delivery note, manifest, and labels ready for complete storefront orders', () => {
    const steps = buildFulfillmentWorkSteps(storefrontOrder);
    const summary = summarizeFulfillmentWork(steps);

    expect(steps.map((s) => [s.key, s.status])).toEqual([
      ['pick_list', 'ready'],
      ['packing_slip', 'ready'],
      ['delivery_note', 'ready'],
      ['courier_manifest', 'ready'],
      ['barcode_labels', 'ready'],
    ]);
    expect(summary.ready).toBe(5);
    expect(summary.blocked).toBe(0);
  });

  it('blocks delivery note when storefront order lacks contact details', () => {
    const steps = buildFulfillmentWorkSteps({
      ...storefrontOrder,
      customerPhone: '',
      customerAddress: '',
    });

    expect(steps.find((step) => step.key === 'delivery_note')?.status).toBe('blocked');
    expect(steps.find((step) => step.key === 'courier_manifest')?.status).toBe('pending');
  });

  it('builds idempotent barcode label queue seed rows from order lines', () => {
    const seed = buildBarcodeQueueSeed(storefrontOrder);

    expect(seed).toHaveLength(1);
    expect(seed[0]).toMatchObject({
      sourceType: 'ORDER',
      sourceId: 'ORD-2001',
      productId: 'prod-1',
      variantId: 'var-1',
      quantity: 2,
    });
    expect(seed[0].detailJson).toMatchObject({
      orderNumber: 'ORD-2001',
      sku: 'BAL-001-MIX',
      barcode: '479000001',
    });
  });
});
