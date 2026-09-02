import { eq } from 'drizzle-orm';
import {
  customers,
  deliveries,
  hirePurchaseContracts,
  orderItems,
  orders,
  payments,
  products,
  repairJobs,
} from '@/db/schema';

export type TrackAuth = { phoneLast4?: string; token?: string };

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export function phoneLast4Matches(phone: string, last4: string) {
  const norm = normalizePhone(phone);
  return norm.slice(-4) === last4.replace(/\D/g, '').slice(-4);
}

export function verifyOrderAccess(
  order: { trackingToken?: string | null; customerId?: string | null },
  customerPhone: string | null | undefined,
  auth: TrackAuth,
) {
  if (auth.token && order.trackingToken && auth.token === order.trackingToken) return true;
  if (auth.phoneLast4 && customerPhone && phoneLast4Matches(customerPhone, auth.phoneLast4)) return true;
  return false;
}

export const REPAIR_TIMELINE = [
  'INTAKE',
  'DIAGNOSING',
  'IN_PROGRESS',
  'REPAIRED',
  'READY',
  'READY_FOR_PICKUP',
  'DELIVERED',
] as const;

export function repairTimelineStatus(current: string) {
  const normalized = current === 'READY' ? 'READY_FOR_PICKUP' : current;
  const idx = REPAIR_TIMELINE.indexOf(normalized as (typeof REPAIR_TIMELINE)[number]);
  return REPAIR_TIMELINE.map((step, i) => ({
    step,
    label: step.replace(/_/g, ' '),
    done: idx >= 0 ? i <= idx : step === 'INTAKE',
    current: normalized === step || (current === 'READY' && step === 'READY_FOR_PICKUP'),
  }));
}

export const ORDER_PROGRESS = [
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export function orderProgressSteps(orderStatus: string, fulfillmentStatus: string) {
  let effective =
    fulfillmentStatus === 'IN_TRANSIT' || fulfillmentStatus === 'OUT_FOR_DELIVERY'
      ? fulfillmentStatus
      : orderStatus;
  if (effective === 'IN_TRANSIT') effective = 'OUT_FOR_DELIVERY';
  const idx = ORDER_PROGRESS.indexOf(effective as (typeof ORDER_PROGRESS)[number]);
  return ORDER_PROGRESS.map((step, i) => ({
    step,
    label: step.replace(/_/g, ' '),
    done: idx >= 0 ? i <= idx : step === 'CONFIRMED',
    current: effective === step,
  }));
}

export type TrackDb = {
  select: () => {
    from: (table: typeof orders) => {
      where: (cond: unknown) => { limit: (n: number) => Promise<Array<typeof orders.$inferSelect>> };
    };
  };
};

/** Build public tracking payload for an order number + auth. */
export async function lookupOrderTracking(
  db: {
    select: typeof import('@/db').db.select;
  },
  orderNumber: string,
  auth: TrackAuth,
) {
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return { error: 'Order not found' as const };

  let customerPhone: string | undefined;
  if (order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    customerPhone = cust?.phone;
  }

  if (!verifyOrderAccess(order, customerPhone, auth)) {
    return { error: 'Invalid phone or tracking token' as const };
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const productIds = [...new Set(items.map((i) => i.productId))];
  const productMap = new Map<string, string>();
  for (const pid of productIds) {
    const [p] = await db.select().from(products).where(eq(products.id, pid)).limit(1);
    if (p) productMap.set(pid, p.name);
  }

  const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, order.id)).limit(1);
  const pays = await db.select().from(payments).where(eq(payments.orderId, order.id));

  let hpContract = null;
  if (order.customerId) {
    const hpRows = await db
      .select()
      .from(hirePurchaseContracts)
      .where(eq(hirePurchaseContracts.customerId, order.customerId))
      .limit(5);
    hpContract =
      hpRows.find((c) => c.productId && items.some((i) => i.productId === c.productId)) || hpRows[0] || null;
  }

  return {
    order: {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      grandTotal: Number(order.grandTotal),
      taxTotal: Number(order.taxTotal),
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      createdAt: order.createdAt,
      progress: orderProgressSteps(order.orderStatus, order.fulfillmentStatus),
    },
    items: items.map((i) => ({
      name: productMap.get(i.productId) || 'Item',
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
    delivery: delivery
      ? {
          courierPartner: delivery.courierPartner,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
          recipientName: delivery.recipientName,
          dispatchedAt: delivery.dispatchedAt,
          deliveredAt: delivery.deliveredAt,
          koombiyoUrl: delivery.trackingNumber
            ? `https://koombiyo.lk/track/${encodeURIComponent(delivery.trackingNumber)}`
            : null,
        }
      : null,
    payments: pays.map((p) => ({ method: p.method, amount: Number(p.amount), status: p.status })),
    hirePurchase: hpContract
      ? {
          contractNumber: hpContract.contractNumber,
          monthlyEmi: Number(hpContract.monthlyEmi),
          paidMonths: hpContract.paidMonths,
          totalMonths: hpContract.totalMonths,
          nextDueDate: hpContract.nextDueDate,
          status: hpContract.status,
        }
      : null,
    invoiceUrl: `/api/orders/${encodeURIComponent(order.orderNumber)}/invoice?token=${encodeURIComponent(auth.token || '')}&phoneLast4=${encodeURIComponent(auth.phoneLast4 || '')}`,
  };
}

export async function lookupRepairTracking(
  db: { select: typeof import('@/db').db.select },
  ticketNumber: string,
  phone: string,
) {
  const [job] = await db.select().from(repairJobs).where(eq(repairJobs.jobNumber, ticketNumber)).limit(1);
  if (!job || normalizePhone(job.customerPhone) !== normalizePhone(phone)) {
    return { error: 'Repair ticket not found' as const };
  }
  return {
    repair: {
      ticketCode: job.jobNumber,
      status: job.status,
      deviceModel: job.deviceModel,
      primaryFault: job.primaryFault,
      customerName: job.customerName,
      serviceCharge: Number(job.serviceCharge),
      partsAmount: Number(job.partsAmount),
      updatedAt: job.updatedAt,
      timeline: repairTimelineStatus(job.status),
    },
  };
}
