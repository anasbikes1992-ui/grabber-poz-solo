import { desc, eq } from 'drizzle-orm';
import {
  chartOfAccounts,
  db,
  employees,
  journalEntries,
  journalLines,
  payrollLines,
  payrollRuns,
} from '@/db';
import { ensureDefaultChartOfAccounts } from '@/lib/commerce/ensure-coa';
import { sendTemplatedEmail } from '@/lib/integrations/email';
import { aggregateStatutoryLines, calculateStatutoryLine } from './statutory';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function resolveAccountId(tx: Tx, code: string) {
  const [row] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code)).limit(1);
  if (!row) throw new Error(`Chart of accounts missing code ${code}`);
  return row.id;
}

function cashCode(method?: string): '1010' | '1020' {
  return String(method || 'BANK').toUpperCase() === 'CASH' ? '1010' : '1020';
}

/**
 * Recalculate EPF/ETF/PAYE on every line of a DRAFT run.
 */
export async function recalculatePayrollRun(runId: string) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'DRAFT') throw new Error('Can only recalculate DRAFT payroll runs');

  const lines = await db.select().from(payrollLines).where(eq(payrollLines.runId, runId));
  const results = [];

  for (const line of lines) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, line.employeeId)).limit(1);
    const calc = calculateStatutoryLine({
      grossAmount: Number(line.grossAmount),
      epfEligible: emp?.epfEligible ?? true,
      etfEligible: emp?.etfEligible ?? true,
      payeEligible: emp?.payeEligible ?? false,
    });
    await db
      .update(payrollLines)
      .set({
        employeeEpf: calc.employeeEpf.toFixed(2),
        employerEpf: calc.employerEpf.toFixed(2),
        etfAmount: calc.etf.toFixed(2),
        payeAmount: calc.paye.toFixed(2),
        netAmount: calc.net.toFixed(2),
      })
      .where(eq(payrollLines.id, line.id));
    results.push(calc);
  }

  const totals = aggregateStatutoryLines(results);
  const [updatedRun] = await db
    .update(payrollRuns)
    .set({
      totalGross: totals.totalGross.toFixed(2),
      totalEmployeeEpf: totals.totalEmployeeEpf.toFixed(2),
      totalEmployerEpf: totals.totalEmployerEpf.toFixed(2),
      totalEtf: totals.totalEtf.toFixed(2),
      totalPaye: totals.totalPaye.toFixed(2),
      totalNet: totals.totalNet.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, runId))
    .returning();

  const savedLines = await db.select().from(payrollLines).where(eq(payrollLines.runId, runId));
  return { run: updatedRun, lines: savedLines, totals };
}

/**
 * Finalize DRAFT → FINALIZED and post accrual GL:
 * Dr 5100 gross, Dr 5110 employer EPF+ETF,
 * Cr 2200 EPF, Cr 2210 ETF, Cr 2160 PAYE, Cr 2150 net wages.
 */
