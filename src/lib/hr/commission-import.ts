/**
 * Import salon stylist commissions into a DRAFT payroll run as gross add-ons
 * (matched by employee roleTitle/name ≈ specialist).
 */
import { and, eq, gte, lte } from 'drizzle-orm';
import { appointments, db, employees, payrollLines, payrollRuns } from '@/db';
import { recalculatePayrollRun } from './payroll';

function norm(s: string) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

export async function importSalonCommissionsToPayroll(input: {
  runId: string;
  from?: Date | string;
  to?: Date | string;
}) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, input.runId)).limit(1);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'DRAFT') throw new Error('Can only import commissions into DRAFT payroll');

  const from = input.from ? new Date(input.from) : new Date(run.periodStart);
  const to = input.to ? new Date(input.to) : new Date(run.periodEnd);

  const appts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'COMPLETED'),
        gte(appointments.startsAt, from),
        lte(appointments.startsAt, to),
      ),
    );

  const bySpecialist: Record<string, number> = {};
  for (const a of appts) {
    const key = norm(a.specialist || '');
    if (!key) continue;
    bySpecialist[key] = (bySpecialist[key] || 0) + Number(a.commissionAmount || 0);
  }

  const emps = await db.select().from(employees).where(eq(employees.active, true));
  let matched = 0;
  let addedGross = 0;

  for (const [spec, amount] of Object.entries(bySpecialist)) {
    if (!(amount > 0)) continue;
    const emp = emps.find(
      (e) => norm(e.name) === spec || norm(e.roleTitle || '') === spec || norm(e.name).includes(spec),
    );
    if (!emp) continue;

    const [line] = await db
      .select()
      .from(payrollLines)
      .where(and(eq(payrollLines.runId, input.runId), eq(payrollLines.employeeId, emp.id)))
      .limit(1);

    if (line) {
      const nextGross = Number(line.grossAmount) + amount;
      await db
        .update(payrollLines)
        .set({
          grossAmount: nextGross.toFixed(2),
          notes: [line.notes, `+salon commission ${amount.toFixed(2)}`].filter(Boolean).join(' | '),
        })
        .where(eq(payrollLines.id, line.id));
    } else {
      await db.insert(payrollLines).values({
        runId: input.runId,
        employeeId: emp.id,
        grossAmount: amount.toFixed(2),
        notes: `Salon commission import`,
      });
    }
    matched += 1;
    addedGross += amount;
  }

  const recalc = await recalculatePayrollRun(input.runId);
  return {
    matched,
    addedGross: Math.round(addedGross * 100) / 100,
    specialists: Object.keys(bySpecialist).length,
    ...recalc,
  };
}
