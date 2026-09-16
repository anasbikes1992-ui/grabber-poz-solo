import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, suppliers, supplierAccounts, supplierEntries, journalEntries, journalLines, chartOfAccounts, auditLogs } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

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
    const session = await actor();
    const body = await req.json();

    if (body.action === 'record_payment') {
      const supplierId = String(body.supplierId || '').trim();
      const amount = Number(body.amount);
      const paymentMethod = String(body.paymentMethod || 'BANK_TRANSFER').toUpperCase(); // CASH, BANK_TRANSFER
      const notes = body.notes ? String(body.notes).trim() : 'Supplier invoice settlement';
      const actorId = session && !isDemoUserId(session.userId) ? session.userId : null;

      if (!supplierId || !amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'supplierId and positive amount required' }, { status: 400 });
      }

      const result = await db.transaction(async (tx) => {
        const [acct] = await tx
          .select()
          .from(supplierAccounts)
          .where(eq(supplierAccounts.supplierId, supplierId))
          .limit(1);

        if (!acct) {
          throw new Error('Supplier account not found');
        }

        const currentBal = Number(acct.currentBalance);
        const newBal = Math.max(0, currentBal - amount);

        await tx
          .update(supplierAccounts)
          .set({ currentBalance: newBal.toFixed(2), updatedAt: new Date() })
          .where(eq(supplierAccounts.supplierId, supplierId));

        const [entry] = await tx
          .insert(supplierEntries)
          .values({
            supplierId,
            poId: body.poId || null,
            type: 'PAYMENT',
            amount: amount.toFixed(2),
            balanceAfter: newBal.toFixed(2),
            createdBy: actorId,
          })
          .returning();

        // General Ledger: Debit Accounts Payable (2000), Credit Cash (1010) or Bank (1020)
        await ensureDefaultChartOfAccounts(tx as unknown as typeof db);
        const resolve = async (code: string) => {
          const [a] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
          if (!a) throw new Error(`Missing COA ${code}`);
          return a.id;
        };

        const aAp = await resolve('2000');
        const aBank = await resolve(paymentMethod === 'CASH' ? '1010' : '1020');

        const [je] = await tx
          .insert(journalEntries)
          .values({
            entryNumber: `JRN-SUPPAY-${Date.now().toString().slice(-8)}`,
            entryDate: new Date(),
            referenceType: 'SUPPLIER_PAYMENT',
            referenceId: entry.id,
            description: `Payment to supplier ${supplierId} (${paymentMethod})`,
            createdBy: actorId,
          })
          .returning();

        await tx.insert(journalLines).values([
          { journalEntryId: je.id, accountId: aAp, debit: amount.toFixed(2), credit: '0.00', memo: `Settlement AP: ${notes}` },
          { journalEntryId: je.id, accountId: aBank, debit: '0.00', credit: amount.toFixed(2), memo: `${paymentMethod} disbursed` },
        ]);

        if (actorId) {
          await tx.insert(auditLogs).values({
            actorId,
            action: 'SUPPLIER_PAYMENT',
            entity: 'SUPPLIER',
            entityId: supplierId,
            afterState: { amount, paymentMethod, newBalance: newBal, entryId: entry.id },
          });
        }

        return { entry, newBalance: newBal, journalEntryId: je.id };
      });

      return NextResponse.json({ success: true, payment: result });
    }

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
