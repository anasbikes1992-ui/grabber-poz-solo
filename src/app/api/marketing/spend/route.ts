import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, marketingSpend } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const rows = await db.select().from(marketingSpend).orderBy(desc(marketingSpend.spentOn)).limit(200);
    const byChannel: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const amt = Number(r.amount || 0);
      total += amt;
      byChannel[r.channel] = (byChannel[r.channel] || 0) + amt;
    }
    return NextResponse.json({ success: true, spend: rows, summary: { total, byChannel } });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message, spend: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const amount = Number(body.amount || 0);
    if (!body.channel || !(amount > 0)) {
      return NextResponse.json({ success: false, error: 'channel and positive amount required' }, { status: 400 });
    }

    const [row] = await db
      .insert(marketingSpend)
      .values({
        channel: String(body.channel).toUpperCase(),
        campaignId: body.campaignId ? String(body.campaignId) : null,
        campaignName: body.campaignName ? String(body.campaignName) : null,
        amount: amount.toFixed(2),
        currency: body.currency || 'LKR',
        spentOn: body.spentOn ? new Date(body.spentOn) : new Date(),
        notes: body.notes || null,
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      })
      .returning();

    return NextResponse.json({ success: true, spend: row });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await getSession());
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await db.delete(marketingSpend).where(eq(marketingSpend.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
