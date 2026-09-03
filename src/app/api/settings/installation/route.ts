import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { getInstallationIdentity, updateInstallationIdentity } from '@/lib/installation';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    const identity = await getInstallationIdentity();
    return NextResponse.json({ success: true, identity });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
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
    } else if (session) {
      assertRole(session, ['OWNER', 'ADMIN']);
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updated = await updateInstallationIdentity(body, {
      id: session.userId,
      email: session.email,
    });

    return NextResponse.json({ success: true, identity: updated });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
