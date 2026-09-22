import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  approvePrescription,
  cancelPrescription,
  createPrescription,
  listPrescriptions,
  submitForApproval,
} from '@/lib/pharmacy/prescriptions';
import { dispensePrescriptionWithFefo } from '@/lib/pharmacy/dispense';

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
    await actor();
    const rows = await listPrescriptions();
    return NextResponse.json({ success: true, prescriptions: rows });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, prescriptions: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const rx = await createPrescription({
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerId: body.customerId,
      doctorName: body.doctorName,
      notes: body.notes,
      lines: body.lines,
      createdBy: session.userId,
    });
    return NextResponse.json({ success: true, prescription: rx });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const action = String(body.action || '').toLowerCase();
    let prescription;
    if (action === 'submit') {
      prescription = await submitForApproval(body.id);
    } else if (action === 'approve') {
      prescription = await approvePrescription(body.id, {
        approverUserId: session.userId,
        notes: body.notes,
        decision: body.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED',
      });
    } else if (action === 'dispense') {
      prescription = await dispensePrescriptionWithFefo(body.id, {
        pharmacistUserId: session.userId,
        branchId: body.branchId || null,
      });
    } else if (action === 'cancel') {
      prescription = await cancelPrescription(body.id);
    } else {
      return NextResponse.json({ success: false, error: 'action must be submit|approve|dispense|cancel' }, { status: 400 });
    }

    return NextResponse.json({ success: true, prescription });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
