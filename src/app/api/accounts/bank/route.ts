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
import {
  approveBankPaymentMatch,
  importBankStatementLines,
  listBankFeed,
  proposeBankPaymentMatches,
} from '@/lib/finance/bank-matching';
import { publicErrorResponse } from '@/lib/api/http-errors';

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
    const [accounts, reconciliations, bankFeed] = await Promise.all([
      listAccounts(),
      listReconciliations(accountId),
      listBankFeed(),
    ]);
    return NextResponse.json({ success: true, accounts, reconciliations, bankFeed });
  } catch (err: unknown) {
    return publicErrorResponse(err, { message: 'Could not load bank reconciliation', logMessage: 'Bank reconciliation load failed' });
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
    return publicErrorResponse(err, { message: 'Could not create bank account or reconciliation', logMessage: 'Bank create failed', status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const action = String(body.action || '').toLowerCase();

    if (action === 'import_feed') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const result = await importBankStatementLines(lines);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'propose_matches') {
      const result = await proposeBankPaymentMatches(body.statementLineId ? String(body.statementLineId) : undefined);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'approve_match') {
      if (!body.matchId) return NextResponse.json({ success: false, error: 'matchId required' }, { status: 400 });
      const match = await approveBankPaymentMatch(String(body.matchId), session.userId);
      return NextResponse.json({ success: true, match });
    }

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

    return NextResponse.json({ success: false, error: 'action must be import_feed|propose_matches|approve_match|add_line|complete' }, { status: 400 });
  } catch (err: unknown) {
    return publicErrorResponse(err, { message: 'Could not update bank reconciliation', logMessage: 'Bank reconciliation update failed', status: 400 });
  }
}
