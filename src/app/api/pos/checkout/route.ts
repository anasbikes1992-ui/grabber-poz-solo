import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { durableCheckout } from '@/lib/db/repositories/checkout-repo';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { db, branches, customers, tradeInVouchers } from '@/db';
import { evaluatePromotion, evaluateCartPromotions } from '@/lib/commerce/promotion-engine';
import { listPromotions, recordPromotionRedemption } from '@/lib/config/promotions-store';
import { applyTradeInCredit } from '@/lib/trade-in/trade-in-service';

type BodyLine = {
  productId?: string;
  id?: string;
  variantId?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  name?: string;
  unitCost?: number;
};

type PaymentLine = { method?: string; amount?: number };

/** Match durableCheckout tax math (18% VAT on discounted subtotal). */
function computeGrandTotal(subtotal: number, discountTotal: number) {
  const taxable = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxable * 0.18 * 100) / 100;
  return taxable + taxTotal;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const channel = (body.channel || 'POS') as string;
    const isStorefront = channel === 'STOREFRONT';

    let session = await getSession();
    const shopper = await getCustomerSession();

    if (isStorefront) {
      if (!shopper && process.env.NODE_ENV === 'production' && process.env.AUTH_OPTIONAL !== 'true') {
        return NextResponse.json({ success: false, error: 'Sign in as a customer to checkout' }, { status: 401 });
      }
    } else if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    let branchId = body.branchId || body.fulfillmentLocationId;
    if (!branchId) {
      const [b] = await db.select().from(branches).limit(1);
      branchId = b?.id;
    }
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId is required — run POST /api/seed' },
        { status: 400 },
      );
    }

    const rawLines: BodyLine[] = Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.lines)
        ? body.lines
        : [];

    const items = rawLines.map((l) => ({
      productId: String(l.productId || l.id),
      variantId: l.variantId ? String(l.variantId) : undefined,
      name: l.name,
      quantity: Number(l.quantity ?? l.qty ?? 0),
      unitPrice: Number(l.unitPrice ?? 0),
      unitCost: l.unitCost != null ? Number(l.unitCost) : undefined,
    }));

    const itemSubtotal = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const itemCount = items.reduce((s, l) => s + l.quantity, 0);
    let discountTotal = Number(body.discountTotal) || 0;
    let promoRuleId: string | undefined;

    const rules = await listPromotions();

    let customerSegment: string | undefined;
    const customerIdPreview =
      body.customerId || (isStorefront && shopper ? shopper.customerId : undefined);
    if (customerIdPreview) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, customerIdPreview)).limit(1);
      customerSegment = cust?.segment;
    }

    const auto = evaluateCartPromotions(rules, {
      subtotal: itemSubtotal,
      itemCount,
      channel,
      segment: customerSegment,
    });
    if (auto.valid && auto.rule) {
      discountTotal += auto.discountTotal;
      promoRuleId = auto.rule.id;
    }

    if (body.promoCode) {
      const promo = evaluatePromotion(rules, body.promoCode, itemSubtotal);
      if (!promo.valid) {
        return NextResponse.json({ success: false, error: promo.error || 'Invalid promo code' }, { status: 400 });
      }
      discountTotal += promo.discountTotal;
      promoRuleId = promo.rule?.id;
    }

    const tradeInVoucherNumber = body.tradeInVoucherNumber as string | undefined;
    let tradeInCredit = Number(body.tradeInCredit) || 0;
    if (tradeInVoucherNumber) {
      const [v] = await db
        .select()
        .from(tradeInVouchers)
        .where(eq(tradeInVouchers.voucherNumber, tradeInVoucherNumber))
        .limit(1);
      if (!v || v.status !== 'ISSUED') {
        return NextResponse.json({ success: false, error: 'Trade-in voucher invalid or already used' }, { status: 400 });
      }
      tradeInCredit = Number(v.appraisalValue);
      discountTotal += Math.min(tradeInCredit, itemSubtotal);
    }

    const rawPayments: PaymentLine[] = Array.isArray(body.payments) ? body.payments : [];
    let paymentMethod = String(
      body.paymentMethod || rawPayments[0]?.method || (isStorefront ? 'COD' : 'CASH'),
    ).toUpperCase();

    let payments:
      | Array<{ method: 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'PAYHERE' | 'WEBXPAY' | 'STRIPE'; amount: number }>
      | undefined;

    if (paymentMethod === 'SPLIT' || rawPayments.length > 1) {
      payments = rawPayments
        .filter((p) => p.method && p.amount != null)
        .map((p) => ({
          method: String(p.method).toUpperCase() as 'CASH' | 'CARD',
          amount: Number(p.amount),
        }));
      if (payments.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Split payment requires cash and card amounts' },
          { status: 400 },
        );
      }
      const expectedTotal = computeGrandTotal(itemSubtotal, discountTotal);
      const paySum = payments.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(paySum - expectedTotal) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Split payment total (${paySum.toFixed(2)}) must equal order total (${expectedTotal.toFixed(2)})`,
          },
          { status: 400 },
        );
      }
      paymentMethod = 'SPLIT';
    }

    const amount =
      body.amount != null
        ? Number(body.amount)
        : rawPayments[0]?.amount != null
          ? Number(rawPayments[0].amount)
          : undefined;

    const customerId =
      body.customerId || (isStorefront && shopper ? shopper.customerId : undefined);

    const orderNumber =
      body.orderNumber ||
      (isStorefront ? `WEB-${Date.now().toString().slice(-8)}` : undefined);

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : undefined;

    const resolvedMethod =
      paymentMethod === 'SPLIT'
        ? 'CASH'
        : (paymentMethod as 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'PAYHERE' | 'WEBXPAY' | 'STRIPE');

    const result = await durableCheckout({
      orderNumber,
      channel: channel as 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'JARVIS' | 'MANUAL' | 'IMPORT' | 'API',
      branchId,
      registerId: body.registerId,
      shiftId: body.shiftId,
      customerId,
      items,
      paymentMethod: resolvedMethod,
      payments,
      amount,
      clientUuid: body.clientUuid,
      idempotencyKey: body.idempotencyKey || body.clientUuid,
      actorId,
      discountTotal,
      promoRuleId,
      terminalId: body.terminalId,
      clientSequence: body.clientSequence != null ? Number(body.clientSequence) : undefined,
      allowStockUnderrun: Boolean(body.offlineSync || body.allowStockUnderrun),
    });

    if (!result.reused && promoRuleId) {
      await recordPromotionRedemption(promoRuleId);
    }

    if (tradeInVoucherNumber && result.order?.id) {
      await applyTradeInCredit(db, tradeInVoucherNumber, result.order.id);
    }

    return NextResponse.json({
      success: true,
      reused: result.reused,
      orderNumber: result.order?.orderNumber,
      order: result.order,
      payment: 'payment' in result ? result.payment : null,
      journalEntryId: 'journalEntryId' in result ? result.journalEntryId : null,
      grandTotal: 'grandTotal' in result ? result.grandTotal : Number(result.order?.grandTotal),
      isSplit: 'isSplit' in result ? result.isSplit : false,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Checkout failed' },
      { status: e.status || 400 },
    );
  }
}
