import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listCreativeLibrary } from '@/lib/creative/asset-library';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const assets = await listCreativeLibrary(80);
    return NextResponse.json({ success: true, assets });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
