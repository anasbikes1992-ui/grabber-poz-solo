import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { getInstallationIdentity, updateInstallationIdentity } from '@/lib/installation';

export async function POST(req: Request) {
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
      assertRole(session, ['OWNER', 'ADMIN']);
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const current = await getInstallationIdentity();

    // If initial business information was provided, update it
    const updated = await updateInstallationIdentity(
      {
        businessName: body.businessName || current.businessName,
        legalName: body.legalName || current.legalName,
        displayName: body.displayName || current.displayName,
        phone: body.phone || current.phone,
        email: body.email || current.email,
        address: body.address || current.address,
      },
      { id: session.userId, email: session.email },
    );

    return NextResponse.json({
      success: true,
      message: 'Installation bootstrapped successfully',
      identity: updated,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
