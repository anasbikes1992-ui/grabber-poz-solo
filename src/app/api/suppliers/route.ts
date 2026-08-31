import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, suppliers, supplierAccounts } from '@/db';
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
    const rows = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(500);
    const accounts = await db.select().from(supplierAccounts);
    const bal = new Map(accounts.map((a) => [a.supplierId, a]));
    return NextResponse.json({
      success: true,
      suppliers: rows.map((s) => {
        const acct = bal.get(s.id);
        return {
          id: s.id,
          name: s.name,
          contactName: s.contactName || '',
          phone: s.phone || '',
          email: s.email || '',
          paymentTerms: acct ? `NET_${acct.creditTermsDays}` : 'NET_30',
          currentBalance: Number(acct?.currentBalance ?? 0),
          active: s.active,
        };
      }),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, suppliers: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });

    const terms = String(body.paymentTerms || 'NET_30');
    const days = Number(terms.replace(/\D/g, '')) || 30;

    const [supplier] = await db
      .insert(suppliers)
      .values({
        name,
        contactName: body.contactName || null,
        phone: body.phone || null,
        email: body.email || null,
        active: true,
      })
      .returning();

    await db.insert(supplierAccounts).values({
      supplierId: supplier.id,
      currentBalance: '0.00',
      creditTermsDays: days,
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const [supplier] = await db
      .update(suppliers)
      .set({
        name: body.name,
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        active: body.active,
      })
      .where(eq(suppliers.id, body.id))
      .returning();

    if (!supplier) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (body.paymentTerms) {
      const days = Number(String(body.paymentTerms).replace(/\D/g, '')) || 30;
      await db
        .update(supplierAccounts)
        .set({ creditTermsDays: days, updatedAt: new Date() })
        .where(eq(supplierAccounts.supplierId, supplier.id));
    }

    return NextResponse.json({ success: true, supplier });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
