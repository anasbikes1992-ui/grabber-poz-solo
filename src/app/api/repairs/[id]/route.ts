import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, repairJobs } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';
import { dispatchAutomationEvent } from '@/lib/automation/engine';
import { REPAIR_STATUS_FLOW } from '@/lib/repairs/status';

type RouteParams = { params: Promise<{ id: string }> };

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await actor();
    const { id } = await params;
    const [job] = await db.select().from(repairJobs).where(eq(repairJobs.id, id)).limit(1);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Repair job not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      job,
      statusFlow: REPAIR_STATUS_FLOW,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await actor();
    const { id } = await params;
    const body = await req.json();
    const [job] = await db
      .update(repairJobs)
      .set({
        status: body.status,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        deviceModel: body.deviceModel,
        primaryFault: body.primaryFault,
        inspectionRemarks: body.inspectionRemarks,
        partsDescription: body.partsDescription,
        partsAmount: body.partsAmount != null ? Number(body.partsAmount).toFixed(2) : undefined,
        serviceCharge: body.serviceCharge != null ? Number(body.serviceCharge).toFixed(2) : undefined,
        advancePaid: body.advancePaid != null ? Number(body.advancePaid).toFixed(2) : undefined,
        technician: body.technician,
        checklistJson: body.checklistJson,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, id))
      .returning();

    if (!job) {
      return NextResponse.json({ success: false, error: 'Repair job not found' }, { status: 404 });
    }

    if (body.status === 'READY') {
      await dispatchAutomationEvent('REPAIR_READY', {
        repairId: job.id,
        ticketCode: job.jobNumber,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        deviceModel: job.deviceModel,
        status: job.status,
      });
    } else if (body.status) {
      await dispatchAutomationEvent('REPAIR_STATUS_CHANGED', {
        repairId: job.id,
        ticketCode: job.jobNumber,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        deviceModel: job.deviceModel,
        status: job.status,
      });
    }

    return NextResponse.json({
      success: true,
      job,
      updatedBy: session && !isDemoUserId(session.userId) ? session.userId : null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    await actor();
    const { id } = await params;
    await db.delete(repairJobs).where(eq(repairJobs.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
