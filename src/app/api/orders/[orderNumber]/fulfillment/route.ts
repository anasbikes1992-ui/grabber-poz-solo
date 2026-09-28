import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { barcodeLabelQueue, db, fulfillmentWorkItems } from '@/db';
import { getSession } from '@/lib/auth/session';
import {
  buildBarcodeQueueSeed,
  buildFulfillmentWorkSteps,
  summarizeFulfillmentWork,
} from '@/lib/orders/fulfillment-pack';
import { loadFulfillmentOrder } from '@/lib/orders/fulfillment-documents';

type RouteCtx = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderNumber } = await ctx.params;
    const order = await loadFulfillmentOrder(orderNumber);
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    const steps = buildFulfillmentWorkSteps(order);
    let workItems: Array<Record<string, unknown>> = [];
    try {
      workItems = await db
        .select()
        .from(fulfillmentWorkItems)
        .where(eq(fulfillmentWorkItems.orderId, order.orderId))
        .limit(100);
    } catch (err) {
      if (!String((err as Error).message || '').includes('fulfillment_work_items')) throw err;
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.orderId,
        orderNumber: order.orderNumber,
        channel: order.channel,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        lineCount: order.lines.length,
      },
      summary: summarizeFulfillmentWork(steps),
      steps,
      workItems,
      documents: {
        pickList: `/api/orders/${encodeURIComponent(order.orderNumber)}/pick-list`,
        packingSlip: `/api/orders/${encodeURIComponent(order.orderNumber)}/packing-slip`,
        deliveryNote: `/api/orders/${encodeURIComponent(order.orderNumber)}/delivery-note`,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderNumber } = await ctx.params;
    const order = await loadFulfillmentOrder(orderNumber);
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (action !== 'queue_barcode_labels') {
      return NextResponse.json({ success: false, error: 'Unsupported fulfillment action' }, { status: 400 });
    }

    const seeds = buildBarcodeQueueSeed(order);
    const queued = [];
    for (const seed of seeds) {
      const existing = await db
        .select()
        .from(barcodeLabelQueue)
        .where(
          and(
            eq(barcodeLabelQueue.sourceType, seed.sourceType),
            eq(barcodeLabelQueue.sourceId, seed.sourceId),
            eq(barcodeLabelQueue.productId, seed.productId),
          ),
        )
        .limit(1);
      if (existing.length) {
        queued.push(existing[0]);
        continue;
      }
      const [row] = await db
        .insert(barcodeLabelQueue)
        .values({
          ...seed,
          actorId: session?.userId || null,
        })
        .returning();
      queued.push(row);
    }

    return NextResponse.json({ success: true, queued });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
