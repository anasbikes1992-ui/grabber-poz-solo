import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, customers, deliveries, deliveryEvents, deliveryRiders, orders, orderItems, payments } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { dispatchOrderViaKoombiyo, loadCustomerForOrder } from '@/lib/delivery/dispatch-order';
import {
  buildRiderDeliveryMessage,
  notificationStatusFromWhatsApp,
  selectAutoRider,
  type DeliveryRiderCandidate,
  type RiderAssignmentMode,
} from '@/lib/delivery/riders';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { recordReturn } from '@/lib/inventory/stock-service';

function formatPaymentMethod(methods: string[]) {
  if (methods.length > 1) return 'SPLIT';
  return methods[0] || 'CASH';
}

const ACTIVE_RIDER_DELIVERY_STATUSES = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] as const;

function isInHouseProvider(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, '-');
  return normalized === 'in-house' || normalized === 'in-house-delivery' || normalized === 'direct';
}

function deliveryNoteUrl(req: Request, orderNumber: string) {
  const base = process.env.APP_URL || new URL(req.url).origin;
  return `${base.replace(/\/$/, '')}/api/orders/${encodeURIComponent(orderNumber)}/delivery-note`;
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
    const riderIds = [...new Set(deliveryRows.map((d) => d.riderId).filter(Boolean) as string[])];
    const riderRows =
      riderIds.length > 0
        ? await db.select().from(deliveryRiders).where(inArray(deliveryRiders.id, riderIds))
        : [];
    const riderById = new Map(riderRows.map((r) => [r.id, r]));

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
      const rider = d?.riderId ? riderById.get(d.riderId) : undefined;
      const payMethods = paymentsByOrder.get(o.id) || [];
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        deliveryId: d?.id || null,
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
        riderId: d?.riderId || null,
        riderName: rider?.name || null,
        riderPhone: rider?.phone || null,
        riderWhatsappPhone: rider?.whatsappPhone || null,
        assignmentMode: d?.assignmentMode || null,
        riderNotificationStatus: d?.riderNotificationStatus || null,
      };
    });

    return NextResponse.json({ success: true, shipments });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
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
    if (isInHouseProvider(requestedPartner)) {
      const explicitRiderId = String(body.riderId || '').trim() || null;
      let selectedRider: typeof deliveryRiders.$inferSelect | null = null;
      let assignmentMode: RiderAssignmentMode | null = null;

      if (explicitRiderId) {
        const [rider] = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, explicitRiderId)).limit(1);
        if (!rider || !rider.active) {
          return NextResponse.json({ success: false, error: 'Active rider not found' }, { status: 404 });
        }
        selectedRider = rider;
        assignmentMode = 'MANUAL';
      } else if (body.autoAssign === true) {
        const riders = await db.select().from(deliveryRiders).where(eq(deliveryRiders.active, true));
        const activeDeliveries = await db
          .select()
          .from(deliveries)
          .where(inArray(deliveries.status, [...ACTIVE_RIDER_DELIVERY_STATUSES]));
        const loadByRider = new Map<string, number>();
        for (const d of activeDeliveries) {
          if (!d.riderId) continue;
          loadByRider.set(d.riderId, (loadByRider.get(d.riderId) || 0) + 1);
        }
        const candidate = selectAutoRider(
          riders.map((r): DeliveryRiderCandidate => ({
            id: r.id,
            name: r.name,
            whatsappPhone: r.whatsappPhone,
            active: r.active,
            homeBranchId: r.homeBranchId,
            activeDeliveryCount: loadByRider.get(r.id) || 0,
            lastAssignedAt: r.lastAssignedAt,
          })),
          order.branchId || order.fulfillmentLocationId,
        );
        if (!candidate) {
          return NextResponse.json({ success: false, error: 'No active rider available for auto assignment' }, { status: 409 });
        }
        selectedRider = riders.find((r) => r.id === candidate.id) || null;
        assignmentMode = 'AUTO';
      }

      const trackingNumber = existingDelivery?.trackingNumber || `INH-${Date.now().toString().slice(-8)}`;
      const now = new Date();
      const deliveryPayload = {
        orderId,
        courierPartner: 'In-House',
        trackingNumber,
        status: 'ASSIGNED' as const,
        recipientName,
        recipientPhone,
        deliveryAddress: address,
        codAmount: codAmount ? String(codAmount.toFixed(2)) : null,
        riderId: selectedRider?.id || null,
        assignmentMode,
        riderNotificationStatus: selectedRider ? 'PENDING' : null,
        assignmentNotes: body.assignmentNotes ? String(body.assignmentNotes).slice(0, 500) : null,
        dispatchedAt: existingDelivery?.dispatchedAt || now,
      };

      const [newDelivery] = existingDelivery
        ? await db.update(deliveries).set(deliveryPayload).where(eq(deliveries.id, existingDelivery.id)).returning()
        : await db.insert(deliveries).values(deliveryPayload).returning();

      await db
        .update(orders)
        .set({ fulfillmentStatus: 'ASSIGNED', updatedAt: now })
        .where(eq(orders.id, orderId));

      if (selectedRider) {
        await db.update(deliveryRiders).set({ lastAssignedAt: now, updatedAt: now }).where(eq(deliveryRiders.id, selectedRider.id));
        await db.insert(deliveryEvents).values({
          deliveryId: newDelivery.id,
          orderId,
          eventType: 'RIDER_ASSIGNED',
          status: 'SUCCESS',
          actorId: session?.userId || null,
          detailJson: {
            riderId: selectedRider.id,
            riderName: selectedRider.name,
            assignmentMode,
          },
        });

        const text = buildRiderDeliveryMessage({
          orderNumber: order.orderNumber,
          customerName: recipientName,
          customerPhone: recipientPhone,
          address,
          codAmount,
          paymentStatus: order.paymentStatus,
          trackingNumber,
          deliveryNoteUrl: deliveryNoteUrl(req, order.orderNumber),
        });
        const sendResult = await sendWhatsAppText({ to: selectedRider.whatsappPhone, text });
        const notificationStatus = notificationStatusFromWhatsApp(sendResult);
        await db.update(deliveries).set({
          riderNotificationStatus: notificationStatus,
          riderNotificationMessageId: sendResult.success && 'messageId' in sendResult ? sendResult.messageId || null : null,
          riderNotifiedAt: notificationStatus === 'SENT' || notificationStatus === 'STUB' ? new Date() : null,
        }).where(eq(deliveries.id, newDelivery.id));
        await db.insert(deliveryEvents).values({
          deliveryId: newDelivery.id,
          orderId,
          eventType: notificationStatus === 'FAILED' ? 'RIDER_WHATSAPP_FAILED' : 'RIDER_WHATSAPP_SENT',
          status: notificationStatus === 'FAILED' ? 'FAILED' : 'SUCCESS',
          actorId: session?.userId || null,
          detailJson: {
            riderId: selectedRider.id,
            to: selectedRider.whatsappPhone,
            notificationStatus,
            error: sendResult.success ? undefined : sendResult.error,
          },
        });
      }

      const [updatedDelivery] = await db.select().from(deliveries).where(eq(deliveries.id, newDelivery.id)).limit(1);

      return NextResponse.json({
        success: true,
        trackingNumber,
        courierPartner: 'In-House',
        rider: selectedRider,
        assignmentMode,
        delivery: updatedDelivery || newDelivery,
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
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
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
    await db.insert(deliveryEvents).values({
      deliveryId,
      orderId: current.orderId,
      eventType: 'DELIVERY_STATUS_CHANGED',
      status: 'SUCCESS',
      actorId: session?.userId || null,
      detailJson: {
        from: current.status,
        to: nextStatus,
      },
    });

    if (body.notifyRider === true && current.riderId) {
      const [rider] = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, current.riderId)).limit(1);
      const [order] = await db.select().from(orders).where(eq(orders.id, current.orderId)).limit(1);
      if (rider && order) {
        const result = await sendWhatsAppText({
          to: rider.whatsappPhone,
          text: `Delivery update: ${order.orderNumber} is now ${nextStatus.replace(/_/g, ' ')}.\nTracking: ${current.trackingNumber || 'N/A'}`,
        });
        const notificationStatus = notificationStatusFromWhatsApp(result);
        await db.insert(deliveryEvents).values({
          deliveryId,
          orderId: current.orderId,
          eventType: notificationStatus === 'FAILED' ? 'RIDER_STATUS_WHATSAPP_FAILED' : 'RIDER_STATUS_WHATSAPP_SENT',
          status: notificationStatus === 'FAILED' ? 'FAILED' : 'SUCCESS',
          actorId: session?.userId || null,
          detailJson: {
            riderId: rider.id,
            to: rider.whatsappPhone,
            notificationStatus,
            error: result.success ? undefined : result.error,
          },
        });
      }
    }

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
    return NextResponse.json({ success: false, error: 'Failed to update delivery' }, { status: e.status || 400 });
  }
}
