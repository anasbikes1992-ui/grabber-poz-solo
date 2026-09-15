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
    const entries = await db.select().from(polimPothaEntries).orderBy(desc(polimPothaEntries.createdAt)).limit(500);

    // Compute AR aging buckets across accounts using FIFO allocation
    const nowMs = Date.now();
    const entriesByCust = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = entriesByCust.get(e.customerId) || [];
      list.push(e);
      entriesByCust.set(e.customerId, list);
    }

    let global0to30 = 0;
    let global31to60 = 0;
    let global61to90 = 0;
    let global90Plus = 0;
    let totalReceivable = 0;
    let totalLimit = 0;

    const mappedAccounts = accounts.map((a) => {
      const c = cMap.get(a.customerId);
      const limit = Number(a.creditLimit || 0);
      const balance = Number(a.currentBalance || 0);
      totalReceivable += balance;
      totalLimit += limit;

      // Customer aging calculation
      const custEntries = (entriesByCust.get(a.customerId) || []).slice().reverse(); // Oldest first
      const unpaidInvoices: Array<{ amount: number; date: Date }> = [];
      let repaymentPool = 0;

      for (const entry of custEntries) {
        const amt = Number(entry.amount || 0);
        if (entry.type === 'INVOICE') {
          unpaidInvoices.push({ amount: amt, date: new Date(entry.createdAt) });
        } else if (entry.type === 'REPAYMENT' || entry.type === 'WRITE_OFF') {
          repaymentPool += amt;
        }
      }

      let a0to30 = 0;
      let a31to60 = 0;
      let a61to90 = 0;
      let a90Plus = 0;

      for (const inv of unpaidInvoices) {
        if (repaymentPool >= inv.amount) {
          repaymentPool -= inv.amount;
          continue;
        }
        const remaining = inv.amount - repaymentPool;
        repaymentPool = 0;
        const ageDays = Math.floor((nowMs - inv.date.getTime()) / (1000 * 60 * 60 * 24));

        if (ageDays <= 30) a0to30 += remaining;
        else if (ageDays <= 60) a31to60 += remaining;
        else if (ageDays <= 90) a61to90 += remaining;
        else a90Plus += remaining;
      }

      // If customer has a balance but no recorded invoice history, put in 0-30 bucket
      if (balance > 0 && a0to30 + a31to60 + a61to90 + a90Plus === 0) {
        a0to30 = balance;
      }

      global0to30 += a0to30;
      global31to60 += a31to60;
      global61to90 += a61to90;
      global90Plus += a90Plus;

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
        aging: {
          days0to30: Math.round(a0to30 * 100) / 100,
          days31to60: Math.round(a31to60 * 100) / 100,
          days61to90: Math.round(a61to90 * 100) / 100,
          days90Plus: Math.round(a90Plus * 100) / 100,
        },
        updatedAt: a.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalReceivable: Math.round(totalReceivable * 100) / 100,
        totalLimit: Math.round(totalLimit * 100) / 100,
        accountsCount: accounts.length,
        aging: {
          days0to30: Math.round(global0to30 * 100) / 100,
          days31to60: Math.round(global31to60 * 100) / 100,
          days61to90: Math.round(global61to90 * 100) / 100,
          days90Plus: Math.round(global90Plus * 100) / 100,
        },
      },
      accounts: mappedAccounts,
      entries: entries.slice(0, 50).map((e) => ({
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
