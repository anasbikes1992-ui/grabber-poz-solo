import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, webhookEvents } from '@/db';
import { settleGatewayPayment } from '@/lib/commerce/payment-settlement';
import { getPayHereConfig } from '@/lib/payments/lkr-provider';
import {
  payHereWebhookSecretRequired,
  verifyPayHereSignature,
  auditPayHereWebhook,
} from '@/lib/payments/payhere-signature';

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

    const { secret, merchantId } = getPayHereConfig();
    const providerEventId = params.payment_id || params.order_id || `evt_${Date.now()}`;
    const orderNumber = params.order_id;

    if (payHereWebhookSecretRequired() && !secret) {
      return NextResponse.json(
        { success: false, error: 'PayHere secret required in production' },
        { status: 503 },
      );
    }

    // Lookup referenced order
    const [order] = orderNumber
      ? await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)
      : [null];

    // PAY-001 through PAY-008 Comprehensive Security Audit
    const audit = auditPayHereWebhook({
      params,
      expectedMerchantId: merchantId,
      expectedSecret: secret,
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

    // PAY-006 & PAY-007: Deduplication & Replay Protection.
    // Recorded only AFTER the signature/amount audit passes, so a forged callback cannot
    // pre-claim a genuine payment_id and block the real notification.
    try {
      await db.insert(webhookEvents).values({
        provider: 'payhere',
        providerEventId,
        payload: params,
        status: 'PENDING',
      });
    } catch {
      return NextResponse.json({ success: true, deduped: true, code: 'PAY_006_DUPLICATE_IGNORED' });
    }

    const statusCode = params.status_code;
    let eventStatus = 'PROCESSED';
    if (statusCode === '2' && order) {
      const result = await settleGatewayPayment({
        orderNumber: order.orderNumber,
        providerRef: params.payment_id,
        amount: params.payhere_amount,
        currency: params.payhere_currency,
      });
      // Paid after the hold expired (stock already released): flag for manual refund.
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

