import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, customers, polimPothaAccounts, polimPothaEntries } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId, requireStaffSession } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireStaffSession();
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
          email: c?.email || null,
          limit,
          balance,
          available: Math.max(0, limit - balance),
          status: a.status,
          updatedAt: a.updatedAt,
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
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
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
    let customerId = body.customerId as string | undefined;
    const creditLimit = Number(body.creditLimit ?? 50000);

    // If customerId not given, look up or create customer by phone
    if (!customerId) {
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      if (!name || !phone) {
        return NextResponse.json({ success: false, error: 'Customer name and phone or customerId is required' }, { status: 400 });
      }

      const [existingCust] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const [newCust] = await db
          .insert(customers)
          .values({
            name,
            phone,
            email: body.email ? String(body.email).trim() : null,
            address: body.address ? String(body.address).trim() : null,
          })
          .returning();
        customerId = newCust.id;
      }
    }

    // Check if account already exists
    const [existingAccount] = await db
      .select()
      .from(polimPothaAccounts)
      .where(eq(polimPothaAccounts.customerId, customerId))
      .limit(1);

    if (existingAccount) {
      if (body.creditLimit !== undefined) {
        const [updated] = await db
          .update(polimPothaAccounts)
          .set({ creditLimit: String(creditLimit.toFixed(2)), updatedAt: new Date() })
          .where(eq(polimPothaAccounts.id, existingAccount.id))
          .returning();
        return NextResponse.json({ success: true, account: updated, created: false });
      }
      return NextResponse.json({ success: true, account: existingAccount, created: false });
    }

    const [account] = await db
      .insert(polimPothaAccounts)
      .values({
        customerId,
        creditLimit: String(creditLimit.toFixed(2)),
        currentBalance: '0.00',
        status: 'ACTIVE',
      })
      .returning();

    return NextResponse.json({ success: true, account, created: true }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to create credit account' }, { status: e.status || 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const customerId = String(body.customerId || '').trim();
    if (!customerId) {
      return NextResponse.json({ success: false, error: 'customerId is required' }, { status: 400 });
    }

    const [acct] = await db
      .select()
      .from(polimPothaAccounts)
      .where(eq(polimPothaAccounts.customerId, customerId))
      .limit(1);

    if (!acct) {
      return NextResponse.json({ success: false, error: 'Polim account not found' }, { status: 404 });
    }

    const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;

    const result = await db.transaction(async (tx) => {
      let currentBalanceNum = Number(acct.currentBalance);

      // Handle manual adjustment if specified
      if (body.adjustmentAmount !== undefined && Number(body.adjustmentAmount) !== 0) {
        const delta = Number(body.adjustmentAmount);
        currentBalanceNum = Math.max(0, currentBalanceNum + delta);

        await tx.insert(polimPothaEntries).values({
          customerId,
          type: (body.adjustmentType as 'ADJUSTMENT' | 'WRITE_OFF') || 'ADJUSTMENT',
          amount: String(Math.abs(delta).toFixed(2)),
          balanceAfter: String(currentBalanceNum.toFixed(2)),
          notes: body.notes || 'Manual credit ledger adjustment',
          createdBy: actorId,
        });
      }

      const updates: Partial<typeof polimPothaAccounts.$inferInsert> = {
        updatedAt: new Date(),
        currentBalance: String(currentBalanceNum.toFixed(2)),
      };

      if (body.creditLimit !== undefined) {
        updates.creditLimit = String(Number(body.creditLimit).toFixed(2));
      }
      if (body.status !== undefined) {
        updates.status = body.status;
      }

      const [updatedAcct] = await tx
        .update(polimPothaAccounts)
        .set(updates)
        .where(eq(polimPothaAccounts.id, acct.id))
        .returning();

      return updatedAcct;
    });

    return NextResponse.json({ success: true, account: result, message: 'Account updated successfully' });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Failed to update account' }, { status: e.status || 400 });
  }
}
