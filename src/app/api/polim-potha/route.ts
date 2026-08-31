import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, customers, polimPothaAccounts, polimPothaEntries } from '@/db';

export async function GET() {
  try {
    const accounts = await db.select().from(polimPothaAccounts).orderBy(desc(polimPothaAccounts.updatedAt)).limit(200);
    const custs = await db.select().from(customers);
    const cMap = new Map(custs.map((c) => [c.id, c]));
    const entries = await db.select().from(polimPothaEntries).orderBy(desc(polimPothaEntries.createdAt)).limit(50);

    return NextResponse.json({
      success: true,
      accounts: accounts.map((a) => {
        const c = cMap.get(a.customerId);
        const limit = Number(a.creditLimit);
        const balance = Number(a.currentBalance);
        return {
          id: a.customerId,
          accountId: a.id,
          name: c?.name || a.customerId,
          phone: c?.phone || '',
          limit,
          balance,
          available: Math.max(0, limit - balance),
          status: a.status,
        };
      }),
      entries: entries.map((e) => ({
        id: e.id,
        customerId: e.customerId,
        customer: cMap.get(e.customerId)?.name || e.customerId,
        type: e.type,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
        note: e.notes || '',
        date: e.createdAt,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
