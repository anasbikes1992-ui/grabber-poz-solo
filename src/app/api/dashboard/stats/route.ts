import { NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import {
  db,
  products,
  stockBalances,
  orders,
  orderItems,
  businessProfile,
  branches,
} from '@/db';
import { getSession } from '@/lib/auth/session';
import { completedOrderFilter, startOfToday, sumOrderRevenue } from '@/lib/commerce/sales-metrics';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [branch] = await db.select().from(branches).limit(1);
    const branchId = branch?.id;

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        salePrice: products.salePrice,
        reorderLevel: products.reorderLevel,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .limit(500);

    const stocks = branchId
      ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branchId))
      : await db.select().from(stockBalances).limit(500);

    const stockMap = new Map(stocks.map((s) => [s.productId, s.onHand]));
    let totalSkus = productRows.length;
    let lowStockCount = 0;
    let totalStockValue = 0;
    const lowStockItems: Array<{ sku: string; name: string; stock: number; reorder: number }> = [];

    for (const p of productRows) {
      const stock = stockMap.get(p.id) ?? 0;
      totalStockValue += Number(p.salePrice) * stock;
      if (stock < (p.reorderLevel ?? 10)) {
        lowStockCount++;
        if (lowStockItems.length < 5) {
          lowStockItems.push({
            sku: p.barcode || p.sku,
            name: p.name,
            stock,
            reorder: p.reorderLevel ?? 10,
          });
        }
      }
    }

    const today = startOfToday();
    const todayOrders = await db
      .select({
        id: orders.id,
        grandTotal: orders.grandTotal,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(completedOrderFilter(today))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const todayRevenue = sumOrderRevenue(todayOrders);

    let topProducts: Array<{ name: string; soldQty: number; revenue: number }> = [];
    if (todayOrders.length > 0) {
      const ids = todayOrders.map((o) => o.id);
      const lines = await db
        .select({
          name: products.name,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, ids));

      const agg = new Map<string, { name: string; soldQty: number; revenue: number }>();
      for (const line of lines) {
        const cur = agg.get(line.name) || { name: line.name, soldQty: 0, revenue: 0 };
        cur.soldQty += line.quantity;
        cur.revenue += Number(line.lineTotal || 0);
        agg.set(line.name, cur);
      }
      topProducts = Array.from(agg.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }

    const [profile] = await db.select().from(businessProfile).limit(1);
    const warehouseCapacity = Math.min(
      100,
      Math.max(15, Math.round((totalSkus / Math.max(totalSkus + 20, 1)) * 100)),
    );

    const payload = {
      todaySalesLKR: todayRevenue,
      todayRevenue,
      todayBillsCount: todayOrders.length,
      totalSkus,
      totalStockValueLKR: totalStockValue,
      lowStockCount,
      lowStockItems,
      warehouseCapacity,
      turnoverRate: todayRevenue > 0 ? Math.min(100, 18 + todayOrders.length) : 18,
      topProducts,
      recentSales: todayOrders.slice(0, 5).map((o) => ({
        receiptNo: o.orderNumber,
        total: Number(o.grandTotal),
        createdAt: o.createdAt,
      })),
    };

    return NextResponse.json({
      success: true,
      orgName: profile?.name || 'Shopping Station',
      orgSlug: profile?.primaryDomain || 'store',
      stats: payload,
      metrics: payload,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
