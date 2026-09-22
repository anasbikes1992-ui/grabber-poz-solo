import { eq } from 'drizzle-orm';
import { chartOfAccounts, db, journalEntries, journalLines, rentalDeposits } from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function resolveAccountId(tx: Tx, code: string) {
  const [row] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

function cashCode(method?: string): '1010' | '1020' {
  return String(method || 'CASH').toUpperCase() === 'BANK' ? '1020' : '1010';
}

/** Hold deposit: Dr cash/bank Cr 2320 customer deposits. */
export async function postDepositHold(
  tx: Tx,
  input: {
    depositId: string;
    contractId: string;
    amount: number;
    method?: string;
    createdBy?: string | null;
  },
) {
  const amount = Number(input.amount);
  if (!(amount > 0)) return null;
  await ensureDefaultChartOfAccounts(db);

  const aCash = await resolveAccountId(tx, cashCode(input.method));
  const aDep = await resolveAccountId(tx, '2320');
  const entropy = Date.now().toString(36);
  const [je] = await tx
    .insert(journalEntries)
    .values({
      entryNumber: `RNT-DEP-${entropy}`,
      entryDate: new Date(),
      referenceType: 'RENTAL_DEPOSIT',
      referenceId: input.contractId,
      description: 'Rental deposit held',
      createdBy: input.createdBy || null,
    })
    .returning();

  await tx.insert(journalLines).values([
    { journalEntryId: je.id, accountId: aCash, debit: amount.toFixed(2), credit: '0.00', memo: 'Deposit received' },
    { journalEntryId: je.id, accountId: aDep, debit: '0.00', credit: amount.toFixed(2), memo: 'Customer deposit liability' },
  ]);

  await tx
    .update(rentalDeposits)
    .set({ holdJournalEntryId: je.id, updatedAt: new Date() })
    .where(eq(rentalDeposits.id, input.depositId));

  return je.id;
}

/** Refund deposit: Dr 2320 Cr cash. Forfeit: Dr 2320 Cr 4000. */
export async function postDepositRelease(
  tx: Tx,
  input: {
    depositId: string;
    contractId: string;
    amount: number;
    forfeit: boolean;
    method?: string;
    createdBy?: string | null;
  },
) {
  const amount = Number(input.amount);
  if (!(amount > 0)) return null;
  await ensureDefaultChartOfAccounts(db);

  const aDep = await resolveAccountId(tx, '2320');
  const aContra = await resolveAccountId(tx, input.forfeit ? '4000' : cashCode(input.method));
  const entropy = Date.now().toString(36);
  const [je] = await tx
    .insert(journalEntries)
    .values({
      entryNumber: `RNT-REL-${entropy}`,
      entryDate: new Date(),
      referenceType: input.forfeit ? 'RENTAL_DEPOSIT_FORFEIT' : 'RENTAL_DEPOSIT_REFUND',
      referenceId: input.contractId,
      description: input.forfeit ? 'Rental deposit forfeited' : 'Rental deposit refunded',
      createdBy: input.createdBy || null,
    })
    .returning();

  await tx.insert(journalLines).values([
    { journalEntryId: je.id, accountId: aDep, debit: amount.toFixed(2), credit: '0.00', memo: 'Clear deposit liability' },
    {
      journalEntryId: je.id,
      accountId: aContra,
      debit: '0.00',
      credit: amount.toFixed(2),
      memo: input.forfeit ? 'Forfeit to revenue' : 'Refund to customer',
    },
  ]);

  await tx
    .update(rentalDeposits)
    .set({ releaseJournalEntryId: je.id, updatedAt: new Date() })
    .where(eq(rentalDeposits.id, input.depositId));

  return je.id;
}
