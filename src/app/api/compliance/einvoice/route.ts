import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  createEinvoiceDraft,
  listEinvoices,
  queueEinvoiceSubmission,
  submitEinvoice,
} from '@/lib/compliance/einvoice';
import { enqueueJob } from '@/lib/jobs/outbox';

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
    const submissions = await listEinvoices();
    return NextResponse.json({
      success: true,
      submissions,
      providerConfigured: Boolean(process.env.EINVOICE_PROVIDER_URL),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message, submissions: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const orderNumber = String(body.orderNumber || '').trim();
    if (!orderNumber) {
      return NextResponse.json({ success: false, error: 'orderNumber required' }, { status: 400 });
    }
    const row = await createEinvoiceDraft(orderNumber, session.userId);
    return NextResponse.json({ success: true, submission: row });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const action = String(body.action || '').toLowerCase();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    if (action === 'queue') {
      const row = await queueEinvoiceSubmission(id);
      await enqueueJob({
        type: 'EINVOICE_SUBMIT',
        idempotencyKey: `einvoice-submit-${id}-${Date.now()}`,
        payload: { id },
      });
      return NextResponse.json({ success: true, submission: row });
    }
    if (action === 'submit') {
      const row = await submitEinvoice(id);
      return NextResponse.json({ success: true, submission: row });
    }

    return NextResponse.json({ success: false, error: 'action must be queue|submit' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
