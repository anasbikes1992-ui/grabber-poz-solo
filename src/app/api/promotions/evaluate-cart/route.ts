import { NextResponse } from 'next/server';
import { evaluateCartPromotions } from '@/lib/commerce/promotion-engine';
import { listPromotions } from '@/lib/config/promotions-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subtotal = Number(body.subtotal) || 0;
    const itemCount = Number(body.itemCount) || Number(body.items?.length) || 0;
    const channel = body.channel ? String(body.channel) : undefined;
    const segment = body.segment ? String(body.segment) : undefined;

    const rules = await listPromotions();
    const auto = evaluateCartPromotions(rules, { subtotal, itemCount, channel, segment });

    return NextResponse.json({
      success: true,
      autoApply: auto.valid
        ? {
            discountTotal: auto.discountTotal,
            rule: auto.rule
              ? { id: auto.rule.id, code: auto.rule.code, type: auto.rule.type, value: auto.rule.value }
              : undefined,
          }
        : null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
