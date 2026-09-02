import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, products, businessProfile } from '@/db';
import { getSession } from '@/lib/auth/session';

/** Meta / Facebook catalog feed (RSS-style XML) from live products. */
export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bp] = await db.select().from(businessProfile).limit(1);
    const storeName = bp?.name || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store';
    const baseUrl = process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const catalog = await db.select().from(products).where(eq(products.isActive, true)).limit(500);

    const items = catalog
      .map((p) => {
        const link = `${baseUrl}/products/${p.slug}`;
        const price = Number(p.salePrice).toFixed(2);
        const image = p.imageUrl || '';
        return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.name} — SKU ${p.sku}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${image}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:price>${price} LKR</g:price>
      <g:brand><![CDATA[${storeName}]]></g:brand>
      <g:condition>new</g:condition>
    </item>`;
      })
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${storeName} Catalog</title>
    <link>${baseUrl}</link>
    <description>Product catalog for Meta / Google Shopping</description>${items}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'inline; filename="meta-catalog.xml"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
