import { desc, eq } from 'drizzle-orm';
import { apInvoices, apPayments, db, supplierAccounts, supplierEntries } from '@/db';
import { assertCanPay, assertCanPost, nextStatusAfterPayment } from './ap-rules';
import { postApBillJournal, postApPaymentJournal } from './post-ap-journal';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

async function ensureSupplierAccount(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], supplierId: string) {
  const [acct] = await tx.select().from(supplierAccounts).where(eq(supplierAccounts.supplierId, supplierId)).limit(1);
  if (acct) return acct;
  const [created] = await tx
    .insert(supplierAccounts)
    .values({ supplierId, currentBalance: '0.00' })
    .returning();
  return created;
}

export async function createDraftInvoice(input: {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate?: Date | string;
  dueDate?: Date | string | null;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  poId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}) {
  if (!input.supplierId) throw new Error('supplierId required');
  const invoiceNumber = String(input.invoiceNumber || '').trim();
  if (!invoiceNumber) throw new Error('invoiceNumber required');

  const subtotal = Number(input.subtotal || 0);
  const taxAmount = Number(input.taxAmount || 0);
  const totalAmount =
    input.totalAmount != null ? Number(input.totalAmount) : Math.round((subtotal + taxAmount) * 100) / 100;
  if (!(totalAmount > 0)) throw new Error('totalAmount must be greater than 0');

  const [inv] = await db
    .insert(apInvoices)
    .values({
      supplierId: input.supplierId,
      poId: input.poId || null,
      invoiceNumber,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      amountPaid: '0.00',
      status: 'DRAFT',
      notes: input.notes || null,
      createdBy: actorId(input.createdBy),
    })
    .returning();

  return inv;
}

export async function listInvoices(limit = 100) {
  return db.select().from(apInvoices).orderBy(desc(apInvoices.createdAt)).limit(limit);
}

export async function postInvoice(id: string, createdBy?: string | null) {
  const [inv] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!inv) throw new Error('Invoice not found');
  assertCanPost(inv.status);

  const total = Number(inv.totalAmount);
  await ensureDefaultChartOfAccounts(db);

  return db.transaction(async (tx) => {
    const acct = await ensureSupplierAccount(tx, inv.supplierId);
    const nextBal = Number(acct.currentBalance) + total;

    await tx
      .update(supplierAccounts)
      .set({ currentBalance: nextBal.toFixed(2), updatedAt: new Date() })
      .where(eq(supplierAccounts.supplierId, inv.supplierId));

    const [entry] = await tx
      .insert(supplierEntries)
      .values({
        supplierId: inv.supplierId,
        poId: inv.poId || null,
        type: 'BILL',
        amount: total.toFixed(2),
        balanceAfter: nextBal.toFixed(2),
        dueDate: inv.dueDate,
        createdBy: actorId(createdBy),
      })
      .returning();

    await postApBillJournal(tx, {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: total,
      createdBy: actorId(createdBy),
    });

    const [updated] = await tx
      .update(apInvoices)
      .set({
        status: 'POSTED',
        supplierEntryId: entry.id,
        updatedAt: new Date(),
      })
      .where(eq(apInvoices.id, id))
      .returning();

    return updated;
  });
}

export async function payInvoice(
  id: string,
  input: { amount: number; method?: string; notes?: string | null; createdBy?: string | null },
) {
  const [inv] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
  if (!inv) throw new Error('Invoice not found');

  const total = Number(inv.totalAmount);
  const alreadyPaid = Number(inv.amountPaid);
  const remaining = Math.round((total - alreadyPaid) * 100) / 100;
  const amount = Number(input.amount);

  assertCanPay(inv.status, amount, remaining);
  await ensureDefaultChartOfAccounts(db);

  return db.transaction(async (tx) => {
    const acct = await ensureSupplierAccount(tx, inv.supplierId);
    const nextBal = Math.max(0, Number(acct.currentBalance) - amount);

    await tx
      .update(supplierAccounts)
      .set({ currentBalance: nextBal.toFixed(2), updatedAt: new Date() })
      .where(eq(supplierAccounts.supplierId, inv.supplierId));

    const [entry] = await tx
      .insert(supplierEntries)
      .values({
        supplierId: inv.supplierId,
        poId: inv.poId || null,
        type: 'PAYMENT',
        amount: amount.toFixed(2),
        balanceAfter: nextBal.toFixed(2),
        createdBy: actorId(input.createdBy),
      })
      .returning();

    const journalEntryId = await postApPaymentJournal(tx, {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount,
      method: input.method,
      createdBy: actorId(input.createdBy),
    });

    const newPaid = Math.round((alreadyPaid + amount) * 100) / 100;
    const nextStatus = nextStatusAfterPayment(total, newPaid);

    const [payment] = await tx
      .insert(apPayments)
      .values({
        invoiceId: id,
        amount: amount.toFixed(2),
        method: input.method || 'BANK',
        notes: input.notes || null,
        supplierEntryId: entry.id,
        journalEntryId,
        createdBy: actorId(input.createdBy),
      })
      .returning();

    const [updated] = await tx
      .update(apInvoices)
      .set({
        amountPaid: newPaid.toFixed(2),
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(apInvoices.id, id))
      .returning();

    return { invoice: updated, payment };
  });
}
