import { NextResponse } from 'next/server';
import { evaluatePromotion } from '@/lib/commerce/promotion-engine';
import { listPromotions } from '@/lib/config/promotions-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body.code || body.promoCode;
    const subtotal = Number(body.subtotal) || 0;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Promo code required' }, { status: 400 });
    }

    const rules = await listPromotions();
    const result = evaluatePromotion(rules, code, subtotal);

    return NextResponse.json({
      success: result.valid,
      valid: result.valid,
      discountTotal: result.discountTotal,
      rule: result.rule
        ? { id: result.rule.id, code: result.rule.code, type: result.rule.type, value: result.rule.value }
        : undefined,
      error: result.error,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
