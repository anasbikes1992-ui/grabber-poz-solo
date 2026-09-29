import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import {
  mergeConfigJson,
  readBusinessProfile,
  readConfigJson,
  readIntegrationsPublic,
  upsertBusinessProfile,
} from '@/lib/config/business-settings';
import { publicErrorResponse } from '@/lib/api/http-errors';

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
      companyWhatsAppAutomation: {
        enabled: (config.companyWhatsAppAutomation as Record<string, unknown> | undefined)?.enabled !== false,
        autoReplyToLead: (config.companyWhatsAppAutomation as Record<string, unknown> | undefined)?.autoReplyToLead !== false,
        salesWhatsapp: String((config.companyWhatsAppAutomation as Record<string, unknown> | undefined)?.salesWhatsapp || config.companySalesWhatsapp || ''),
        demoUrl: String((config.companyWhatsAppAutomation as Record<string, unknown> | undefined)?.demoUrl || process.env.COMPANY_DEMO_URL || ''),
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status && status < 500) return publicErrorResponse(err, { status, message: 'Unauthorized' });
    return publicErrorResponse(err, { message: 'Could not load company settings', logMessage: 'Company settings load failed' });
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
      logoUrl: body.logoUrl,
      receiptHeader: body.receiptHeader,
      receiptFooter: body.receiptFooter,
      currency: body.currency,
      timezone: body.timezone,
    });

    if (body.companyWhatsAppAutomation && typeof body.companyWhatsAppAutomation === 'object') {
      const current = await readConfigJson().catch(() => ({} as Record<string, unknown>));
      const prev = (current.companyWhatsAppAutomation || {}) as Record<string, unknown>;
      const next = body.companyWhatsAppAutomation as Record<string, unknown>;
      await mergeConfigJson({
        companyWhatsAppAutomation: {
          ...prev,
          enabled: next.enabled !== false,
          autoReplyToLead: next.autoReplyToLead !== false,
          salesWhatsapp: typeof next.salesWhatsapp === 'string' ? next.salesWhatsapp.trim() : '',
          demoUrl: typeof next.demoUrl === 'string' ? next.demoUrl.trim() : '',
        },
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status && status < 500) return publicErrorResponse(err, { status, message: 'Unauthorized' });
    return publicErrorResponse(err, { message: 'Could not save company settings', logMessage: 'Company settings save failed' });
  }
}
