import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { approveCreativeCampaign } from '@/lib/creative/creative-repo';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING']);
    }

    const body = await req.json();
    if (!body.projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const result = await approveCreativeCampaign(body.projectId, {
      announcement: body.announcement,
      heroTitle: body.heroTitle,
      heroSubtitle: body.heroSubtitle,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
