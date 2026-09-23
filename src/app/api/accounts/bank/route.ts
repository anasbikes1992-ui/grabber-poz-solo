import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  addReconLine,
  completeReconciliation,
  createBankAccount,
  createReconciliation,
  listAccounts,
  listReconciliations,
} from '@/lib/finance/bank';

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
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;
    const accounts = await listAccounts();
    const reconciliations = await listReconciliations(accountId);
    return NextResponse.json({ success: true, accounts, reconciliations });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message, accounts: [], reconciliations: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const kind = String(body.kind || body.type || 'account').toLowerCase();

    if (kind === 'reconciliation' || kind === 'recon') {
      const reconciliation = await createReconciliation({ ...body, createdBy: session.userId });
      return NextResponse.json({ success: true, reconciliation });
    }

    const account = await createBankAccount(body);
    return NextResponse.json({ success: true, account });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const action = String(body.action || '').toLowerCase();

    if (action === 'add_line' || action === 'addline') {
      if (!body.reconciliationId) {
        return NextResponse.json({ success: false, error: 'reconciliationId required' }, { status: 400 });
      }
      const line = await addReconLine(body);
      return NextResponse.json({ success: true, line });
    }

    if (action === 'complete') {
      if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      const reconciliation = await completeReconciliation(body.id, {
        skipBalanceCheck: Boolean(body.skipBalanceCheck),
      });
      return NextResponse.json({ success: true, reconciliation });
    }

    return NextResponse.json({ success: false, error: 'action must be add_line|complete' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
