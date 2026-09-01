import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { readMarketingConfig, writeMarketingConfig } from '@/lib/config/business-settings';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING', 'MANAGER']);
    }
    const marketing = await readMarketingConfig();
    return NextResponse.json({ success: true, marketing });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING']);
    }

    const body = await req.json();
    const marketing = await writeMarketingConfig({
      metaPixelId: body.metaPixelId ?? '',
      ga4Id: body.ga4Id ?? '',
      tiktokPixelId: body.tiktokPixelId ?? '',
    });

    return NextResponse.json({ success: true, marketing });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
