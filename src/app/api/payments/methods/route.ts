import { NextResponse } from 'next/server';
import { db, businessConfig } from '@/db';
import { defaultPaymentService } from '@/lib/payments/payment-service';
import type { PaymentChannel, PaymentGatewayId } from '@/lib/payments/payment-types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = (searchParams.get('channel')?.toUpperCase() || 'STOREFRONT') as PaymentChannel;
    const currency = searchParams.get('currency') || 'LKR';

    const rows = await db.select().from(businessConfig).limit(1);
    const config = (rows[0]?.configJson as Record<string, any>) || {};
    const paymentConfigs = config.paymentGateways || {};

    const available = defaultPaymentService.getAvailableGateways({ channel, currency });

    // Filter by owner settings if saved, otherwise default
    const result = available
      .filter((gw) => {
        const saved = paymentConfigs[gw.id];
        if (saved && saved.enabled === false) return false;
        if (channel === 'STOREFRONT' && saved && saved.storefrontEnabled === false) return false;
        if (channel === 'POS' && saved && saved.posEnabled === false) return false;
        return true;
      })
      .map((gw) => {
        const saved = paymentConfigs[gw.id] || {};
        return {
          id: gw.id,
          name: saved.displayName || gw.name,
          isBNPL: gw.id === 'KOKO' || gw.id === 'MINTPAY' || gw.id === 'PAYZY',
          installments: gw.id === 'KOKO' || gw.id === 'MINTPAY' ? 3 : undefined,
        };
      });

    return NextResponse.json({ success: true, channel, methods: result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
