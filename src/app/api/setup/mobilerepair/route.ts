import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { runMobileRepairSetup } from '@/lib/repairs/mobilerepair-setup';

/** One-click MobileRepair shop profile: preset, repair catalog, demo phones. */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertCanMutateCommerce(session);
      if (session && session.role !== 'OWNER' && session.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: 'OWNER required' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const result = (await runMobileRepairSetup(db, {
      storeName: (body.storeName as string) || 'MobileRepair Shop',
    })) as {
      catalogRows: number;
      productSlugs: string[];
      preset: string;
      branchId: string;
    };

    return NextResponse.json({
      success: true,
      profile: 'mobilerepair',
      ...result,
      links: {
        repairBooking: '/shop/repairs/book',
        pos: '/pos',
        storefront: '/products/iphone-15-pro-256-black',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    profile: 'mobilerepair',
    description: 'POST to seed repair catalog, phone variants, and apply Mobile Repair vertical preset.',
    endpoints: {
      book: '/shop/repairs/book',
      estimate: '/api/repairs/estimate',
      appointments: '/api/repairs/appointments',
    },
  });
}
