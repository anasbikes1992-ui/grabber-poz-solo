import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, hirePurchaseContracts, hirePurchaseInstallments } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

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
    const rows = await db.select().from(hirePurchaseContracts).orderBy(desc(hirePurchaseContracts.createdAt)).limit(100);
    return NextResponse.json({
      success: true,
      contracts: rows.map((c) => ({
        ...c,
        totalCashPrice: Number(c.totalCashPrice),
        downPayment: Number(c.downPayment),
        monthlyEmi: Number(c.monthlyEmi),
        nextDueDate: c.nextDueDate,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, contracts: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = body.action || 'create';

    if (action === 'pay_installment') {
      const [contract] = await db
        .select()
        .from(hirePurchaseContracts)
        .where(eq(hirePurchaseContracts.id, body.contractId))
        .limit(1);
      if (!contract) throw new Error('Contract not found');
      if (contract.status === 'SETTLED') throw new Error('Already settled');

      const nextPaid = contract.paidMonths + 1;
      const settled = nextPaid >= contract.totalMonths;
      const nextDue = contract.nextDueDate
        ? new Date(contract.nextDueDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(hirePurchaseInstallments).values({
        contractId: contract.id,
        installmentNumber: nextPaid,
        amount: contract.monthlyEmi,
        method: body.method || 'CASH',
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      });

      const [updated] = await db
        .update(hirePurchaseContracts)
        .set({
          paidMonths: nextPaid,
          status: settled ? 'SETTLED' : contract.status === 'OVERDUE' ? 'ACTIVE' : contract.status,
          nextDueDate: settled ? null : nextDue,
          updatedAt: new Date(),
        })
        .where(eq(hirePurchaseContracts.id, contract.id))
        .returning();

      return NextResponse.json({ success: true, contract: updated });
    }

    const totalCashPrice = Number(body.totalCashPrice || 0);
    const downPayment = Number(body.downPayment || 0);
    const totalMonths = Number(body.totalMonths || 12);
    const monthlyEmi =
      body.monthlyEmi != null
        ? Number(body.monthlyEmi)
        : Math.ceil((totalCashPrice - downPayment) / Math.max(1, totalMonths));

    const [contract] = await db
      .insert(hirePurchaseContracts)
      .values({
        contractNumber: body.contractNumber || `HP-${Date.now().toString().slice(-6)}`,
        customerId: body.customerId || null,
        customerName: String(body.customerName || '').trim(),
        nicNumber: String(body.nicNumber || '').trim(),
        phone: String(body.phone || '').trim(),
        itemName: String(body.itemName || '').trim(),
        productId: body.productId || null,
        totalCashPrice: totalCashPrice.toFixed(2),
        downPayment: downPayment.toFixed(2),
        monthlyEmi: monthlyEmi.toFixed(2),
        totalMonths,
        paidMonths: 0,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      })
      .returning();

    return NextResponse.json({ success: true, contract });
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
      .update(hirePurchaseContracts)
      .set({
        status: body.status,
        customerName: body.customerName,
        phone: body.phone,
        itemName: body.itemName,
        monthlyEmi: body.monthlyEmi != null ? Number(body.monthlyEmi).toFixed(2) : undefined,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(hirePurchaseContracts.id, body.id))
      .returning();
    return NextResponse.json({ success: true, contract: updated });
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
    await db
      .update(hirePurchaseContracts)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(hirePurchaseContracts.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
