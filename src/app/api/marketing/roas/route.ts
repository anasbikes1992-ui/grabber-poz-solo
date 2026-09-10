import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/auth/session';
import { computeCampaignRoas } from '@/lib/marketing/campaign-roas';

/** VERT-M03/M04 — Creative + blast + meta campaign ROAS. */
export async function GET() {
  try {
    await requireStaffSession();
    const data = await computeCampaignRoas();
    return NextResponse.json({
      success: true,
      ...data,
      creative: data.rows.filter((r) => r.kind === 'CREATIVE'),
      blasts: data.rows.filter((r) => r.kind === 'BLAST'),
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
