import { NextResponse } from 'next/server';
import { searchStorefrontProducts } from '@/lib/storefront/catalog-server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const products = await searchStorefrontProducts(q, { categorySlug: category, limit: 50 });
    return NextResponse.json({ success: true, products, query: q });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, products: [] }, { status: 500 });
  }
}
