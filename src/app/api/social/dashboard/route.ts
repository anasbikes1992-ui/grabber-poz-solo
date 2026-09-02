import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { buildSocialHealth } from '@/lib/social/channel-health';
import { readSocialChannels } from '@/lib/social/channel-config';
import { listCreativeProjects } from '@/lib/creative/creative-repo';
import { listCreativeLibrary } from '@/lib/creative/asset-library';
import { parseCreativeKind } from '@/lib/creative/kinds';
import { resolveMarketingPixels } from '@/lib/config/resolve-marketing';
import { db, orders } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [health, channels, projects, assets, pixels, channelSales] = await Promise.all([
      buildSocialHealth(),
      readSocialChannels(),
      listCreativeProjects(12),
      listCreativeLibrary(8),
      resolveMarketingPixels(),
      db
        .select({
          channel: orders.channel,
          count: sql<number>`count(*)::int`,
          revenue: sql<string>`coalesce(sum(${orders.grandTotal}), 0)`,
        })
        .from(orders)
        .groupBy(orders.channel),
    ]);

    const creativeStats = { pdf: 0, video: 0, ugc: 0, total: projects.length };
    for (const p of projects) {
      const k = parseCreativeKind(p.title);
      if (k === 'PDF') creativeStats.pdf++;
      else if (k === 'VIDEO') creativeStats.video++;
      else if (k === 'UGC') creativeStats.ugc++;
    }

    return NextResponse.json({
      success: true,
      health,
      channels,
      pixels,
      creativeStats,
      recentProjects: projects.slice(0, 8),
      recentAssets: assets.slice(0, 6),
      salesByChannel: channelSales.map((r) => ({
        channel: r.channel,
        orders: r.count,
        revenue: Number(r.revenue),
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
