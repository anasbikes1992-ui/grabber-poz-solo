import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  createDraftPayrollRun,
  createEmployee,
  createLeaveRequest,
  listEmployees,
  listLeaveRequests,
  recordAttendance,
  updateLeaveStatus,
} from '@/lib/hr/employees';
import { finalizePayrollRun, listPayrollRuns, payStatutory, payWages, recalculatePayrollRun } from '@/lib/hr/payroll';
import { importSalonCommissionsToPayroll } from '@/lib/hr/commission-import';
import { sendTemplatedEmail } from '@/lib/integrations/email';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(req: Request) {
  try {
    await actor();
    const url = new URL(req.url);
    const include = url.searchParams.get('include');
    const employees = await listEmployees();
    const leave = include === 'leave' || include === 'all' ? await listLeaveRequests() : undefined;
    const payroll = include === 'payroll' || include === 'all' ? await listPayrollRuns() : undefined;
    return NextResponse.json({ success: true, employees, leave, payroll });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, employees: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const employee = await createEmployee(body);
    return NextResponse.json({ success: true, employee });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = String(body.action || '').toLowerCase();

    if (action === 'attendance') {
      const row = await recordAttendance(body);
      return NextResponse.json({ success: true, attendance: row });
    }
    if (action === 'leave') {
      const row = await createLeaveRequest(body);
      return NextResponse.json({ success: true, leave: row });
    }
    if (action === 'payroll') {
      const run = await createDraftPayrollRun({ ...body, createdBy: session.userId });
      return NextResponse.json({ success: true, payroll: run });
    }
    if (action === 'leave_decide') {
      const status = String(body.status || '').toUpperCase();
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        return NextResponse.json({ success: false, error: 'status must be APPROVED|REJECTED' }, { status: 400 });
      }
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const row = await updateLeaveStatus(body.id, status as 'APPROVED' | 'REJECTED');
      const emp = (await listEmployees()).find((e) => e.id === row.employeeId);
      if (emp?.email) {
        await sendTemplatedEmail({
          to: emp.email,
          templateKey: 'leave_decision',
          vars: { status: status.toLowerCase() },
          fallbackSubject: `Leave ${status.toLowerCase()} — ${emp.name}`,
          fallbackText: `Your leave request (${row.leaveType}) was ${status.toLowerCase()}.`,
          relatedType: 'leave_request',
          relatedId: row.id,
        }).catch(() => undefined);
      }
      return NextResponse.json({ success: true, leave: row });
    }
    if (action === 'payroll_recalc') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const result = await recalculatePayrollRun(body.id);
      return NextResponse.json({ success: true, ...result });
    }
    if (action === 'payroll_finalize') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const result = await finalizePayrollRun(body.id, session.userId);
      return NextResponse.json({ success: true, ...result });
    }
    if (action === 'payroll_pay_wages') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const result = await payWages(body.id, { method: body.method, createdBy: session.userId });
      return NextResponse.json({ success: true, ...result });
    }
    if (action === 'payroll_pay_statutory') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const result = await payStatutory(body.id, {
        method: body.method,
        createdBy: session.userId,
        includePaye: body.includePaye !== false,
      });
      return NextResponse.json({ success: true, ...result });
    }
    if (action === 'payroll_import_commissions') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const result = await importSalonCommissionsToPayroll({
        runId: body.id,
        from: body.from,
        to: body.to,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'action must be attendance|leave|payroll|leave_decide|payroll_recalc|payroll_finalize|payroll_pay_wages|payroll_pay_statutory|payroll_import_commissions',
      },
      { status: 400 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
