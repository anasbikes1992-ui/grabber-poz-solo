import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, products, productVariants } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

/** Bulk create size × color variant matrix for a product. */
export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const { productId, sizes = [], colors = [], baseSku, basePrice } = body as {
      productId: string;
      sizes: string[];
      colors: string[];
      baseSku?: string;
      basePrice?: number;
    };

    if (!productId || !sizes.length || !colors.length) {
      return NextResponse.json({ success: false, error: 'productId, sizes, colors required' }, { status: 400 });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    const created = [];
    for (const size of sizes) {
      for (const color of colors) {
        const name = `${size} / ${color}`;
        const sku = `${baseSku || product.sku}-${size}-${color}`.replace(/\s+/g, '-').toUpperCase();
        const [variant] = await db
          .insert(productVariants)
          .values({
            productId,
            name,
            sku: sku.slice(0, 60),
            barcode: `${890123}${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 9)}`,
            salePrice: String((basePrice ?? Number(product.salePrice)).toFixed(2)),
            costPrice: product.costPrice,
            attributesJson: { Size: size, Color: color },
          })
          .onConflictDoNothing()
          .returning();
        if (variant) created.push(variant);
      }
    }

    return NextResponse.json({ success: true, created: created.length, variants: created });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
