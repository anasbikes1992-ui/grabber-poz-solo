import { NextResponse } from 'next/server';
import { getPromotionStoreData } from '@/lib/commerce/promotions/redemption-service';
import { isPromotionActive } from '@/lib/commerce/promotions/promotion-engine';

export async function GET() {
  try {
    const { promotions } = await getPromotionStoreData();
    const now = new Date().toISOString();

    const activeDisplayPromotions = promotions
      .filter((p) => {
        const check = isPromotionActive(p, now);
        return check.active && (p.display?.popupEnabled || p.display?.announcementEnabled || p.display?.bannerEnabled);
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        promoCode: p.promoCode,
        isAutomatic: p.isAutomatic,
        discountType: p.discountType,
        discountValue: p.discountValue,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        minimumOrderAmount: p.minimumOrderAmount,
        display: p.display,
      }));

    return NextResponse.json({
      success: true,
      promotions: activeDisplayPromotions,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
