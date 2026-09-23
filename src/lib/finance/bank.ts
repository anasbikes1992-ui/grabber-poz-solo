import { desc, eq } from 'drizzle-orm';
import { bankAccounts, bankReconciliationLines, bankReconciliations, db } from '@/db';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

export async function createBankAccount(input: {
  name: string;
  bankName: string;
  accountNumberMasked?: string | null;
  currency?: string;
  glAccountCode?: string;
}) {
  const name = String(input.name || '').trim();
  const bankName = String(input.bankName || '').trim();
  if (!name || !bankName) throw new Error('name and bankName required');

  const [row] = await db
    .insert(bankAccounts)
    .values({
      name,
      bankName,
      accountNumberMasked: input.accountNumberMasked || null,
      currency: input.currency || 'LKR',
      glAccountCode: input.glAccountCode || '1010',
      active: true,
    })
    .returning();
  return row;
}

export async function listAccounts(limit = 100) {
  return db.select().from(bankAccounts).orderBy(desc(bankAccounts.createdAt)).limit(limit);
}

export async function createReconciliation(input: {
  accountId: string;
  statementDate: Date | string;
  openingBalance?: number;
  closingBalance?: number;
  createdBy?: string | null;
}) {
  if (!input.accountId) throw new Error('accountId required');
  const [acct] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, input.accountId)).limit(1);
  if (!acct) throw new Error('Bank account not found');

  const [row] = await db
    .insert(bankReconciliations)
    .values({
      accountId: input.accountId,
      statementDate: new Date(input.statementDate),
      openingBalance: Number(input.openingBalance || 0).toFixed(2),
      closingBalance: Number(input.closingBalance || 0).toFixed(2),
      status: 'OPEN',
      createdBy: actorId(input.createdBy),
    })
    .returning();
  return row;
}

export async function addReconLine(input: {
  reconciliationId: string;
  amount: number;
  description?: string | null;
  matchedPaymentRef?: string | null;
  cleared?: boolean;
}) {
  const [recon] = await db
    .select()
    .from(bankReconciliations)
    .where(eq(bankReconciliations.id, input.reconciliationId))
    .limit(1);
  if (!recon) throw new Error('Reconciliation not found');
  if (recon.status !== 'OPEN') throw new Error('Cannot add lines to a completed reconciliation');

  const [line] = await db
    .insert(bankReconciliationLines)
    .values({
      reconciliationId: input.reconciliationId,
      amount: Number(input.amount).toFixed(2),
      description: input.description || null,
      matchedPaymentRef: input.matchedPaymentRef || null,
      cleared: Boolean(input.cleared),
    })
    .returning();
  return line;
}

export async function completeReconciliation(id: string, opts: { skipBalanceCheck?: boolean } = {}) {
  const [recon] = await db.select().from(bankReconciliations).where(eq(bankReconciliations.id, id)).limit(1);
  if (!recon) throw new Error('Reconciliation not found');
  if (recon.status === 'COMPLETED') return recon;

  const lines = await db
    .select()
    .from(bankReconciliationLines)
    .where(eq(bankReconciliationLines.reconciliationId, id));

  if (!opts.skipBalanceCheck) {
    const { assertReconciliationBalances, clearedLinesSum } = await import('./bank-rules');
    assertReconciliationBalances({
      openingBalance: Number(recon.openingBalance),
      closingBalance: Number(recon.closingBalance),
      clearedSum: clearedLinesSum(lines),
    });
  }

  const [updated] = await db
    .update(bankReconciliations)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(eq(bankReconciliations.id, id))
    .returning();
  return updated;
}

export async function listReconciliations(accountId?: string, limit = 50) {
  if (accountId) {
    return db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.accountId, accountId))
      .orderBy(desc(bankReconciliations.createdAt))
      .limit(limit);
  }
  return db.select().from(bankReconciliations).orderBy(desc(bankReconciliations.createdAt)).limit(limit);
}
