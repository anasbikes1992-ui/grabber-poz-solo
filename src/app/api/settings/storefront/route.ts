import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { readStorefrontConfig, writeStorefrontConfig } from '@/lib/config/storefront-config';

export async function GET() {
  try {
    const storefront = await readStorefrontConfig();
    return NextResponse.json({ success: true, storefront });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING']);
    }
    const body = await req.json();
    const storefront = await writeStorefrontConfig(body.storefront || body);
    return NextResponse.json({ success: true, storefront });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
