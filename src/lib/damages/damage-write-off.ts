import { eq } from 'drizzle-orm';
import { db, chartOfAccounts, journalEntries, journalLines } from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

async function resolveAccountId(code: string) {
  const [row] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

/** Dr COGS / loss (5000), Cr inventory (1200) — inventory write-off on approved damage. */
export async function postDamageWriteOff(input: {
  damageId: string;
  productName: string;
  totalLoss: number;
  actorId?: string | null;
}) {
  const amount = Number(input.totalLoss || 0);
  if (amount <= 0) throw new Error('Write-off amount must be positive');

  await ensureDefaultChartOfAccounts(db);
  const aCogs = await resolveAccountId('5000');
  const aInv = await resolveAccountId('1200');

  return db.transaction(async (tx) => {
    const entropy = Date.now().toString(36);
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `DMG-${input.damageId.slice(-8)}-${entropy}`,
        entryDate: new Date(),
        referenceType: 'DAMAGE',
        referenceId: input.damageId,
        description: `Stock damage write-off: ${input.productName}`,
        createdBy: input.actorId || null,
      })
      .returning();

    await tx.insert(journalLines).values([
      {
        journalEntryId: je.id,
        accountId: aCogs,
        debit: amount.toFixed(2),
        credit: '0.00',
        memo: 'Damage / shrinkage expense',
      },
      {
        journalEntryId: je.id,
        accountId: aInv,
        debit: '0.00',
        credit: amount.toFixed(2),
        memo: 'Inventory written off',
      },
    ]);

    return je.id;
  });
}
