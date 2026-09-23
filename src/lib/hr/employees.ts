import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { attendance, db, employees, leaveRequests, payrollLines, payrollRuns } from '@/db';

function actorId(userId?: string | null): string | null {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') return null;
  return userId;
}

export async function createEmployee(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  roleTitle?: string | null;
  hireDate?: Date | string | null;
  userId?: string | null;
  basicSalary?: number;
  nicNumber?: string | null;
  epfNumber?: string | null;
  etfNumber?: string | null;
  epfEligible?: boolean;
  etfEligible?: boolean;
  payeEligible?: boolean;
}) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('name required');

  const [row] = await db
    .insert(employees)
    .values({
      name,
      phone: input.phone || null,
      email: input.email || null,
      roleTitle: input.roleTitle || null,
      hireDate: input.hireDate ? new Date(input.hireDate) : null,
      userId: actorId(input.userId),
      basicSalary: Number(input.basicSalary || 0).toFixed(2),
      nicNumber: input.nicNumber || null,
      epfNumber: input.epfNumber || null,
      etfNumber: input.etfNumber || null,
      epfEligible: input.epfEligible !== false,
      etfEligible: input.etfEligible !== false,
      payeEligible: Boolean(input.payeEligible),
      active: true,
    })
    .returning();
  return row;
}

export async function listEmployees(limit = 100) {
  return db.select().from(employees).orderBy(desc(employees.createdAt)).limit(limit);
}

export async function recordAttendance(input: {
  employeeId: string;
  workDate: Date | string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  status?: string;
  notes?: string | null;
}) {
  if (!input.employeeId) throw new Error('employeeId required');
  const workDate = new Date(input.workDate);
  const dayStart = new Date(workDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [sameDay] = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.employeeId, input.employeeId),
        gte(attendance.workDate, dayStart),
        lt(attendance.workDate, dayEnd),
      ),
    )
    .limit(1);

  if (sameDay) {
    const [updated] = await db
      .update(attendance)
      .set({
        checkIn: input.checkIn ? new Date(input.checkIn) : sameDay.checkIn,
        checkOut: input.checkOut ? new Date(input.checkOut) : sameDay.checkOut,
        status: input.status || sameDay.status,
        notes: input.notes ?? sameDay.notes,
      })
      .where(eq(attendance.id, sameDay.id))
      .returning();
    return updated;
  }

  const [row] = await db
    .insert(attendance)
    .values({
      employeeId: input.employeeId,
      workDate,
      checkIn: input.checkIn ? new Date(input.checkIn) : null,
      checkOut: input.checkOut ? new Date(input.checkOut) : null,
      status: input.status || 'PRESENT',
      notes: input.notes || null,
    })
    .returning();
  return row;
}

export async function createLeaveRequest(input: {
  employeeId: string;
  fromDate: Date | string;
  toDate: Date | string;
  leaveType?: string;
  notes?: string | null;
}) {
  if (!input.employeeId) throw new Error('employeeId required');
  const fromDate = new Date(input.fromDate);
  const toDate = new Date(input.toDate);
  if (toDate < fromDate) throw new Error('toDate must be on or after fromDate');

  const [row] = await db
    .insert(leaveRequests)
    .values({
      employeeId: input.employeeId,
      fromDate,
      toDate,
      leaveType: input.leaveType || 'ANNUAL',
      status: 'PENDING',
      notes: input.notes || null,
    })
    .returning();
  return row;
}

export async function updateLeaveStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
) {
  const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  if (!existing) throw new Error('Leave request not found');
  if (existing.status !== 'PENDING') {
    throw new Error(`Cannot update leave in status ${existing.status}; must be PENDING`);
  }
  const [row] = await db
    .update(leaveRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(leaveRequests.id, id))
    .returning();
  return row;
}

export async function listLeaveRequests(limit = 50) {
  return db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt)).limit(limit);
}

export async function createDraftPayrollRun(input: {
  periodLabel: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  notes?: string | null;
  createdBy?: string | null;
  /** Optional per-employee gross; defaults 0 for all active employees */
  lines?: Array<{ employeeId: string; grossAmount?: number; notes?: string | null }>;
}) {
  const periodLabel = String(input.periodLabel || '').trim();
  if (!periodLabel) throw new Error('periodLabel required');

  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);
  if (periodEnd < periodStart) throw new Error('periodEnd must be on or after periodStart');

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(payrollRuns)
      .values({
        periodLabel,
        periodStart,
        periodEnd,
        status: 'DRAFT',
        totalGross: '0.00',
        notes: input.notes || null,
        createdBy: actorId(input.createdBy),
      })
      .returning();

    let lines = input.lines;
    if (!lines || lines.length === 0) {
      const active = await tx.select().from(employees).where(eq(employees.active, true));
      lines = active.map((e) => ({
        employeeId: e.id,
        grossAmount: Number(e.basicSalary || 0),
      }));
    }

    const { calculateStatutoryLine, aggregateStatutoryLines } = await import('./statutory');
    const calcResults = [];
    if (lines.length > 0) {
      const values = [];
      for (const l of lines) {
        const [emp] = await tx.select().from(employees).where(eq(employees.id, l.employeeId)).limit(1);
        const calc = calculateStatutoryLine({
          grossAmount: Number(l.grossAmount || 0),
          epfEligible: emp?.epfEligible ?? true,
          etfEligible: emp?.etfEligible ?? true,
          payeEligible: emp?.payeEligible ?? false,
        });
        calcResults.push(calc);
        values.push({
          runId: run.id,
          employeeId: l.employeeId,
          grossAmount: calc.gross.toFixed(2),
          employeeEpf: calc.employeeEpf.toFixed(2),
          employerEpf: calc.employerEpf.toFixed(2),
          etfAmount: calc.etf.toFixed(2),
          payeAmount: calc.paye.toFixed(2),
          netAmount: calc.net.toFixed(2),
          notes: l.notes || null,
        });
      }
      await tx.insert(payrollLines).values(values);
    }

    const totals = aggregateStatutoryLines(calcResults);
    const [updated] = await tx
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
      .where(eq(payrollRuns.id, run.id))
      .returning();

    const savedLines = await tx.select().from(payrollLines).where(eq(payrollLines.runId, run.id));
    return { ...updated, lines: savedLines };
  });
}
