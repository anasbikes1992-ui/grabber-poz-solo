/**
 * Shared sales metrics — single filter logic for dashboard, Jarvis, and reports.
 */
import { and, gte, ne, type SQL } from 'drizzle-orm';
import { orders } from '@/db/schema';

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Orders that count toward revenue (excludes draft/cancelled). */
export function completedOrderFilter(from: Date): SQL {
  return and(
    gte(orders.createdAt, from),
    ne(orders.orderStatus, 'DRAFT'),
    ne(orders.orderStatus, 'CANCELLED'),
  )!;
}

export function sumOrderRevenue(
  rows: Array<{ grandTotal?: string | number | null }>,
): number {
  return rows.reduce((acc, o) => acc + Number(o.grandTotal || 0), 0);
}
