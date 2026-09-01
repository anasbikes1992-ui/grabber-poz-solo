import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, orders, stockBalances, products } from '@/db';
import { getSession } from '@/lib/auth/session';
import { readBusinessProfile } from '@/lib/config/business-settings';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [salesToday] = await db
      .select({ total: sql<string>`coalesce(sum(${orders.grandTotal}), 0)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${todayStart} AND ${orders.orderStatus} != 'DRAFT'`);

    const [ordersToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${todayStart} AND ${orders.orderStatus} != 'DRAFT'`);

    const lowStock = await db
      .select({
        name: products.name,
        onHand: stockBalances.onHand,
      })
      .from(stockBalances)
      .innerJoin(products, sql`${products.id} = ${stockBalances.productId}`)
      .where(sql`${stockBalances.onHand} <= ${products.reorderLevel}`)
      .limit(5);

    const profile = await readBusinessProfile();

    const brief = {
      storeName: profile?.name || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store',
      date: new Date().toISOString().slice(0, 10),
      salesToday: Number(salesToday?.total || 0),
      ordersToday: Number(ordersToday?.count || 0),
      lowStockItems: lowStock.map((r) => ({ name: r.name, onHand: Number(r.onHand) })),
      summary: `Today: ${ordersToday?.count || 0} orders, LKR ${Number(salesToday?.total || 0).toLocaleString('en-LK')} revenue. ${lowStock.length} SKUs at/below reorder level.`,
    };

    return NextResponse.json({ success: true, brief });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