export async function finalizePayrollRun(runId: string, createdBy?: string | null) {
  await recalculatePayrollRun(runId);

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'DRAFT') throw new Error('Payroll run already finalized');

  const gross = Number(run.totalGross);
  const empEpf = Number(run.totalEmployeeEpf);
  const emprEpf = Number(run.totalEmployerEpf);
  const etf = Number(run.totalEtf);
  const paye = Number(run.totalPaye || 0);
  const net = Number(run.totalNet);
  if (!(gross > 0)) throw new Error('Cannot finalize payroll with zero gross — set line amounts first');

  await ensureDefaultChartOfAccounts(db);

  return db.transaction(async (tx) => {
    const aSal = await resolveAccountId(tx, '5100');
    const aStat = await resolveAccountId(tx, '5110');
    const aEpf = await resolveAccountId(tx, '2200');
    const aEtf = await resolveAccountId(tx, '2210');
    const aPaye = await resolveAccountId(tx, '2160');
    const aNet = await resolveAccountId(tx, '2150');

    const entropy = Date.now().toString(36);
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `PAY-${run.periodLabel.slice(0, 20)}-${entropy}`,
        entryDate: new Date(),
        referenceType: 'PAYROLL',
        referenceId: run.id,
        description: `Payroll finalize ${run.periodLabel}`,
        createdBy: actorId(createdBy),
      })
      .returning();

    const employerStat = Math.round((emprEpf + etf) * 100) / 100;
    const glLines = [
      { accountId: aSal, debit: gross.toFixed(2), credit: '0.00', memo: 'Gross wages' },
      {
        accountId: aStat,
        debit: employerStat.toFixed(2),
        credit: '0.00',
        memo: 'Employer EPF + ETF',
      },
      {
        accountId: aEpf,
        debit: '0.00',
        credit: (empEpf + emprEpf).toFixed(2),
        memo: 'EPF payable (employee + employer)',
      },
      { accountId: aEtf, debit: '0.00', credit: etf.toFixed(2), memo: 'ETF payable' },
      { accountId: aPaye, debit: '0.00', credit: paye.toFixed(2), memo: 'PAYE / APIT payable' },
      { accountId: aNet, debit: '0.00', credit: net.toFixed(2), memo: 'Net wages payable' },
    ].filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0);

    await tx.insert(journalLines).values(glLines.map((l) => ({ ...l, journalEntryId: je.id })));

    const [updated] = await tx
      .update(payrollRuns)
      .set({
        status: 'FINALIZED',
        journalEntryId: je.id,
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, runId))
      .returning();

    const payLines = await tx.select().from(payrollLines).where(eq(payrollLines.runId, runId));
    for (const line of payLines) {
      const [emp] = await tx.select().from(employees).where(eq(employees.id, line.employeeId)).limit(1);
      if (!emp?.email) continue;
      await sendTemplatedEmail({
        to: emp.email,
        templateKey: 'payslip',
        vars: {
          name: emp.name,
          period: run.periodLabel,
          gross: String(line.grossAmount),
          net: String(line.netAmount),
        },
        fallbackSubject: `Payslip — ${run.periodLabel}`,
        fallbackText: [
          `Hi ${emp.name},`,
          `Period: ${run.periodLabel}`,
          `Gross: LKR ${line.grossAmount}`,
          `EPF emp: LKR ${line.employeeEpf}`,
          `PAYE: LKR ${line.payeAmount}`,
          `Net: LKR ${line.netAmount}`,
        ].join('\n'),
        relatedType: 'payroll_run',
        relatedId: runId,
      }).catch(() => undefined);
    }

    return { run: updated, journalEntryId: je.id };
  });
}

/**
 * Clear net wages payable: Dr 2150 Cr 1010|1020. Marks run PAID when wages cleared.
 */
export async function payWages(
  runId: string,
  opts: { method?: string; createdBy?: string | null } = {},
) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'FINALIZED' && run.status !== 'PAID') {
    throw new Error('Pay wages only after FINALIZED');
  }
  if (run.wagesPaidAt) throw new Error('Wages already paid for this run');

  const net = Number(run.totalNet);
  if (!(net > 0)) throw new Error('No net wages to pay');

  await ensureDefaultChartOfAccounts(db);

  return db.transaction(async (tx) => {
    const aNet = await resolveAccountId(tx, '2150');
    const aCash = await resolveAccountId(tx, cashCode(opts.method));
    const entropy = Date.now().toString(36);
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `PAY-WAGES-${run.periodLabel.slice(0, 16)}-${entropy}`,
        entryDate: new Date(),
        referenceType: 'PAYROLL_WAGES',
        referenceId: run.id,
        description: `Pay net wages ${run.periodLabel}`,
        createdBy: actorId(opts.createdBy),
      })
      .returning();

    await tx.insert(journalLines).values([
      { journalEntryId: je.id, accountId: aNet, debit: net.toFixed(2), credit: '0.00', memo: 'Clear wages payable' },
      { journalEntryId: je.id, accountId: aCash, debit: '0.00', credit: net.toFixed(2), memo: 'Cash/bank out' },
    ]);

    const [updated] = await tx
      .update(payrollRuns)
      .set({
        status: 'PAID',
        wagesPaidAt: new Date(),
        wagesJournalEntryId: je.id,
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, runId))
      .returning();

    return { run: updated, journalEntryId: je.id };
  });
}

