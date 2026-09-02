import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { readMarketingConfig, writeMarketingConfig } from '@/lib/config/business-settings';
import { readSocialChannels, writeSocialChannels } from '@/lib/social/channel-config';
import { resolveMarketingPixels } from '@/lib/config/resolve-marketing';
import { buildSocialHealth } from '@/lib/social/channel-health';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING', 'MANAGER']);
    }

    const [channels, marketing, pixels, health] = await Promise.all([
      readSocialChannels(),
      readMarketingConfig(),
      resolveMarketingPixels(),
      buildSocialHealth(),
    ]);

    return NextResponse.json({
      success: true,
      channels,
      marketing,
      pixels,
      health,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    let channels = await readSocialChannels();
    if (body.channels) {
      channels = await writeSocialChannels(body.channels);
    }

    let marketing = await readMarketingConfig();
    if (body.marketing) {
      marketing = await writeMarketingConfig({
        metaPixelId: body.marketing.metaPixelId ?? '',
        ga4Id: body.marketing.ga4Id ?? '',
        gtmId: body.marketing.gtmId ?? '',
        tiktokPixelId: body.marketing.tiktokPixelId ?? '',
      });
    }

    const health = await buildSocialHealth();

    return NextResponse.json({
      success: true,
      channels,
      marketing,
      health,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
