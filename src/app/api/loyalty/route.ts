import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, loyaltyMembers, loyaltyTransactions } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

function tierForSpend(totalSpent: number): 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (totalSpent >= 100000) return 'PLATINUM';
  if (totalSpent >= 25000) return 'GOLD';
  return 'SILVER';
}

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const members = await db.select().from(loyaltyMembers).orderBy(desc(loyaltyMembers.points)).limit(200);
    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        points: m.points,
        tier: m.tier,
        totalSpent: Number(m.totalSpent),
        lastVisit: m.lastVisitAt,
      })),
      rules: { earnPerHundredLkr: 1, redeemValuePerPointLkr: 1 },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, members: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const action = body.action || 'upsert_member';

    if (action === 'earn' || action === 'redeem') {
      const [member] = await db.select().from(loyaltyMembers).where(eq(loyaltyMembers.id, body.memberId)).limit(1);
      if (!member) throw new Error('Member not found');
      const delta =
        action === 'earn'
          ? Math.floor(Number(body.amountLkr || 0) / 100)
          : -Math.abs(Number(body.points || 0));
      if (action === 'redeem' && member.points + delta < 0) throw new Error('Insufficient points');
      const balanceAfter = member.points + delta;
      const totalSpent =
        action === 'earn' ? Number(member.totalSpent) + Number(body.amountLkr || 0) : Number(member.totalSpent);

      await db.insert(loyaltyTransactions).values({
        memberId: member.id,
        type: action === 'earn' ? 'EARN' : 'REDEEM',
        pointsDelta: delta,
        balanceAfter,
        orderId: body.orderId || null,
        notes: body.notes || null,
      });

      const [updated] = await db
        .update(loyaltyMembers)
        .set({
          points: balanceAfter,
          totalSpent: totalSpent.toFixed(2),
          tier: tierForSpend(totalSpent),
          lastVisitAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyMembers.id, member.id))
        .returning();

      return NextResponse.json({ success: true, member: updated });
    }

    const phone = String(body.phone || '').trim();
    const name = String(body.name || '').trim();
    if (!phone || !name) throw new Error('name and phone required');

    const [existing] = await db.select().from(loyaltyMembers).where(eq(loyaltyMembers.phone, phone)).limit(1);
    if (existing) {
      return NextResponse.json({ success: true, member: existing, reused: true });
    }

    const [member] = await db
      .insert(loyaltyMembers)
      .values({
        customerId: body.customerId || null,
        name,
        phone,
        points: Number(body.points || 0),
        tier: body.tier || 'SILVER',
        totalSpent: Number(body.totalSpent || 0).toFixed(2),
        lastVisitAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, member });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
