import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import {
  customers,
  deliveries,
  db,
  orderAutomationEvents,
  orderItems,
  orders,
  payments,
} from '@/db';
import { getSession } from '@/lib/auth/session';
import {
  buildOrderAutomationTimeline,
  summarizeOrderAutomationTimeline,
  type PersistedOrderAutomationEvent,
} from '@/lib/orders/automation-timeline';

type RouteCtx = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderNumber } = await ctx.params;
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const [customer] = order.customerId
      ? await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
      : [];
    const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, order.id));
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, order.id)).limit(1);

    let persisted: PersistedOrderAutomationEvent[] = [];
    try {
      const eventRows = await db
        .select()
        .from(orderAutomationEvents)
        .where(eq(orderAutomationEvents.orderId, order.id))
        .orderBy(desc(orderAutomationEvents.createdAt))
        .limit(100);
      persisted = eventRows.map((event) => ({
        eventKey: event.eventKey,
        label: event.label,
        status: event.status,
        detail: event.detailJson,
        createdAt: event.createdAt,
      }));
    } catch (err) {
      if (!String((err as Error).message || '').includes('order_automation_events')) {
        throw err;
      }
    }

    const steps = buildOrderAutomationTimeline(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        channel: order.channel,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        grandTotal: Number(order.grandTotal || 0),
        lineCount: itemRows.length,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        customerAddress: customer?.address,
        paymentMethods: paymentRows.map((p) => String(p.method)),
        delivery: delivery
          ? {
              courierPartner: delivery.courierPartner,
              trackingNumber: delivery.trackingNumber,
              status: delivery.status,
            }
          : null,
      },
      persisted,
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        channel: order.channel,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
      },
      summary: summarizeOrderAutomationTimeline(steps),
      steps,
      persistedEvents: persisted,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
