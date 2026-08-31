import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import {
  db,
  customers,
  polimPothaAccounts,
} from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

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
    const rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(500);
    const accounts = await db.select().from(polimPothaAccounts);
    const bal = new Map(accounts.map((a) => [a.customerId, a]));
    return NextResponse.json({
      success: true,
      customers: rows.map((c) => {
        const acct = bal.get(c.id);
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || '',
          address: c.address || '',
          creditAllowed: Number(c.creditLimit) > 0 || Number(acct?.creditLimit || 0) > 0,
          creditLimit: Number(acct?.creditLimit ?? c.creditLimit),
          currentBalance: Number(acct?.currentBalance ?? 0),
          status: acct?.status || 'ACTIVE',
          active: c.active,
        };
      }),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, customers: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'name and phone required' }, { status: 400 });
    }
    const creditLimit = Number(body.creditLimit ?? 0);
    const [customer] = await db
      .insert(customers)
      .values({
        name,
        phone,
        email: body.email || null,
        address: body.address || null,
        creditLimit: creditLimit.toFixed(2),
        active: true,
      })
      .returning();

    if (body.creditAllowed !== false || creditLimit > 0) {
      await db.insert(polimPothaAccounts).values({
        customerId: customer.id,
        creditLimit: creditLimit.toFixed(2),
        currentBalance: '0.00',
        status: 'ACTIVE',
      });
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const creditLimit = body.creditLimit != null ? Number(body.creditLimit) : undefined;
    const [customer] = await db
      .update(customers)
      .set({
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        creditLimit: creditLimit != null ? creditLimit.toFixed(2) : undefined,
        active: body.active,
      })
      .where(eq(customers.id, body.id))
      .returning();

    if (!customer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (creditLimit != null) {
      const [acct] = await db
        .select()
        .from(polimPothaAccounts)
        .where(eq(polimPothaAccounts.customerId, customer.id))
        .limit(1);
      if (acct) {
        await db
          .update(polimPothaAccounts)
          .set({ creditLimit: creditLimit.toFixed(2), updatedAt: new Date() })
          .where(eq(polimPothaAccounts.customerId, customer.id));
      } else if (creditLimit > 0 || body.creditAllowed) {
        await db.insert(polimPothaAccounts).values({
          customerId: customer.id,
          creditLimit: creditLimit.toFixed(2),
          currentBalance: '0.00',
          status: 'ACTIVE',
        });
      }
    }

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