/**
 * Remit EPF + ETF (+ PAYE) liabilities: Dr 2200/2210/2160 Cr bank/cash.
 */
export async function payStatutory(
  runId: string,
  opts: { method?: string; createdBy?: string | null; includePaye?: boolean } = {},
) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'FINALIZED' && run.status !== 'PAID') {
    throw new Error('Pay statutory only after FINALIZED');
  }
  if (run.statutoryPaidAt) throw new Error('Statutory already remitted for this run');

  const empEpf = Number(run.totalEmployeeEpf);
  const emprEpf = Number(run.totalEmployerEpf);
  const etf = Number(run.totalEtf);
  const paye = opts.includePaye === false ? 0 : Number(run.totalPaye || 0);
  const epfTotal = empEpf + emprEpf;
  if (!(epfTotal > 0 || etf > 0 || paye > 0)) throw new Error('No statutory amounts to remit');

  await ensureDefaultChartOfAccounts(db);

  return db.transaction(async (tx) => {
    const aEpf = await resolveAccountId(tx, '2200');
    const aEtf = await resolveAccountId(tx, '2210');
    const aPaye = await resolveAccountId(tx, '2160');
    const aCash = await resolveAccountId(tx, cashCode(opts.method));
    const entropy = Date.now().toString(36);
    const [je] = await tx
      .insert(journalEntries)
      .values({
        entryNumber: `PAY-STAT-${run.periodLabel.slice(0, 16)}-${entropy}`,
        entryDate: new Date(),
        referenceType: 'PAYROLL_STATUTORY',
        referenceId: run.id,
        description: `Remit EPF/ETF/PAYE ${run.periodLabel}`,
        createdBy: actorId(opts.createdBy),
      })
      .returning();

    const out: Array<{ accountId: string; debit: string; credit: string; memo: string }> = [];
    if (epfTotal > 0) {
      out.push({
        accountId: aEpf,
        debit: epfTotal.toFixed(2),
        credit: '0.00',
        memo: 'Clear EPF payable',
      });
    }
    if (etf > 0) {
      out.push({ accountId: aEtf, debit: etf.toFixed(2), credit: '0.00', memo: 'Clear ETF payable' });
    }
    if (paye > 0) {
      out.push({
        accountId: aPaye,
        debit: paye.toFixed(2),
        credit: '0.00',
        memo: 'Clear PAYE payable',
      });
    }
    const total = Math.round((epfTotal + etf + paye) * 100) / 100;
    out.push({
      accountId: aCash,
      debit: '0.00',
      credit: total.toFixed(2),
      memo: 'Bank remittance',
    });

    await tx.insert(journalLines).values(out.map((l) => ({ ...l, journalEntryId: je.id })));

    const [updated] = await tx
      .update(payrollRuns)
      .set({
        statutoryPaidAt: new Date(),
        statutoryJournalEntryId: je.id,
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, runId))
      .returning();

    return { run: updated, journalEntryId: je.id, remitted: total };
  });
}

export async function listPayrollRuns(limit = 50) {
  return db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt)).limit(limit);
}

export async function updatePayrollLineGross(lineId: string, grossAmount: number) {
  const [line] = await db.select().from(payrollLines).where(eq(payrollLines.id, lineId)).limit(1);
  if (!line) throw new Error('Payroll line not found');
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, line.runId)).limit(1);
  if (!run || run.status !== 'DRAFT') throw new Error('Can only edit DRAFT payroll lines');

  await db
    .update(payrollLines)
    .set({ grossAmount: Number(grossAmount).toFixed(2) })
    .where(eq(payrollLines.id, lineId));

  return recalculatePayrollRun(line.runId);
}
