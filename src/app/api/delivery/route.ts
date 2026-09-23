import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, customers, deliveries, orders, orderItems, payments } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { dispatchOrderViaKoombiyo, loadCustomerForOrder } from '@/lib/delivery/dispatch-order';
import { recordReturn } from '@/lib/inventory/stock-service';

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

    if (['DELIVERED', 'RETURNED'].includes(String(order.fulfillmentStatus))) {
      return NextResponse.json({ success: false, error: `Cannot dispatch order in ${order.fulfillmentStatus} status` }, { status: 409 });
    }
    const [existingDelivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, orderId)).limit(1);
    if (existingDelivery?.status === 'IN_TRANSIT' || existingDelivery?.status === 'DELIVERED') {
      return NextResponse.json({
        success: true,
        reused: true,
        trackingNumber: existingDelivery.trackingNumber,
        courierPartner: existingDelivery.courierPartner,
        delivery: existingDelivery,
      });
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
    const requestedPartner = String(body.courierPartner || body.provider || 'Koombiyo').trim();

    // In-House / Direct Delivery provider support
    if (requestedPartner.toLowerCase() === 'in-house' || requestedPartner.toUpperCase() === 'IN_HOUSE') {
      const trackingNumber = `INH-${Date.now().toString().slice(-8)}`;
      const [newDelivery] = await db
        .insert(deliveries)
        .values({
          orderId,
          courierPartner: 'In-House',
          trackingNumber,
          status: 'ASSIGNED',
          recipientName,
          recipientPhone,
          deliveryAddress: address,
          codAmount: codAmount ? String(codAmount.toFixed(2)) : null,
          dispatchedAt: new Date(),
        })
        .returning();

      await db
        .update(orders)
        .set({ fulfillmentStatus: 'ASSIGNED', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      return NextResponse.json({
        success: true,
        trackingNumber,
        courierPartner: 'In-House',
        stub: false,
        delivery: newDelivery,
      });
    }

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
      courierPartner: requestedPartner || 'Koombiyo',
      stub: result.stub,
      delivery: result.delivery,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const deliveryId = String(body.deliveryId || '').trim();
    const nextStatus = String(body.status || '').trim().toUpperCase();
    const allowed = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'];
    if (!deliveryId || !allowed.includes(nextStatus)) {
      return NextResponse.json({ success: false, error: 'deliveryId and valid status required' }, { status: 400 });
    }

    const [current] = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId)).limit(1);
    if (!current) return NextResponse.json({ success: false, error: 'Delivery not found' }, { status: 404 });
    const transitions: Record<string, string[]> = {
      PENDING: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['PICKED_UP', 'CANCELLED'],
      PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: [],
      FAILED: ['RETURNED', 'ASSIGNED'],
      RETURNED: [],
    };
    if (nextStatus !== current.status && !transitions[current.status]?.includes(nextStatus)) {
      return NextResponse.json({ success: false, error: `Invalid delivery transition ${current.status} -> ${nextStatus}` }, { status: 409 });
    }

    const [updated] = await db.update(deliveries).set({
      status: nextStatus as typeof current.status,
      deliveredAt: nextStatus === 'DELIVERED' ? new Date() : current.deliveredAt,
    }).where(eq(deliveries.id, deliveryId)).returning();
    await db.update(orders).set({
      fulfillmentStatus: nextStatus as 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED',
      updatedAt: new Date(),
    }).where(eq(orders.id, current.orderId));

    // Automated Return-to-Origin (RTO) Stock Restock on RETURNED
    if (nextStatus === 'RETURNED' && body.autoRestock !== false) {
      try {
        const [order] = await db.select().from(orders).where(eq(orders.id, current.orderId)).limit(1);
        const locationId = String(body.restockLocationId || body.locationId || order?.fulfillmentLocationId || order?.branchId || '');
        const locationType = (body.locationType as 'BRANCH' | 'WAREHOUSE') || (order?.fulfillmentLocationId ? 'WAREHOUSE' : 'BRANCH');

        if (locationId) {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, current.orderId));
          if (items.length > 0) {
            await db.transaction(async (tx) => {
              for (const item of items) {
                await recordReturn(
                  tx as any,
                  { locationType, locationId },
                  {
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitCost: Number(item.unitCost || 0),
                  },
                  {
                    referenceType: 'DELIVERY_RETURN',
                    referenceId: deliveryId,
                    actorId: session?.userId || null,
                    notes: `RTO restock for order ${order?.orderNumber || current.orderId}`,
                  }
                );
              }
            });
          }
        }
      } catch (restockErr) {
        console.error('Failed to restock returned delivery items:', restockErr);
      }
    }

    return NextResponse.json({ success: true, delivery: updated });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to update delivery' }, { status: e.status || 400 });
  }
}
