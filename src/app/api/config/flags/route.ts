import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import { getSession } from '@/lib/auth/session';

const DEFAULT_FLAGS = {
  repairs: true,
  restaurant: true,
  hirePurchase: true,
  appointments: true,
  loyalty: true,
  wholesale: true,
  whatsapp: true,
  creative: true,
};

export async function GET() {
  try {
    const rows = await db.select().from(businessConfig).limit(1);
    const cfg = (rows[0]?.configJson as Record<string, unknown> | undefined) || {};
    const flags = { ...DEFAULT_FLAGS, ...((cfg.verticalFlags as Record<string, boolean>) || {}) };
    return NextResponse.json({
      success: true,
      flags,
      vertical: rows[0]?.vertical,
      enableCreditSales: rows[0]?.enableCreditSales ?? true,
      enableDelivery: rows[0]?.enableDelivery ?? true,
    });
  } catch {
    return NextResponse.json({ success: true, flags: DEFAULT_FLAGS, offline: true });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN'))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const flags = { ...DEFAULT_FLAGS, ...(body.flags || {}) };
    const existing = await db.select().from(businessConfig).limit(1);
    if (existing[0]) {
      const prev = (existing[0].configJson || {}) as Record<string, unknown>;
      await db
        .update(businessConfig)
        .set({
          configJson: { ...prev, verticalFlags: flags },
          enableTableService: Boolean(flags.restaurant),
          enableKitchenOrders: Boolean(flags.restaurant),
          updatedAt: new Date(),
        })
        .where(eq(businessConfig.id, existing[0].id));
    } else {
      await db.insert(businessConfig).values({
        configJson: { verticalFlags: flags },
        enableTableService: Boolean(flags.restaurant),
        enableKitchenOrders: Boolean(flags.restaurant),
      });
    }
    return NextResponse.json({ success: true, flags });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
