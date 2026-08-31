import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, repairJobs } from '@/db';
import { assertCanMutateCommerce, getSession, isDemoUserId } from '@/lib/auth/session';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const rows = await db.select().from(repairJobs).orderBy(desc(repairJobs.createdAt)).limit(100);
    return NextResponse.json({ success: true, jobs: rows });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, jobs: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const jobNumber = body.jobNumber || `JOB-${Date.now().toString().slice(-6)}`;
    const [job] = await db
      .insert(repairJobs)
      .values({
        jobNumber,
        customerName: String(body.customerName || '').trim() || 'Walk-in',
        customerPhone: String(body.customerPhone || body.mobileNumber || '').trim() || 'n/a',
        customerAddress: body.address || body.customerAddress || null,
        deviceModel: String(body.deviceModel || '').trim() || 'Unknown device',
        primaryFault: body.primaryFault || null,
        inspectionRemarks: body.inspectionRemarks || null,
        checklistJson: body.checklist || {},
        lockType: body.lockType || null,
        partsDescription: body.requiredParts || body.partsDescription || null,
        partsAmount: Number(body.partsAmount || 0).toFixed(2),
        serviceCharge: Number(body.serviceCharge || 0).toFixed(2),
        advancePaid: Number(body.advancePaid || 0).toFixed(2),
        technician: body.technician || null,
        commissionPct: Number(body.commissionPct || 0).toFixed(2),
        status: body.status || 'INTAKE',
        createdBy: session && !isDemoUserId(session.userId) ? session.userId : null,
      })
      .returning();
    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const [job] = await db
      .update(repairJobs)
      .set({
        status: body.status,
        partsAmount: body.partsAmount != null ? Number(body.partsAmount).toFixed(2) : undefined,
        serviceCharge: body.serviceCharge != null ? Number(body.serviceCharge).toFixed(2) : undefined,
        advancePaid: body.advancePaid != null ? Number(body.advancePaid).toFixed(2) : undefined,
        primaryFault: body.primaryFault,
        inspectionRemarks: body.inspectionRemarks,
        updatedAt: new Date(),
      })
      .where(eq(repairJobs.id, body.id))
      .returning();
    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
