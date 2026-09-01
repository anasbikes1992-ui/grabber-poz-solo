import { NextResponse } from 'next/server';
import { and, desc, eq, gte, inArray, ne } from 'drizzle-orm';
import { db, orders, orderItems, products } from '@/db';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedFilter = and(ne(orders.orderStatus, 'DRAFT'), ne(orders.orderStatus, 'CANCELLED'));

    const todaySales = await db
      .select({ id: orders.id, grandTotal: orders.grandTotal, orderNumber: orders.orderNumber, createdAt: orders.createdAt })
      .from(orders)
      .where(and(completedFilter, gte(orders.createdAt, todayStart)))
      .orderBy(desc(orders.createdAt));

    const weekSales = await db
      .select({ grandTotal: orders.grandTotal })
      .from(orders)
      .where(and(completedFilter, gte(orders.createdAt, weekStart)));

    const monthSales = await db
      .select({ id: orders.id, grandTotal: orders.grandTotal, channel: orders.channel })
      .from(orders)
      .where(and(completedFilter, gte(orders.createdAt, monthStart)));

    const recentSales = todaySales.slice(0, 20).map((s) => ({
      id: s.id,
      receiptNo: s.orderNumber,
      total: Number(s.grandTotal),
      method: 'CARD',
      createdAt: s.createdAt,
    }));

    const monthIds = monthSales.map((s) => s.id);
    let topProducts: Array<{ name: string; quantity: number; revenue: number }> = [];
    if (monthIds.length > 0) {
      const lines = await db
        .select({
          name: products.name,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, monthIds));

      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const line of lines) {
        const cur = productMap.get(line.name) || { name: line.name, quantity: 0, revenue: 0 };
        cur.quantity += line.quantity;
        cur.revenue += Number(line.lineTotal || 0);
        productMap.set(line.name, cur);
      }
      topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    }

    const channelMap = new Map<string, { source: string; count: number; revenue: number }>();
    for (const s of monthSales) {
      const key = s.channel || 'POS';
      const cur = channelMap.get(key) || { source: key, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(s.grandTotal || 0);
      channelMap.set(key, cur);
    }

    const metrics = {
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((a, s) => a + Number(s.grandTotal || 0), 0),
      weekSales: weekSales.length,
      weekRevenue: weekSales.reduce((a, s) => a + Number(s.grandTotal || 0), 0),
      monthSales: monthSales.length,
      monthRevenue: monthSales.reduce((a, s) => a + Number(s.grandTotal || 0), 0),
      avgOrderValue:
        monthSales.length > 0
          ? monthSales.reduce((a, s) => a + Number(s.grandTotal || 0), 0) / monthSales.length
          : 0,
      topProducts,
      salesBySource: Array.from(channelMap.values()),
      recentSales,
    };

    return NextResponse.json({ success: true, metrics });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
