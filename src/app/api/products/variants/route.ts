import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, productVariants, stockBalances, branches } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const productId = String(body.productId || '');
    const name = String(body.name || '').trim();
    const sku = String(body.sku || '').trim();
    if (!productId || !name || !sku) {
      return NextResponse.json({ success: false, error: 'productId, name, sku required' }, { status: 400 });
    }

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        name,
        sku,
        barcode: body.barcode || sku,
        costPrice: body.costPrice != null ? String(Number(body.costPrice).toFixed(2)) : null,
        salePrice: body.salePrice != null ? String(Number(body.salePrice).toFixed(2)) : null,
        attributesJson: body.attributes || { variant: name },
        active: true,
      })
      .returning();

    const initialStock = Number(body.stock ?? 0);
    const [branch] = await db.select().from(branches).limit(1);
    if (branch && initialStock > 0) {
      await db.insert(stockBalances).values({
        locationType: 'BRANCH',
        locationId: branch.id,
        productId,
        variantId: variant.id,
        onHand: initialStock,
        reserved: 0,
        damaged: 0,
      });
    }

    return NextResponse.json({ success: true, variant });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (body.name != null) patch.name = body.name;
    if (body.sku != null) patch.sku = body.sku;
    if (body.barcode != null) patch.barcode = body.barcode;
    if (body.salePrice != null) patch.salePrice = String(Number(body.salePrice).toFixed(2));
    if (body.costPrice != null) patch.costPrice = String(Number(body.costPrice).toFixed(2));
    if (body.active != null) patch.active = body.active;

    const [variant] = await db.update(productVariants).set(patch).where(eq(productVariants.id, id)).returning();
    if (!variant) return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    return NextResponse.json({ success: true, variant });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
