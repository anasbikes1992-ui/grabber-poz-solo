import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createAsset, listAssets, updateAsset } from '@/lib/rental/service';

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
    const assets = await listAssets();
    return NextResponse.json({ success: true, assets });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, assets: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const asset = await createAsset(body);
    return NextResponse.json({ success: true, asset });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    const asset = await updateAsset(body.id, body);
    return NextResponse.json({ success: true, asset });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
