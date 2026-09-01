import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import {
  readBusinessProfile,
  readConfigJson,
  readIntegrationsPublic,
  upsertBusinessProfile,
} from '@/lib/config/business-settings';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    const [profile, integrations, config] = await Promise.all([
      readBusinessProfile(),
      readIntegrationsPublic(),
      readConfigJson(),
    ]);

    return NextResponse.json({
      success: true,
      profile: profile
        ? {
            name: profile.name,
            legalName: profile.legalName,
            taxNumber: profile.taxNumber,
            receiptHeader: profile.receiptHeader,
            receiptFooter: profile.receiptFooter,
            currency: profile.currency,
            timezone: profile.timezone,
            logoUrl: profile.logoUrl,
          }
        : null,
      integrations,
      verticalFlags: (config.verticalFlags as Record<string, boolean>) || {},
    });
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
    } else {
      assertRole(session, ['OWNER', 'ADMIN']);
    }

    const body = await req.json();
    const profile = await upsertBusinessProfile({
      name: body.name,
      legalName: body.legalName,
      taxNumber: body.taxNumber,
      receiptHeader: body.receiptHeader,
      receiptFooter: body.receiptFooter,
      currency: body.currency,
      timezone: body.timezone,
    });

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
