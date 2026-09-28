import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  customerCommunicationEvents,
  customerMetrics,
  customers,
  db,
  deliveries,
  jobOutbox,
  orderAutomationEvents,
  orders,
  payments,
} from '@/db';
import { readBusinessProfile, readConfigJson } from '@/lib/config/business-settings';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';

export type CommunicationEventType = 'ORDER_RECEIPT' | 'REVIEW_REQUEST' | 'DAILY_OWNER_SUMMARY';

export type CustomerMetricInputOrder = {
  id: string;
  grandTotal: string | number;
  createdAt: Date | string;
  channel?: string | null;
};

export function moneyLkr(value: string | number) {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildCommunicationIdempotencyKey(type: CommunicationEventType | string, scope: string, dateKey?: string) {
  return [type, scope, dateKey].filter(Boolean).join(':').toLowerCase();
}

export function calculateCustomerMetrics(inputOrders: CustomerMetricInputOrder[]) {
  const sorted = [...inputOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lifetimeSpend = inputOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const lastOrder = sorted[0] || null;
  return {
    lifetimeSpend: lifetimeSpend.toFixed(2),
    orderCount: inputOrders.length,
    lastOrderId: lastOrder?.id ?? null,
    lastOrderAt: lastOrder ? new Date(lastOrder.createdAt) : null,
    lastChannel: lastOrder?.channel ?? null,
  };
}

export function buildReceiptMessage(input: {
  storeName: string;
  orderNumber: string;
  customerName?: string | null;
  grandTotal: string | number;
  trackingUrl?: string | null;
}) {
  const name = input.customerName?.trim() || 'there';
  const lines = [
    `Hi ${name}, thanks for shopping with ${input.storeName}.`,
    `Receipt ${input.orderNumber}: ${moneyLkr(input.grandTotal)}.`,
  ];
  if (input.trackingUrl) lines.push(`Track your order: ${input.trackingUrl}`);
  lines.push('Reply here if you need help.');
  return lines.join('\n');
}

export function buildReviewRequestMessage(input: {
  storeName: string;
  orderNumber: string;
  customerName?: string | null;
  reviewUrl: string;
}) {
  const name = input.customerName?.trim() || 'there';
  return [
    `Hi ${name}, hope your ${input.storeName} order ${input.orderNumber} arrived well.`,
    `Could you share a quick review? ${input.reviewUrl}`,
    'Your feedback helps us serve you better.',
  ].join('\n');
}

export function buildDailyOwnerSummary(input: {
  storeName: string;
  dateLabel: string;
  ordersCount: number;
  salesTotal: string | number;
  pendingDispatch: number;
  pendingCod: number;
  failedJobs: number;
}) {
  return [
    `${input.storeName} daily summary - ${input.dateLabel}`,
    `Sales: ${moneyLkr(input.salesTotal)} from ${input.ordersCount} orders.`,
    `Pending dispatch: ${input.pendingDispatch}. Pending COD: ${input.pendingCod}.`,
    `Dead/retry jobs needing attention: ${input.failedJobs}.`,
  ].join('\n');
}

async function getStoreName() {
  const profile = await readBusinessProfile().catch(() => null);
  return profile?.name || process.env.NEXT_PUBLIC_STORE_NAME || process.env.STORE_NAME || 'Grabber Business';
}

async function getBaseUrl() {
  const cfg: Record<string, unknown> = await readConfigJson().catch(() => ({}));
  const configured = String(cfg.publicBaseUrl || cfg.storefrontUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  return configured.replace(/\/$/, '') || 'https://grabberpoz.com';
}

function providerMessageId(result: Awaited<ReturnType<typeof sendWhatsAppText>>) {
  return result.success && 'messageId' in result ? result.messageId : undefined;
}

export async function recordCommunicationEvent(input: {
  eventType: CommunicationEventType;
  idempotencyKey: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  channel?: string;
  orderId?: string | null;
  customerId?: string | null;
  toAddress?: string | null;
  messagePreview?: string | null;
  providerRef?: string | null;
  detailJson?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(customerCommunicationEvents)
    .values({
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      channel: input.channel || 'WHATSAPP',
      orderId: input.orderId || null,
      customerId: input.customerId || null,
      toAddress: input.toAddress || null,
      messagePreview: input.messagePreview ? input.messagePreview.slice(0, 500) : null,
      providerRef: input.providerRef || null,
      detailJson: input.detailJson || {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: customerCommunicationEvents.idempotencyKey,
      set: {
        status: input.status,
        toAddress: input.toAddress || null,
        messagePreview: input.messagePreview ? input.messagePreview.slice(0, 500) : null,
        providerRef: input.providerRef || null,
        detailJson: input.detailJson || {},
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

async function markOrderAutomation(orderId: string, eventKey: string, label: string, status: string, idempotencyKey: string, detail: Record<string, unknown>) {
  await db.insert(orderAutomationEvents).values({
    orderId,
    eventKey,
    label,
    status,
    idempotencyKey,
    detailJson: detail,
    updatedAt: new Date(),
  }).catch(() => undefined);
}

async function loadOrderForCommunication(orderNumber: string) {
  const [row] = await db
    .select({
      order: orders,
      customer: customers,
      delivery: deliveries,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(deliveries, eq(deliveries.orderId, orders.id))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  return row || null;
}

export async function processOrderReceiptJob(payload: Record<string, unknown>) {
  const orderNumber = String(payload.orderNumber || '');
  if (!orderNumber) throw new Error('SEND_ORDER_RECEIPT requires orderNumber');
  const row = await loadOrderForCommunication(orderNumber);
  if (!row) throw new Error(`Order not found: ${orderNumber}`);
  const phone = String(payload.to || row.customer?.phone || row.delivery?.recipientPhone || '').trim();
  const key = String(payload.idempotencyKey || buildCommunicationIdempotencyKey('ORDER_RECEIPT', row.order.id));
  if (!phone) {
    await recordCommunicationEvent({
      eventType: 'ORDER_RECEIPT',
      idempotencyKey: key,
      status: 'SKIPPED',
      orderId: row.order.id,
      customerId: row.order.customerId,
      detailJson: { reason: 'missing_phone' },
    });
    await markOrderAutomation(row.order.id, 'receipt_send', 'Receipt message', 'BLOCKED', key, { reason: 'missing_phone' });
    return;
  }

  const storeName = await getStoreName();
  const baseUrl = await getBaseUrl();
  const trackingUrl = row.order.trackingToken ? `${baseUrl}/track/${encodeURIComponent(row.order.trackingToken)}` : null;
  const text = buildReceiptMessage({
    storeName,
    orderNumber: row.order.orderNumber,
    customerName: row.customer?.name || row.delivery?.recipientName,
    grandTotal: row.order.grandTotal,
    trackingUrl,
  });
  const result = await sendWhatsAppText({ to: phone, text });
  await recordCommunicationEvent({
    eventType: 'ORDER_RECEIPT',
    idempotencyKey: key,
    status: result.success ? 'SENT' : 'FAILED',
    orderId: row.order.id,
    customerId: row.order.customerId,
    toAddress: phone,
    messagePreview: text,
    providerRef: providerMessageId(result),
    detailJson: result.success ? { stub: result.stub || false } : { error: result.error || 'send_failed' },
  });
  await markOrderAutomation(row.order.id, 'receipt_send', 'Receipt message', result.success ? 'DONE' : 'FAILED', key, {
    channel: 'WHATSAPP',
    to: phone,
  });
  if (!result.success) throw new Error(result.error || 'Receipt WhatsApp failed');
}

export async function processReviewRequestJob(payload: Record<string, unknown>) {
  const orderNumber = String(payload.orderNumber || '');
  if (!orderNumber) throw new Error('SEND_REVIEW_REQUEST requires orderNumber');
  const row = await loadOrderForCommunication(orderNumber);
  if (!row) throw new Error(`Order not found: ${orderNumber}`);
  if (row.order.fulfillmentStatus !== 'DELIVERED') {
    await recordCommunicationEvent({
      eventType: 'REVIEW_REQUEST',
      idempotencyKey: buildCommunicationIdempotencyKey('REVIEW_REQUEST', row.order.id),
      status: 'SKIPPED',
      orderId: row.order.id,
      customerId: row.order.customerId,
      detailJson: { reason: 'not_delivered', fulfillmentStatus: row.order.fulfillmentStatus },
    });
    return;
  }
  const phone = String(payload.to || row.customer?.phone || row.delivery?.recipientPhone || '').trim();
  const key = String(payload.idempotencyKey || buildCommunicationIdempotencyKey('REVIEW_REQUEST', row.order.id));
  if (!phone) {
    await recordCommunicationEvent({
      eventType: 'REVIEW_REQUEST',
      idempotencyKey: key,
      status: 'SKIPPED',
      orderId: row.order.id,
      customerId: row.order.customerId,
      detailJson: { reason: 'missing_phone' },
    });
    return;
  }
  const storeName = await getStoreName();
  const baseUrl = await getBaseUrl();
  const text = buildReviewRequestMessage({
    storeName,
    orderNumber: row.order.orderNumber,
    customerName: row.customer?.name || row.delivery?.recipientName,
    reviewUrl: `${baseUrl}/shop/reviews?order=${encodeURIComponent(row.order.orderNumber)}`,
  });
  const result = await sendWhatsAppText({ to: phone, text });
  await recordCommunicationEvent({
    eventType: 'REVIEW_REQUEST',
    idempotencyKey: key,
    status: result.success ? 'SENT' : 'FAILED',
    orderId: row.order.id,
    customerId: row.order.customerId,
    toAddress: phone,
    messagePreview: text,
    providerRef: providerMessageId(result),
    detailJson: result.success ? { stub: result.stub || false } : { error: result.error || 'send_failed' },
  });
  await markOrderAutomation(row.order.id, 'review_request', 'Review request', result.success ? 'DONE' : 'FAILED', key, {
    channel: 'WHATSAPP',
    to: phone,
  });
  if (!result.success) throw new Error(result.error || 'Review WhatsApp failed');
}

export async function refreshCustomerMetrics(customerId?: string) {
  const where = customerId ? eq(orders.customerId, customerId) : sql`${orders.customerId} IS NOT NULL`;
  const rows = await db
    .select({
      customerId: orders.customerId,
      orderId: orders.id,
      grandTotal: orders.grandTotal,
      createdAt: orders.createdAt,
      channel: orders.channel,
    })
    .from(orders)
    .where(and(where, inArray(orders.orderStatus, ['CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED'])))
    .orderBy(desc(orders.createdAt));

  const byCustomer = new Map<string, CustomerMetricInputOrder[]>();
  for (const row of rows) {
    if (!row.customerId) continue;
    const existing = byCustomer.get(row.customerId) || [];
    existing.push({ id: row.orderId, grandTotal: row.grandTotal, createdAt: row.createdAt, channel: row.channel });
    byCustomer.set(row.customerId, existing);
  }

  for (const [id, customerOrders] of byCustomer) {
    const metrics = calculateCustomerMetrics(customerOrders);
    await db
      .insert(customerMetrics)
      .values({
        customerId: id,
        lifetimeSpend: metrics.lifetimeSpend,
        orderCount: metrics.orderCount,
        lastOrderId: metrics.lastOrderId,
        lastOrderAt: metrics.lastOrderAt,
        lastChannel: metrics.lastChannel,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customerMetrics.customerId,
        set: {
          lifetimeSpend: metrics.lifetimeSpend,
          orderCount: metrics.orderCount,
          lastOrderId: metrics.lastOrderId,
          lastOrderAt: metrics.lastOrderAt,
          lastChannel: metrics.lastChannel,
          updatedAt: new Date(),
        },
      });
  }

  return { refreshed: byCustomer.size };
}

export async function processDailyOwnerSummaryJob(payload: Record<string, unknown>) {
  const dateKey = String(payload.scheduledDay || new Date().toISOString().slice(0, 10));
  const since = new Date(`${dateKey}T00:00:00.000Z`);
  const [sales] = await db
    .select({
      ordersCount: sql<number>`count(*)::int`,
      salesTotal: sql<string>`coalesce(sum(${orders.grandTotal}), 0)::text`,
    })
    .from(orders)
    .where(gte(orders.createdAt, since));
  const pendingDispatchRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(inArray(orders.fulfillmentStatus, ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']));
  const pendingCodRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(and(eq(payments.method, 'COD'), eq(payments.status, 'PENDING')));
  const deadJobs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobOutbox)
    .where(eq(jobOutbox.status, 'DEAD'));

  const storeName = await getStoreName();
  const text = buildDailyOwnerSummary({
    storeName,
    dateLabel: dateKey,
    ordersCount: Number(sales?.ordersCount || 0),
    salesTotal: sales?.salesTotal || '0',
    pendingDispatch: Number(pendingDispatchRows[0]?.count || 0),
    pendingCod: Number(pendingCodRows[0]?.count || 0),
    failedJobs: Number(deadJobs[0]?.count || 0),
  });

  const cfg: Record<string, unknown> = await readConfigJson().catch(() => ({}));
  const ownerPhone = String(payload.to || cfg.ownerWhatsapp || cfg.ownerPhone || process.env.OWNER_WHATSAPP || '').trim();
  const key = String(payload.idempotencyKey || buildCommunicationIdempotencyKey('DAILY_OWNER_SUMMARY', 'owner', dateKey));
  if (!ownerPhone) {
    await recordCommunicationEvent({
      eventType: 'DAILY_OWNER_SUMMARY',
      idempotencyKey: key,
      status: 'SKIPPED',
      messagePreview: text,
      detailJson: { reason: 'missing_owner_phone' },
    });
    return;
  }
  const result = await sendWhatsAppText({ to: ownerPhone, text });
  await recordCommunicationEvent({
    eventType: 'DAILY_OWNER_SUMMARY',
    idempotencyKey: key,
    status: result.success ? 'SENT' : 'FAILED',
    toAddress: ownerPhone,
    messagePreview: text,
    providerRef: providerMessageId(result),
    detailJson: result.success ? { stub: result.stub || false } : { error: result.error || 'send_failed' },
  });
  if (!result.success) throw new Error(result.error || 'Daily owner summary WhatsApp failed');
}
