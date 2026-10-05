import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, webhookEvents } from '@/db';
import { settleGatewayPayment } from '@/lib/commerce/payment-settlement';
import { getWebXPayConfig } from '@/lib/payments/lkr-provider';
import { auditWebXPayWebhook } from '@/lib/payments/webxpay/webhook';
import { mapWebXPayStatus } from '@/lib/payments/webxpay/mapper';

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

    const { secretKey } = getWebXPayConfig();
    const providerEventId = params.transaction_id || params.payment_id || params.order_id || `wxp_${Date.now()}`;
    const orderNumber = params.order_id;

    if (process.env.NODE_ENV === 'production' && !secretKey) {
      return NextResponse.json(
        { success: false, error: 'WebXPay secret required in production' },
        { status: 503 },
      );
    }

    const [order] = orderNumber
      ? await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)
      : [null];

    // PAY-001 through PAY-008 Comprehensive Security Audit
    const audit = auditWebXPayWebhook({
      params,
      expectedSecretKey: secretKey,
      order: order
        ? {
            orderNumber: order.orderNumber,
            grandTotal: order.grandTotal,
            currency: 'LKR',
            paymentStatus: order.paymentStatus,
          }
        : null,
    });

    if (!audit.valid) {
      return NextResponse.json(
        { success: false, error: audit.error, code: audit.code },
        { status: 400 },
      );
    }

    // PAY-006 & PAY-007: Deduplication & Replay Protection — only after the callback is verified,
    // so a forged request cannot pre-claim a genuine transaction id.
    try {
      await db.insert(webhookEvents).values({
        provider: 'webxpay',
        providerEventId,
        payload: params,
        status: 'PENDING',
      });
    } catch {
      return NextResponse.json({ success: true, deduped: true, code: 'PAY_006_DUPLICATE_IGNORED' });
    }

    const canonicalStatus = mapWebXPayStatus(params.status || params.status_code || '');
    let eventStatus = 'PROCESSED';
    if (canonicalStatus === 'CAPTURED' && order) {
      const result = await settleGatewayPayment({
        orderNumber: order.orderNumber,
        providerRef: params.transaction_id || params.payment_id,
        amount: params.amount,
        currency: params.currency,
      });
      if (!result.settled) eventStatus = 'NEEDS_REVIEW';
    }

    await db
      .update(webhookEvents)
      .set({ status: eventStatus, processedAt: new Date() })
      .where(eq(webhookEvents.providerEventId, providerEventId));

    return NextResponse.json({ success: true, code: 'PAY_PROCESSED' });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}
