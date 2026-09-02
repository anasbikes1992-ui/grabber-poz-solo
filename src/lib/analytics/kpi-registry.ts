import { eq } from 'drizzle-orm';
import { db, orders, orderItems, products } from '@/db';
import { completedOrderFilter, startOfToday, daysAgo, sumOrderRevenue } from '@/lib/commerce/sales-metrics';

export type KpiId =
  | 'today_revenue'
  | 'week_revenue'
  | 'month_revenue'
  | 'today_orders'
  | 'avg_order_value'
  | 'sales_by_channel';

const ALL_KPIS: KpiId[] = [
  'today_revenue',
  'week_revenue',
  'month_revenue',
  'today_orders',
  'avg_order_value',
  'sales_by_channel',
];

async function loadOrderTotals(from: Date) {
  const rows = await db
    .select({ id: orders.id, grandTotal: orders.grandTotal, channel: orders.channel })
    .from(orders)
    .where(completedOrderFilter(from));
  return rows;
}

export async function computeKpis(ids: KpiId[] = ALL_KPIS) {
  const want = new Set(ids);
  const today = startOfToday();
  const weekFrom = daysAgo(7);
  const monthFrom = daysAgo(30);

  const [todayRows, weekRows, monthRows] = await Promise.all([
    want.has('today_revenue') || want.has('today_orders') || want.has('avg_order_value')
      ? loadOrderTotals(today)
      : Promise.resolve([]),
    want.has('week_revenue') ? loadOrderTotals(weekFrom) : Promise.resolve([]),
    want.has('month_revenue') || want.has('avg_order_value') || want.has('sales_by_channel')
      ? loadOrderTotals(monthFrom)
      : Promise.resolve([]),
  ]);

  const result: Record<string, unknown> = {};

  if (want.has('today_revenue')) result.today_revenue = sumOrderRevenue(todayRows);
  if (want.has('week_revenue')) result.week_revenue = sumOrderRevenue(weekRows);
  if (want.has('month_revenue')) result.month_revenue = sumOrderRevenue(monthRows);
  if (want.has('today_orders')) result.today_orders = todayRows.length;
  if (want.has('avg_order_value')) {
    result.avg_order_value =
      monthRows.length > 0 ? sumOrderRevenue(monthRows) / monthRows.length : 0;
  }
  if (want.has('sales_by_channel')) {
    const channelMap = new Map<string, { channel: string; count: number; revenue: number }>();
    for (const row of monthRows) {
      const key = row.channel || 'POS';
      const cur = channelMap.get(key) || { channel: key, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(row.grandTotal || 0);
      channelMap.set(key, cur);
    }
    result.sales_by_channel = Array.from(channelMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  return result;
}

export function parseKpiIds(raw: string | null): KpiId[] {
  if (!raw || raw === 'all') return ALL_KPIS;
  const picked = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as KpiId[];
  return picked.length ? picked : ALL_KPIS;
}
