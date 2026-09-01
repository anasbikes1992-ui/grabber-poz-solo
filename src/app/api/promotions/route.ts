import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { listPromotions, savePromotions } from '@/lib/config/promotions-store';
import type { PromotionRule } from '@/lib/commerce/promotion-engine';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertRole(session, ['OWNER', 'ADMIN', 'MANAGER', 'MARKETING']);
    }
    const promotions = await listPromotions();
    return NextResponse.json({ success: true, promotions });
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
    const incoming = (body.promotions || body.rules || []) as PromotionRule[];
    const promotions = await savePromotions(incoming);
    return NextResponse.json({ success: true, promotions });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
