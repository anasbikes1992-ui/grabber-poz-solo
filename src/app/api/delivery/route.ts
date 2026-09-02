import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, customers, deliveries, orders, payments } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { dispatchOrderViaKoombiyo, loadCustomerForOrder } from '@/lib/delivery/dispatch-order';

function formatPaymentMethod(methods: string[]) {
  if (methods.length > 1) return 'SPLIT';
  return methods[0] || 'CASH';
}

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(orders)
      .where(and(ne(orders.orderStatus, 'DRAFT'), eq(orders.channel, 'STOREFRONT')))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const orderIds = rows.map((r) => r.id);
    const deliveryRows =
      orderIds.length > 0
        ? await db.select().from(deliveries).where(inArray(deliveries.orderId, orderIds))
        : [];
    const deliveryByOrder = new Map(deliveryRows.map((d) => [d.orderId, d]));

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

    const shipments = rows.map((o) => {
      const c = o.customerId ? customerMap.get(o.customerId) : undefined;
      const d = deliveryByOrder.get(o.id);
      const payMethods = paymentsByOrder.get(o.id) || [];
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: c?.name || 'Walk-in',
        customerMobile: c?.phone || '',
        shippingAddress: d?.deliveryAddress || c?.address || '',
        total: Number(o.grandTotal || 0),
        paymentMethod: formatPaymentMethod(payMethods),
        paymentStatus: String(o.paymentStatus || 'PENDING').toLowerCase(),
        fulfillmentStatus: String(o.fulfillmentStatus || 'PENDING').toUpperCase(),
        courierPartner: d?.courierPartner || null,
        trackingNumber: d?.trackingNumber || null,
        dispatchedAt: d?.dispatchedAt || null,
        codAmount: d?.codAmount != null ? Number(d.codAmount) : 0,
      };
    });

    return NextResponse.json({ success: true, shipments });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const orderId = body.orderId || body.id;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const customer = await loadCustomerForOrder(order.customerId);
    const recipientName = body.recipientName || customer?.name || 'Customer';
    const recipientPhone = body.recipientPhone || customer?.phone || '';
    const address = body.address || customer?.address || body.shippingAddress || '';

    if (!recipientPhone || !address) {
      return NextResponse.json(
        { success: false, error: 'recipientPhone and address required for Koombiyo dispatch' },
        { status: 400 },
      );
    }

    const isCod = body.paymentMethod === 'COD' || order.paymentStatus === 'PENDING';
    const codAmount = isCod ? Number(order.grandTotal) : undefined;

    const result = await dispatchOrderViaKoombiyo({
      orderId,
      recipientName,
      recipientPhone,
      address,
      codAmount,
    });

    await db
      .update(orders)
      .set({ fulfillmentStatus: 'IN_TRANSIT', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      trackingNumber: result.trackingNumber,
      courierPartner: 'Koombiyo',
      stub: result.stub,
      delivery: result.delivery,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
