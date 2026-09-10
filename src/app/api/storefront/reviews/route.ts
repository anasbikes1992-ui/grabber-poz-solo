import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, products, productReviews } from '@/db';
import { getCustomerSession } from '@/lib/auth/customer-session';

/** GET ?productId=… or ?slug=… — public review list + aggregate */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let productId = searchParams.get('productId');
    const slug = searchParams.get('slug');

    if (!productId && slug) {
      const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
      productId = row?.id ?? null;
    }
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId or slug required' }, { status: 400 });
    }

    const rows = await db
      .select({
        id: productReviews.id,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        customerName: productReviews.customerName,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt))
      .limit(50);

    const count = rows.length;
    const avg = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;

    return NextResponse.json({
      success: true,
      productId,
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: count,
      reviews: rows,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

/** POST — create review (shopper session) */
export async function POST(req: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sign in required', code: 'AUTH' }, { status: 401 });
    }

    const body = await req.json();
    const productId = String(body.productId || '');
    const rating = Number(body.rating);
    const title = body.title ? String(body.title).slice(0, 120) : null;
    const text = body.body ? String(body.body).slice(0, 2000) : null;

    if (!productId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'productId and rating 1–5 required' }, { status: 400 });
    }

    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const existing = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(and(eq(productReviews.customerId, session.customerId), eq(productReviews.productId, productId)))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(productReviews)
        .set({
          rating: Math.round(rating),
          title,
          body: text,
          customerName: session.name,
        })
        .where(eq(productReviews.id, existing[0].id))
        .returning();
      return NextResponse.json({ success: true, review: updated, updated: true });
    }

    const [created] = await db
      .insert(productReviews)
      .values({
        customerId: session.customerId,
        productId,
        rating: Math.round(rating),
        title,
        body: text,
        customerName: session.name,
      })
      .returning();

    return NextResponse.json({ success: true, review: created });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
