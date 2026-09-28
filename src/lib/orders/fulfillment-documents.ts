import { eq } from 'drizzle-orm';
import {
  customers,
  deliveries,
  db,
  orderItems,
  orders,
  products,
  productVariants,
} from '@/db';
import type { FulfillmentOrderInput } from '@/lib/orders/fulfillment-pack';

export type FulfillmentDocumentKind = 'pick-list' | 'packing-slip' | 'delivery-note';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function loadFulfillmentOrder(orderNumber: string): Promise<FulfillmentOrderInput | null> {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;

  const [customer] = order.customerId
    ? await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    : [];
  const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, order.id)).limit(1);

  const rows = await db
    .select({
      productId: orderItems.productId,
      variantId: orderItems.variantId,
      quantity: orderItems.quantity,
      productName: products.name,
      productSku: products.sku,
      productBarcode: products.barcode,
      variantName: productVariants.name,
      variantSku: productVariants.sku,
      variantBarcode: productVariants.barcode,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .where(eq(orderItems.orderId, order.id));

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    channel: order.channel,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    customerName: customer?.name || 'Walk-in',
    customerPhone: customer?.phone || '',
    customerAddress: customer?.address || '',
    delivery: delivery
      ? {
          courierPartner: delivery.courierPartner,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
        }
      : null,
    lines: rows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      name: row.productName || 'Item',
      sku: row.variantSku || row.productSku || '',
      barcode: row.variantBarcode || row.productBarcode || row.variantSku || row.productSku || '',
      variant: row.variantName || '',
      quantity: Number(row.quantity || 0),
    })),
  };
}

export function renderFulfillmentDocument(kind: FulfillmentDocumentKind, order: FulfillmentOrderInput) {
  const title =
    kind === 'pick-list'
      ? 'Pick List'
      : kind === 'packing-slip'
        ? 'Packing Slip'
        : 'Delivery Note';
  const showAddress = kind === 'delivery-note' || kind === 'packing-slip';
  const showBarcode = kind === 'pick-list';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(order.orderNumber)}</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:820px;margin:24px auto;padding:16px;color:#111}
    header{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
    h1{font-size:24px;margin:0}.muted{color:#555;font-size:12px}.box{border:1px solid #ccc;border-radius:8px;padding:12px;margin:12px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
    th{background:#f5f5f5}.qty{font-weight:800;text-align:center;font-size:16px}.check{width:36px;text-align:center}
    footer{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.sign{border-top:1px solid #111;padding-top:8px;font-size:12px}
    @media print{button{display:none}body{margin:0;max-width:none}}
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p class="muted">Order ${escapeHtml(order.orderNumber)} · ${escapeHtml(order.channel)} · ${escapeHtml(order.fulfillmentStatus)}</p>
    </div>
    <button onclick="window.print()">Print</button>
  </header>
  <section class="box">
    <strong>${escapeHtml(order.customerName || 'Customer')}</strong><br />
    ${showAddress ? `${escapeHtml(order.customerPhone || '')}<br />${escapeHtml(order.customerAddress || '')}` : `Phone: ${escapeHtml(order.customerPhone || 'Not recorded')}`}
    ${order.delivery?.trackingNumber ? `<p class="muted">Tracking: ${escapeHtml(order.delivery.trackingNumber)} (${escapeHtml(order.delivery.courierPartner || 'Courier')})</p>` : ''}
  </section>
  <table>
    <thead>
      <tr>
        ${kind === 'pick-list' ? '<th class="check">✓</th>' : ''}
        <th>Item</th>
        <th>SKU</th>
        ${showBarcode ? '<th>Barcode</th>' : ''}
        <th class="qty">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${order.lines.map((line) => `<tr>
        ${kind === 'pick-list' ? '<td class="check">□</td>' : ''}
        <td><strong>${escapeHtml(line.name)}</strong>${line.variant ? `<br /><span class="muted">${escapeHtml(line.variant)}</span>` : ''}</td>
        <td>${escapeHtml(line.sku || '')}</td>
        ${showBarcode ? `<td>${escapeHtml(line.barcode || '')}</td>` : ''}
        <td class="qty">${escapeHtml(line.quantity)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <footer>
    <div class="sign">Prepared by</div>
    <div class="sign">${kind === 'delivery-note' ? 'Received by customer / courier' : 'Checked by'}</div>
  </footer>
</body>
</html>`;
}
