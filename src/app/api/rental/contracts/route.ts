import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  activateContract,
  createContract,
  disputeContract,
  listContracts,
  listOverdueContracts,
  returnContract,
} from '@/lib/rental/service';

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
    const overdue = new URL(req.url).searchParams.get('overdue') === '1';
    const contracts = overdue ? await listOverdueContracts() : await listContracts();
    return NextResponse.json({ success: true, contracts });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, contracts: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await actor();
    const body = await req.json();
    const contract = await createContract({ ...body, createdBy: session.userId });
    return NextResponse.json({ success: true, contract });
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
    let contract;
    if (action === 'activate') {
      contract = await activateContract(body.id, {
        depositMethod: body.depositMethod,
        createdBy: session.userId,
      });
    } else if (action === 'return') {
      contract = await returnContract(body.id, {
        forfeitDeposit: Boolean(body.forfeitDeposit),
        depositMethod: body.depositMethod,
        createdBy: session.userId,
      });
    } else if (action === 'dispute') {
      contract = await disputeContract(body.id);
    } else {
      return NextResponse.json({ success: false, error: 'action must be activate|return|dispute' }, { status: 400 });
    }

    return NextResponse.json({ success: true, contract });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
