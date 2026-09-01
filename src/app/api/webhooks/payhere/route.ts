import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, orders, payments, webhookEvents } from '@/db';
import { getPayHereConfig } from '@/lib/payments/lkr-provider';

function verifyPayHereSignature(params: Record<string, string>, secret: string): boolean {
  // PayHere md5sig = MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(secret))
  const merchantId = params.merchant_id || '';
  const orderId = params.order_id || '';
  const amount = params.payhere_amount || '';
  const currency = params.payhere_currency || '';
  const statusCode = params.status_code || '';
  const md5sig = (params.md5sig || '').toUpperCase();
  const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
  const local = createHash('md5')
    .update(merchantId + orderId + amount + currency + statusCode + secretHash)
    .digest('hex')
    .toUpperCase();
  return local === md5sig;
}

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
        await db.insert(payments).values({
          orderId: order.id,
          method: 'PAYHERE',
          amount: params.payhere_amount || order.grandTotal,
          currency: params.payhere_currency || 'LKR',
          providerRef: params.payment_id,
          status: 'SUCCESS',
          idempotencyKey: `payhere_${providerEventId}`,
        }).onConflictDoNothing();
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
