import { and, eq, inArray } from 'drizzle-orm';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  orders,
  payments,
  shifts,
} from '@/db/schema';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';

export type ReconcileInput = {
  shiftId: string;
  closingCash: number;
  actualCard?: number;
  actualPayhere?: number;
  actualPolim?: number;
};

export type ReconcileSummary = {
  openingFloat: number;
  cashSales: number;
  cardSales: number;
  payhereSales: number;
  polimSales: number;
  creditSales: number;
  expectedCash: number;
  closingCash: number;
  cashVariance: number;
  cardVariance: number;
  payhereVariance: number;
  polimVariance: number;
  totalVariance: number;
};

async function resolveAccountId(
  tx: Parameters<typeof ensureDefaultChartOfAccounts>[0] & {
    select: typeof import('@/db').db.select;
    insert: typeof import('@/db').db.insert;
  },
  code: string,
) {
  const [row] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Account ${code} missing`);
  return row.id;
}

export async function closeShiftWithReconciliation(input: ReconcileInput) {
  const { db } = await import('@/db');

  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(eq(shifts.id, input.shiftId)).limit(1);
    if (!shift) throw Object.assign(new Error('Shift not found'), { status: 404 });
    if (shift.status === 'CLOSED') throw Object.assign(new Error('Shift already closed'), { status: 409 });

    const shiftOrders = await tx.select().from(orders).where(eq(orders.shiftId, shift.id));
    const orderIds = shiftOrders.map((o) => o.id);

    let cashSales = 0;
    let cardSales = 0;
    let payhereSales = 0;
    let polimSales = 0;
    let creditSales = 0;

    if (orderIds.length) {
      const payRows = await tx.select().from(payments).where(inArray(payments.orderId, orderIds));
      for (const p of payRows) {
        const amt = Number(p.amount);
        if (p.method === 'CASH' || p.method === 'COD') cashSales += amt;
        else if (p.method === 'CARD' || p.method === 'WEBXPAY') cardSales += amt;
        else if (p.method === 'PAYHERE') payhereSales += amt;
        else if (p.method === 'CREDIT') {
          creditSales += amt;
          polimSales += amt;
        }
      }
    }

    const openingFloat = Number(shift.openingFloat);
    const expectedCash = openingFloat + cashSales;
    const cashVariance = input.closingCash - expectedCash;
    const cardVariance = (input.actualCard ?? cardSales) - cardSales;
    const payhereVariance = (input.actualPayhere ?? payhereSales) - payhereSales;
    const polimVariance = (input.actualPolim ?? polimSales) - polimSales;
    const totalVariance = cashVariance + cardVariance + payhereVariance + polimVariance;

    const reconciliationJson = {
      cashSales,
      cardSales,
      payhereSales,
      polimSales,
      creditSales,
      expectedCash,
      cashVariance,
      cardVariance,
      payhereVariance,
      polimVariance,
      totalVariance,
    };

    const [closed] = await tx
      .update(shifts)
      .set({
        closingCash: String(input.closingCash.toFixed(2)),
        actualCard: String((input.actualCard ?? cardSales).toFixed(2)),
        actualPayhere: String((input.actualPayhere ?? payhereSales).toFixed(2)),
        actualPolim: String((input.actualPolim ?? polimSales).toFixed(2)),
        variance: String(cashVariance.toFixed(2)),
        reconciliationJson,
        status: 'CLOSED',
        closedAt: new Date(),
      })
      .where(eq(shifts.id, shift.id))
      .returning();

    let journalEntryId: string | null = null;
    if (Math.abs(totalVariance) >= 0.01) {
      await ensureDefaultChartOfAccounts(tx as unknown as typeof db);
      const aCashOverShort = await resolveAccountId(tx as never, '6900').catch(async () => {
        await tx
          .insert(chartOfAccounts)
          .values({ code: '6900', name: 'Cash Over / Short', type: 'EXPENSE' })
          .onConflictDoNothing();
        return resolveAccountId(tx as never, '6900');
      });
      const aCash = await resolveAccountId(tx as never, '1010');

      const [je] = await tx
        .insert(journalEntries)
        .values({
          entryNumber: `JRN-Z-${shift.id.slice(0, 8)}`,
          entryDate: new Date(),
          referenceType: 'SHIFT_CLOSE',
          referenceId: shift.id,
          description: `Shift reconciliation variance`,
        })
        .returning();

      journalEntryId = je.id;
      const absVar = Math.abs(totalVariance);
      if (totalVariance < 0) {
        await tx.insert(journalLines).values([
          { journalEntryId: je.id, accountId: aCashOverShort, debit: String(absVar.toFixed(2)), credit: '0.00', memo: 'Short Dr 6900' },
          { journalEntryId: je.id, accountId: aCash, debit: '0.00', credit: String(absVar.toFixed(2)), memo: 'Cash Cr' },
        ]);
      } else {
        await tx.insert(journalLines).values([
          { journalEntryId: je.id, accountId: aCash, debit: String(absVar.toFixed(2)), credit: '0.00', memo: 'Cash Dr' },
          { journalEntryId: je.id, accountId: aCashOverShort, debit: '0.00', credit: String(absVar.toFixed(2)), memo: 'Over Cr 6900' },
        ]);
      }
    }

    const summary: ReconcileSummary = {
      openingFloat,
      cashSales,
      cardSales,
      payhereSales,
      polimSales,
      creditSales,
      expectedCash,
      closingCash: input.closingCash,
      cashVariance,
      cardVariance,
      payhereVariance,
      polimVariance,
      totalVariance,
    };

    return { shift: closed, summary, journalEntryId };
  });
}
