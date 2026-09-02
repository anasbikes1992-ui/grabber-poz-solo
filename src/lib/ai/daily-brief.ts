import { sql } from 'drizzle-orm';
import { db, orders, stockBalances, products } from '@/db';
import { readBusinessProfile } from '@/lib/config/business-settings';

export type DailyBrief = {
  storeName: string;
  date: string;
  salesToday: number;
  ordersToday: number;
  lowStockItems: Array<{ name: string; onHand: number }>;
  summary: string;
};

export async function buildDailyBrief(): Promise<DailyBrief> {
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
  const sales = Number(salesToday?.total || 0);
  const count = Number(ordersToday?.count || 0);

  return {
    storeName: profile?.name || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Store',
    date: new Date().toISOString().slice(0, 10),
    salesToday: sales,
    ordersToday: count,
    lowStockItems: lowStock.map((r) => ({ name: r.name, onHand: Number(r.onHand) })),
    summary: `Today: ${count} orders, LKR ${sales.toLocaleString('en-LK')} revenue. ${lowStock.length} SKUs at/below reorder level.`,
  };
}
