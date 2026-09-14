import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim();
    const q = searchParams.get('q')?.trim()?.toLowerCase();

    if (phone) {
      const [member] = await db.select().from(loyaltyMembers).where(eq(loyaltyMembers.phone, phone)).limit(1);
      return NextResponse.json({
        success: true,
        member: member
          ? {
              id: member.id,
              name: member.name,
              phone: member.phone,
              points: member.points,
              tier: member.tier,
              totalSpent: Number(member.totalSpent),
              lastVisit: member.lastVisitAt,
            }
          : null,
      });
    }

    const members = await db.select().from(loyaltyMembers).orderBy(desc(loyaltyMembers.points)).limit(200);
    const filtered = q
      ? members.filter((m) => m.name.toLowerCase().includes(q) || m.phone.includes(q))
      : members;

    return NextResponse.json({
      success: true,
      members: filtered.map((m) => ({
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
      const memberId = String(body.memberId || '').trim();
      if (!memberId) throw new Error('memberId is required');
      const [member] = await db.select().from(loyaltyMembers).where(eq(loyaltyMembers.id, memberId)).limit(1);
      if (!member) throw new Error('Member not found');
      if (!member.active) throw new Error('Loyalty member is inactive');
      const amountLkr = Number(body.amountLkr);
      const requestedPoints = Number(body.points);
      const delta = action === 'earn' ? Math.floor(amountLkr / 100) : -Math.abs(requestedPoints);
      if (action === 'earn' && (!Number.isFinite(amountLkr) || amountLkr <= 0 || delta <= 0)) {
        throw new Error('amountLkr must earn at least one point');
      }
      if (action === 'redeem' && (!Number.isInteger(requestedPoints) || requestedPoints <= 0)) {
        throw new Error('points must be a positive integer');
      }
      if (action === 'redeem' && member.points + delta < 0) throw new Error('Insufficient points');
      const balanceAfter = member.points + delta;
      const totalSpent =
        action === 'earn' ? Number(member.totalSpent) + amountLkr : Number(member.totalSpent);

      const updated = await db.transaction(async (tx) => {
        const [changed] = await tx.update(loyaltyMembers).set({
          points: sql`${loyaltyMembers.points} + ${delta}`,
          totalSpent: totalSpent.toFixed(2),
          tier: tierForSpend(totalSpent),
          lastVisitAt: new Date(),
          updatedAt: new Date(),
        }).where(
          action === 'redeem'
            ? sql`${eq(loyaltyMembers.id, member.id)} AND ${loyaltyMembers.points} >= ${Math.abs(delta)}`
            : eq(loyaltyMembers.id, member.id),
        ).returning();
        if (!changed) throw new Error('Points changed or insufficient points; retry the operation');
        await tx.insert(loyaltyTransactions).values({
          memberId: member.id,
          type: action === 'earn' ? 'EARN' : 'REDEEM',
          pointsDelta: delta,
          balanceAfter: changed.points,
          orderId: body.orderId || null,
          notes: body.notes || null,
        });
        return changed;
      });

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

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const [updated] = await db
      .update(loyaltyMembers)
      .set({
        name: body.name,
        phone: body.phone,
        tier: body.tier,
        points: body.points != null ? Number(body.points) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyMembers.id, body.id))
      .returning();
    return NextResponse.json({ success: true, member: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await actor();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    await db.delete(loyaltyMembers).where(eq(loyaltyMembers.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
