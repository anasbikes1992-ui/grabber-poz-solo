import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, businessConfig } from '@/db';
import { getSession } from '@/lib/auth/session';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';

const DEFAULT_FLAGS = {
  repairs: false,
  restaurant: false,
  hirePurchase: false,
  appointments: false,
  loyalty: true,
  wholesale: false,
  grocery: false,
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
      preset: (cfg.verticalPreset as string) || undefined,
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
    let flags = { ...DEFAULT_FLAGS, ...(body.flags || {}) };
    let vertical: string | undefined;

    if (body.preset) {
      const preset = VERTICAL_PRESETS[body.preset as VerticalPresetId];
      if (!preset) {
        return NextResponse.json({ success: false, error: 'Unknown preset' }, { status: 400 });
      }
      flags = { ...DEFAULT_FLAGS, ...preset.flags };
      vertical = preset.vertical;
    }

    const existing = await db.select().from(businessConfig).limit(1);
    if (existing[0]) {
      const prev = (existing[0].configJson || {}) as Record<string, unknown>;
      await db
        .update(businessConfig)
        .set({
          configJson: {
            ...prev,
            verticalFlags: flags,
            ...(body.preset ? { verticalPreset: body.preset } : {}),
          },
          ...(vertical ? { vertical } : {}),
          enableTableService: Boolean(flags.restaurant),
          enableKitchenOrders: Boolean(flags.restaurant),
          updatedAt: new Date(),
        })
        .where(eq(businessConfig.id, existing[0].id));
    } else {
      await db.insert(businessConfig).values({
        vertical: vertical || 'multi',
        configJson: { verticalFlags: flags, ...(body.preset ? { verticalPreset: body.preset } : {}) },
        enableTableService: Boolean(flags.restaurant),
        enableKitchenOrders: Boolean(flags.restaurant),
      });
    }
    return NextResponse.json({ success: true, flags, vertical: vertical || existing[0]?.vertical });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
