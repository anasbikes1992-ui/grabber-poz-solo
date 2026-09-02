import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, abandonedCarts } from '@/db';
import { recordAbandonedCheckout } from '@/lib/commerce/abandoned-checkout';

/** Storefront: record cart abandonment + schedule WhatsApp recovery (~30 min) */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const cart = (body.cart || []) as Array<{
      productId: string;
      variantId?: string;
      name: string;
      unitPrice: number;
      qty: number;
    }>;
    const customerId = body.customerId as string | undefined;
    const promoCode = body.promoCode as string | undefined;

    if (!phone || !cart.length) {
      return NextResponse.json({ success: false, error: 'phone and cart required' }, { status: 400 });
    }

    const result = await recordAbandonedCheckout(db, { phone, customerId, cart, promoCode });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** Restore abandoned cart by recovery token */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 });
    }
    const [cart] = await db.select().from(abandonedCarts).where(eq(abandonedCarts.recoveryToken, token)).limit(1);
    if (!cart || cart.status !== 'OPEN') {
      return NextResponse.json({ success: false, error: 'Recovery link expired or used' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      cart: cart.cartJson,
      promoCode: cart.promoCode,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
