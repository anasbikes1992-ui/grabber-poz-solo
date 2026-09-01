import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, orders, customers, payments } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  applyOrderTransitions,
  ORDER_STATUS_PRESETS,
  type OrderTransitionInput,
} from '@/lib/commerce/order-lifecycle';
import { InvalidStateTransitionError } from '@/lib/commerce/order-state-machine';

function formatPaymentMethod(methods: string[]) {
  if (methods.length > 1) return 'SPLIT';
  return methods[0] || 'CASH';
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');

    const conditions = [ne(orders.orderStatus, 'DRAFT')];
    if (channel && channel !== 'all') {
      conditions.push(eq(orders.channel, channel as typeof orders.$inferSelect.channel));
    }
    if (status && status !== 'all') {
      conditions.push(eq(orders.orderStatus, status as typeof orders.$inferSelect.orderStatus));
    }

    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        channel: orders.channel,
        grandTotal: orders.grandTotal,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        createdAt: orders.createdAt,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const orderIds = rows.map((r) => r.id);
    const paymentRows =
      orderIds.length > 0
        ? await db.select().from(payments).where(inArray(payments.orderId, orderIds))
        : [];
    const paymentsByOrder = new Map<string, string[]>();
    for (const p of paymentRows) {
      const list = paymentsByOrder.get(p.orderId) || [];
      list.push(String(p.method));
      paymentsByOrder.set(p.orderId, list);
    }

    const customerIds = rows.map((r) => r.customerId).filter(Boolean) as string[];
    const customerRows =
      customerIds.length > 0
        ? await db.select().from(customers).where(inArray(customers.id, customerIds))
        : [];
    const customerMap = new Map(customerRows.map((c) => [c.id, c]));

    const mapped = rows.map((o) => {
      const c = o.customerId ? customerMap.get(o.customerId) : undefined;
      const payMethods = paymentsByOrder.get(o.id) || [];
      return {
        id: o.id,
        receiptNo: o.orderNumber,
        customerName: c?.name || 'Walk-in',
        customerMobile: c?.phone || '',
        total: Number(o.grandTotal || 0),
        paymentMethod: formatPaymentMethod(payMethods),
        source: o.channel,
        channel: o.channel,
        orderStatus: String(o.orderStatus || 'CONFIRMED').toLowerCase(),
        fulfillmentStatus: String(o.fulfillmentStatus || 'PENDING').toLowerCase(),
        paymentStatus: String(o.paymentStatus || 'PENDING').toLowerCase(),
        deliveryAddress: c?.address || '',
        deliveryFee: 0,
        codFee: 0,
        createdAt: o.createdAt,
        saleStatus: o.orderStatus,
      };
    });

    return NextResponse.json({ success: true, orders: mapped, total: mapped.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const orderId = body.id || body.orderId;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order id required' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    let next: OrderTransitionInput = {};
    if (body.preset && ORDER_STATUS_PRESETS[body.preset]) {
      next = ORDER_STATUS_PRESETS[body.preset];
    } else {
      next = {
        orderStatus: body.orderStatus,
        paymentStatus: body.paymentStatus,
        fulfillmentStatus: body.fulfillmentStatus,
      };
    }

    const updated = applyOrderTransitions(
      {
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
      },
      next,
    );

    const [saved] = await db
      .update(orders)
      .set({ ...updated, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({ success: true, order: saved });
  } catch (err) {
    if (err instanceof InvalidStateTransitionError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
