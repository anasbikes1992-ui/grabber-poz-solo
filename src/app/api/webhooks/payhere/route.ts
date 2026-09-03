import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, payments, webhookEvents } from '@/db';
import { getPayHereConfig } from '@/lib/payments/lkr-provider';
import { payHereWebhookSecretRequired, verifyPayHereSignature } from '@/lib/payments/payhere-signature';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let params: Record<string, string> = {};
    if (contentType.includes('application/json')) {
      params = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => {
        params[k] = String(v);
      });
    }

    const secret = getPayHereConfig().secret;
    const providerEventId = params.payment_id || params.order_id || `evt_${Date.now()}`;

    if (payHereWebhookSecretRequired() && !secret) {
      return NextResponse.json(
        { success: false, error: 'PayHere secret required in production' },
        { status: 503 },
      );
    }

    // Dedupe
    try {
      await db.insert(webhookEvents).values({
        provider: 'payhere',
        providerEventId,
        payload: params,
        status: 'PENDING',
      });
    } catch {
      return NextResponse.json({ success: true, deduped: true });
    }

    if (secret && !verifyPayHereSignature(params, secret)) {
      await db
        .update(webhookEvents)
        .set({ status: 'FAILED', processedAt: new Date() })
        .where(eq(webhookEvents.providerEventId, providerEventId));
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const statusCode = params.status_code;
    if (statusCode === '2') {
      const orderNumber = params.order_id;
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      if (order) {
        await db.update(orders).set({ paymentStatus: 'PAID', updatedAt: new Date() }).where(eq(orders.id, order.id));
        await db
          .insert(payments)
          .values({
            orderId: order.id,
            method: 'PAYHERE',
            amount: params.payhere_amount || order.grandTotal,
            currency: params.payhere_currency || 'LKR',
            providerRef: params.payment_id,
            status: 'SUCCESS',
            idempotencyKey: `payhere_${providerEventId}`,
          })
          .onConflictDoNothing();
      }
    }

    await db
      .update(webhookEvents)
      .set({ status: 'PROCESSED', processedAt: new Date() })
      .where(eq(webhookEvents.providerEventId, providerEventId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
