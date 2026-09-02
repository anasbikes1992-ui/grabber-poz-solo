import { NextResponse } from 'next/server';
import { eq, ilike } from 'drizzle-orm';
import { db, serialNumbers, products } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    if (!q) return NextResponse.json({ success: false, error: 'q required' }, { status: 400 });

    const rows = await db
      .select({ serial: serialNumbers, product: products })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(ilike(serialNumbers.serial, `%${q}%`))
      .limit(20);

    return NextResponse.json({ success: true, results: rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { serial, productId, variantId, locationType, locationId, warrantyExpires } = body;
    if (!serial || !productId) {
      return NextResponse.json({ success: false, error: 'serial and productId required' }, { status: 400 });
    }

    const [row] = await db
      .insert(serialNumbers)
      .values({
        serial: String(serial).trim().toUpperCase(),
        productId,
        variantId: variantId || null,
        locationType: locationType || 'WAREHOUSE',
        locationId: locationId || null,
        warrantyExpires: warrantyExpires ? new Date(warrantyExpires) : null,
      })
      .returning();

    return NextResponse.json({ success: true, serial: row });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    assertCanMutateCommerce(await getSession());
    const body = await req.json();
    if (!body.serial || !body.orderId) {
      return NextResponse.json({ success: false, error: 'serial and orderId required' }, { status: 400 });
    }
    const [row] = await db
      .update(serialNumbers)
      .set({ status: 'SOLD', orderId: body.orderId })
      .where(eq(serialNumbers.serial, String(body.serial).trim().toUpperCase()))
      .returning();
    if (!row) return NextResponse.json({ success: false, error: 'Serial not found' }, { status: 404 });
    return NextResponse.json({ success: true, serial: row });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
