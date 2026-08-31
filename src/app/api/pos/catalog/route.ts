import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, products, stockBalances, branches } from '@/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let branchId = searchParams.get('branchId');
    if (!branchId) {
      const [b] = await db.select().from(branches).limit(1);
      branchId = b?.id || null;
    }
    const catalog = await db.select().from(products).where(eq(products.isActive, true)).limit(500);
    const stocks = branchId
      ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branchId))
      : [];
    const stockMap = new Map(stocks.map((s) => [s.productId, s.onHand]));
    return NextResponse.json({
      success: true,
      branchId,
      items: catalog.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unitPrice: Number(p.salePrice),
        unitCost: Number(p.costPrice),
        stock: stockMap.get(p.id) ?? 0,
        variant: p.sku,
      })),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message, items: [] }, { status: 500 });
  }
}
