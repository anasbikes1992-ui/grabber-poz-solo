import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { customerCommunicationEvents, customerMetrics, db, orders } from '@/db';
import { getSession } from '@/lib/auth/session';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { enqueueJob } from '@/lib/jobs/outbox';
import { buildCommunicationIdempotencyKey, refreshCustomerMetrics } from '@/lib/customers/communication-pack';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [events, metrics] = await Promise.all([
      db.select().from(customerCommunicationEvents).orderBy(desc(customerCommunicationEvents.createdAt)).limit(50).catch(() => []),
      db.select().from(customerMetrics).orderBy(desc(customerMetrics.updatedAt)).limit(50).catch(() => []),
    ]);

    return NextResponse.json({ success: true, events, metrics });
  } catch (err) {
    return publicErrorResponse(err, {
      message: 'Could not load customer communication pack',
      logMessage: 'Customer communication pack load failed',
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'refresh_customer_metrics') {
      const result = await refreshCustomerMetrics(body.customerId ? String(body.customerId) : undefined);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'queue_order_receipt' || action === 'queue_review_request') {
      const orderNumber = String(body.orderNumber || '').trim();
      if (!orderNumber) return validationErrorResponse('orderNumber is required.');
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      const isReview = action === 'queue_review_request';
      const type = isReview ? 'SEND_REVIEW_REQUEST' : 'SEND_ORDER_RECEIPT';
      const eventType = isReview ? 'REVIEW_REQUEST' : 'ORDER_RECEIPT';
      const result = await enqueueJob({
        type,
        idempotencyKey: buildCommunicationIdempotencyKey(eventType, order.id),
        payload: {
          orderNumber,
          idempotencyKey: buildCommunicationIdempotencyKey(eventType, order.id),
        },
      });
      return NextResponse.json({ success: true, enqueued: result.enqueued });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return publicErrorResponse(err, {
      message: 'Could not update customer communication pack',
      logMessage: 'Customer communication pack update failed',
    });
  }
}
