import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, products, wishlists } from '@/db';
import { getCustomerSession } from '@/lib/auth/customer-session';

/** GET — current shopper wishlist (session required) */
export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required', code: 'AUTH' }, { status: 401 });
    }

    const rows = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        name: products.name,
        slug: products.slug,
        salePrice: products.salePrice,
        imageUrl: products.imageUrl,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.customerId, session.customerId));

    return NextResponse.json({ success: true, items: rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** POST { productId, action?: 'toggle'|'add'|'remove' } */
export async function POST(req: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required', code: 'AUTH' }, { status: 401 });
    }

    const body = await req.json();
    const productId = String(body.productId || '');
    const action = (body.action as string) || 'toggle';
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
    }

    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.customerId, session.customerId), eq(wishlists.productId, productId)))
      .limit(1);

    if (action === 'remove' || (action === 'toggle' && existing)) {
      if (existing) {
        await db.delete(wishlists).where(eq(wishlists.id, existing.id));
      }
      return NextResponse.json({ success: true, wished: false });
    }

    if (!existing) {
      await db.insert(wishlists).values({
        customerId: session.customerId,
        productId,
      });
    }
    return NextResponse.json({ success: true, wished: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
