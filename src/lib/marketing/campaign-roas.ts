/**
 * VERT-M03/M04 — Campaign ROAS from marketing_spend ↔ orders.campaign_id.
 */
import { eq, sql } from 'drizzle-orm';
import { db, marketingSpend, orders, creativeProjects } from '@/db';

export type CampaignRoasRow = {
  campaignId: string;
  channel: string;
  campaignName: string | null;
  spendLkr: number;
  revenueLkr: number;
  orderCount: number;
  roas: number | null;
  kind: 'CREATIVE' | 'BLAST' | 'META' | 'OTHER';
};

function classifyCampaign(campaignId: string, channel: string): CampaignRoasRow['kind'] {
  if (campaignId.startsWith('blast_') || channel === 'WHATSAPP') return 'BLAST';
  if (campaignId.startsWith('creative:') || channel === 'CREATIVE') return 'CREATIVE';
  if (channel === 'META' || channel === 'GOOGLE') return 'META';
  return 'OTHER';
}

export async function computeCampaignRoas(): Promise<{
  rows: CampaignRoasRow[];
  summary: { totalSpend: number; totalRevenue: number; blendedRoas: number | null };
}> {
  const spendRows = await db.select().from(marketingSpend).limit(500);
  const spendByCampaign = new Map<string, { amount: number; channel: string; name: string | null }>();

  for (const s of spendRows) {
    const id = s.campaignId || `${s.channel}:untagged`;
    const prev = spendByCampaign.get(id) || { amount: 0, channel: s.channel, name: s.campaignName };
    prev.amount += Number(s.amount || 0);
    if (s.campaignName) prev.name = s.campaignName;
    spendByCampaign.set(id, prev);
  }

  const orderAgg = await db
    .select({
      campaignId: orders.campaignId,
      revenue: sql<string>`coalesce(sum(${orders.grandTotal}::numeric), 0)`,
      cnt: sql<string>`count(*)::int`,
    })
    .from(orders)
    .where(sql`${orders.campaignId} is not null AND ${orders.orderStatus} != 'DRAFT' AND ${orders.orderStatus} != 'CANCELLED'`)
    .groupBy(orders.campaignId);

  const revByCampaign = new Map<string, { revenue: number; count: number }>();
  for (const o of orderAgg) {
    if (!o.campaignId) continue;
    revByCampaign.set(o.campaignId, { revenue: Number(o.revenue || 0), count: Number(o.cnt || 0) });
  }

  const ids = new Set([...spendByCampaign.keys(), ...revByCampaign.keys()]);
  const creativeIds = [...ids]
    .map((id) => (id.startsWith('creative:') ? id.slice('creative:'.length) : id))
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));

  const creativeTitles = new Map<string, string>();
  if (creativeIds.length) {
    for (const id of creativeIds.slice(0, 50)) {
      const [p] = await db.select({ id: creativeProjects.id, title: creativeProjects.title }).from(creativeProjects).where(eq(creativeProjects.id, id)).limit(1);
      if (p) creativeTitles.set(p.id, p.title);
    }
  }

  const rows: CampaignRoasRow[] = [];
  for (const id of ids) {
    const spend = spendByCampaign.get(id);
    const rev = revByCampaign.get(id) || { revenue: 0, count: 0 };
    const spendLkr = spend?.amount || 0;
    const revenueLkr = rev.revenue;
    const channel = spend?.channel || 'OTHER';
    const bare = id.startsWith('creative:') ? id.slice('creative:'.length) : id;
    const name = spend?.name || creativeTitles.get(bare) || null;
    rows.push({
      campaignId: id,
      channel,
      campaignName: name,
      spendLkr,
      revenueLkr,
      orderCount: rev.count,
      roas: spendLkr > 0 ? Math.round((revenueLkr / spendLkr) * 100) / 100 : null,
      kind: classifyCampaign(id, channel),
    });
  }

  rows.sort((a, b) => b.revenueLkr - a.revenueLkr);
  const totalSpend = rows.reduce((s, r) => s + r.spendLkr, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenueLkr, 0);

  return {
    rows,
    summary: {
      totalSpend,
      totalRevenue,
      blendedRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : null,
    },
  };
}
