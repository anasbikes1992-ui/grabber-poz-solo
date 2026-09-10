import { eq, sql } from 'drizzle-orm';
import { db, marketingSpend } from '@/db';

export async function sumSpendForChannel(channel: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${marketingSpend.amount}::numeric), 0)` })
    .from(marketingSpend)
    .where(eq(marketingSpend.channel, channel.toUpperCase()));
  return Number(row?.total || 0);
}

export async function sumSpendAll(): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${marketingSpend.amount}::numeric), 0)` })
    .from(marketingSpend);
  return Number(row?.total || 0);
}
