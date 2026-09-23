import { eq } from 'drizzle-orm';
import { chartOfAccounts, db, journalEntries, journalLines } from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

async function resolveAccountId(code: string) {
  const [row] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function resolveAccountIdTx(tx: Tx, code: string) {
  const [row] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

/** Cash/Bank debit account from payment method. */
export function cashAccountForApMethod(method?: string): '1010' | '1020' {
  const m = String(method || 'BANK').toUpperCase();
  if (m === 'CASH') return '1010';
  return '1020';
}

/**
 * Post supplier bill to GL:
 * Dr Purchases/COGS (5000)  Cr Accounts Payable (2000)
 */
export async function postApBillJournal(
  tx: Tx,
  input: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    createdBy?: string | null;
  },
): Promise<string> {
  await ensureDefaultChartOfAccounts(db);
  const amount = Number(input.amount);
  if (!(amount > 0)) throw new Error('AP bill amount must be positive');

  const aExp = await resolveAccountIdTx(tx, '5000');
  const aAp = await resolveAccountIdTx(tx, '2000');
  const entropy = Date.now().toString(36);

  const [je] = await tx
    .insert(journalEntries)
    .values({
      entryNumber: `AP-BILL-${input.invoiceNumber.slice(0, 24)}-${entropy}`,
      entryDate: new Date(),
      referenceType: 'AP_INVOICE',
      referenceId: input.invoiceId,
      description: `AP invoice ${input.invoiceNumber}`,
      createdBy: input.createdBy || null,
    })
    .returning();

  await tx.insert(journalLines).values([
    {
      journalEntryId: je.id,
      accountId: aExp,
      debit: amount.toFixed(2),
      credit: '0.00',
      memo: 'Supplier bill / purchases',
    },
    {
      journalEntryId: je.id,
      accountId: aAp,
      debit: '0.00',
      credit: amount.toFixed(2),
      memo: 'Accounts payable',
    },
  ]);

  return je.id;
}

/**
 * Post supplier payment to GL:
 * Dr Accounts Payable (2000)  Cr Cash/Bank (1010/1020)
 */
export async function postApPaymentJournal(
  tx: Tx,
  input: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    method?: string;
    createdBy?: string | null;
  },
): Promise<string> {
  await ensureDefaultChartOfAccounts(db);
  const amount = Number(input.amount);
  if (!(amount > 0)) throw new Error('AP payment amount must be positive');

  const aAp = await resolveAccountIdTx(tx, '2000');
  const cashCode = cashAccountForApMethod(input.method);
  const aCash = await resolveAccountIdTx(tx, cashCode);
  const entropy = Date.now().toString(36);

  const [je] = await tx
    .insert(journalEntries)
    .values({
      entryNumber: `AP-PAY-${input.invoiceNumber.slice(0, 24)}-${entropy}`,
      entryDate: new Date(),
      referenceType: 'AP_PAYMENT',
      referenceId: input.invoiceId,
      description: `AP payment ${input.invoiceNumber} via ${input.method || 'BANK'}`,
      createdBy: input.createdBy || null,
    })
    .returning();

  await tx.insert(journalLines).values([
    {
      journalEntryId: je.id,
      accountId: aAp,
      debit: amount.toFixed(2),
      credit: '0.00',
      memo: 'Reduce accounts payable',
    },
    {
      journalEntryId: je.id,
      accountId: aCash,
      debit: '0.00',
      credit: amount.toFixed(2),
      memo: `Paid via ${cashCode === '1010' ? 'cash' : 'bank'}`,
    },
  ]);

  return je.id;
}

/** Pure helper for tests — unused resolve kept for API symmetry. */
export async function ensureApCoaReady() {
  await ensureDefaultChartOfAccounts(db);
  await resolveAccountId('2000');
  await resolveAccountId('5000');
  await resolveAccountId('1010');
  await resolveAccountId('1020');
}
