import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, branches, customers } from '@/db';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { durableCheckout } from '@/lib/db/repositories/checkout-repo';
import { evaluateCartPromotions, evaluatePromotion } from '@/lib/commerce/promotion-engine';
import { listPromotions, recordPromotionRedemption } from '@/lib/config/promotions-store';
import { buildPayHereCheckoutPayload } from '@/lib/payments/payhere-checkout';
import { isPayHereConfigured } from '@/lib/payments/lkr-provider';
import { loadAuthoritativeLines } from '@/lib/commerce/load-catalog-pricing';

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isPayHereConfigured(),
    provider: 'PAYHERE',
  });
}

export async function POST(req: Request) {
  try {
    const shopper = await getCustomerSession();
    if (!shopper && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
    }

    if (!isPayHereConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'PayHere not configured' }, { status: 503 });
      }
    }

    const body = await req.json();
    const rawItems = (body.items || []) as Array<{
      productId: string;
      variantId?: string;
      name?: string;
      quantity: number;
    }>;

    if (!rawItems.length) {
      return NextResponse.json({ success: false, error: 'Cart items required' }, { status: 400 });
    }

    const intent = rawItems.map((l) => ({
      productId: String(l.productId),
      variantId: l.variantId ? String(l.variantId) : undefined,
      quantity: Number(l.quantity),
    }));
    const catalogLines = await loadAuthoritativeLines(db, intent);

    const [branch] = await db.select().from(branches).limit(1);
    if (!branch) {
      return NextResponse.json({ success: false, error: 'No branch — run POST /api/seed' }, { status: 400 });
    }

    const itemSubtotal = catalogLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const itemCount = catalogLines.reduce((s, l) => s + l.quantity, 0);

    let customerSegment: string | undefined;
    if (shopper?.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, shopper.customerId)).limit(1);
      customerSegment = cust?.segment;
    }

    const rules = await listPromotions();
    let discountTotal = 0;
    let promoRuleId: string | undefined;

    const auto = evaluateCartPromotions(rules, {
      subtotal: itemSubtotal,
      itemCount,
      channel: 'STOREFRONT',
      segment: customerSegment,
    });
    if (auto.valid && auto.rule) {
      discountTotal += auto.discountTotal;
      promoRuleId = auto.rule.id;
    }

    if (body.promoCode) {
      const promo = evaluatePromotion(rules, body.promoCode, itemSubtotal);
      if (!promo.valid) {
        return NextResponse.json({ success: false, error: promo.error || 'Invalid promo' }, { status: 400 });
      }
      discountTotal += promo.discountTotal;
      promoRuleId = promo.rule?.id;
    }

    const orderNumber = `WEB-${Date.now().toString().slice(-8)}`;
    const clientUuid = body.clientUuid || crypto.randomUUID?.() || `web_${Date.now()}`;

    const result = await durableCheckout({
      orderNumber,
      channel: 'STOREFRONT',
      branchId: branch.id,
      customerId: shopper?.customerId,
      paymentMethod: 'PAYHERE',
      items: intent,
      discountTotal,
      promoRuleId,
      clientUuid,
      idempotencyKey: `payhere_${clientUuid}`,
    });

    if (promoRuleId) await recordPromotionRedemption(promoRuleId);

    const [customer] = shopper?.customerId
      ? await db.select().from(customers).where(eq(customers.id, shopper.customerId)).limit(1)
      : [null];

    if (!isPayHereConfigured()) {
      return NextResponse.json({
        success: true,
        stub: true,
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        grandTotal: result.grandTotal,
        note: 'Dev stub — set PAYHERE_MERCHANT_ID and PAYHERE_SECRET for live redirect',
      });
    }

    const payload = buildPayHereCheckoutPayload({
      orderNumber: result.order.orderNumber,
      amount: Number(result.grandTotal),
      itemsDescription: catalogLines.map((i) => `${i.quantity}x ${i.name}`).join(', '),
      customerName: customer?.name,
      customerPhone: customer?.phone,
      customerEmail: customer?.email || undefined,
    });

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      grandTotal: result.grandTotal,
      payhere: payload,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
