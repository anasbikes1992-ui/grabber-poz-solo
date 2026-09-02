import { and, eq } from 'drizzle-orm';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  products,
  stockTakeLines,
  stockTakeSessions,
} from '@/db/schema';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { recordAdjustment } from '@/lib/inventory/stock-service';

export type StockTakeLineInput = {
  productId: string;
  variantId?: string;
  physicalCount: number;
  systemOnHand: number;
  unitCost?: number;
};

async function resolveAccountId(
  tx: Parameters<typeof recordAdjustment>[0],
  code: string,
) {
  const [row] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Account ${code} missing — run seed`);
  return row.id;
}

export async function createStockTakeSession(
  db: { insert: typeof import('@/db').db.insert },
  input: {
    locationType: 'BRANCH' | 'WAREHOUSE';
    locationId: string;
    actorId?: string;
  },
) {
  const sessionNumber = `ST-${Date.now().toString().slice(-8)}`;
  const [session] = await db
    .insert(stockTakeSessions)
    .values({
      sessionNumber,
      locationType: input.locationType,
      locationId: input.locationId,
      status: 'IN_PROGRESS',
      createdBy: input.actorId || null,
    })
    .returning();
  return session;
}

export async function addStockTakeCounts(
  db: {
    insert: typeof import('@/db').db.insert;
    select: typeof import('@/db').db.select;
    update: typeof import('@/db').db.update;
  },
  sessionId: string,
  lines: StockTakeLineInput[],
) {
  let totalVarianceValue = 0;
  for (const line of lines) {
    const variance = line.physicalCount - line.systemOnHand;
    const unitCost = line.unitCost ?? 0;
    totalVarianceValue += variance * unitCost * -1; // shrinkage is negative variance value

    await db.insert(stockTakeLines).values({
      sessionId,
      productId: line.productId,
      variantId: line.variantId || null,
      systemOnHand: line.systemOnHand,
      physicalCount: line.physicalCount,
      variance,
      unitCost: String(unitCost.toFixed(2)),
    });
  }

  const [session] = await db
    .select()
    .from(stockTakeSessions)
    .where(eq(stockTakeSessions.id, sessionId))
    .limit(1);

  if (session) {
    await db
      .update(stockTakeSessions)
      .set({
        totalVarianceValue: String(Math.abs(totalVarianceValue).toFixed(2)),
        status: 'PENDING_APPROVAL',
      })
      .where(eq(stockTakeSessions.id, sessionId));
  }

  return { totalVarianceValue: Math.abs(totalVarianceValue), lineCount: lines.length };
}

export async function approveAndPostStockTake(
  db: { transaction: typeof import('@/db').db.transaction },
  sessionId: string,
  approverId?: string,
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(stockTakeSessions)
      .where(eq(stockTakeSessions.id, sessionId))
      .limit(1);
    if (!session) throw new Error('Session not found');
    if (session.status === 'POSTED') throw new Error('Already posted');

    const lines = await tx.select().from(stockTakeLines).where(eq(stockTakeLines.sessionId, sessionId));
    let shrinkageValue = 0;

    for (const line of lines) {
      if (line.variance === 0) continue;
      const cost = Number(line.unitCost);
      if (line.variance < 0) shrinkageValue += Math.abs(line.variance) * cost;

      await recordAdjustment(
        tx,
        { locationType: session.locationType, locationId: session.locationId },
        {
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.variance,
          unitCost: cost,
        },
        {
          referenceType: 'STOCK_TAKE',
          referenceId: sessionId,
          notes: `Count adj ${line.variance}`,
          actorId: approverId,
        },
      );
    }

    let journalEntryId: string | null = null;
    if (shrinkageValue > 0) {
      await ensureDefaultChartOfAccounts(tx as unknown as Parameters<typeof ensureDefaultChartOfAccounts>[0]);
      const aShrink = await resolveAccountId(tx, '6100').catch(async () => {
        await tx
          .insert(chartOfAccounts)
          .values({ code: '6100', name: 'Inventory Shrinkage', type: 'EXPENSE' })
          .onConflictDoNothing();
        return resolveAccountId(tx, '6100');
      });
      const aInv = await resolveAccountId(tx, '1200');

      const [je] = await tx
        .insert(journalEntries)
        .values({
          entryNumber: `JRN-ST-${session.sessionNumber}`,
          entryDate: new Date(),
          referenceType: 'STOCK_TAKE',
          referenceId: sessionId,
          description: `Stock take shrinkage ${session.sessionNumber}`,
          createdBy: approverId || null,
        })
        .returning();

      journalEntryId = je.id;
      await tx.insert(journalLines).values([
        {
          journalEntryId: je.id,
          accountId: aShrink,
          debit: String(shrinkageValue.toFixed(2)),
          credit: '0.00',
          memo: 'Shrinkage Dr 6100',
        },
        {
          journalEntryId: je.id,
          accountId: aInv,
          debit: '0.00',
          credit: String(shrinkageValue.toFixed(2)),
          memo: 'Inventory Cr 1200',
        },
      ]);
    }

    const [updated] = await tx
      .update(stockTakeSessions)
      .set({
        status: 'POSTED',
        approvedBy: approverId || null,
        journalEntryId,
        postedAt: new Date(),
      })
      .where(eq(stockTakeSessions.id, sessionId))
      .returning();

    return { session: updated, shrinkageValue, journalEntryId };
  });
}

export function computeVariance(physical: number, system: number) {
  return physical - system;
}
