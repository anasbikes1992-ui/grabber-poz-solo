import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { runDynamicSeed } from '@/lib/setup/dynamic-seed';
import { runDatabaseSeed } from '@/lib/setup/seed-service';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';

function resolvePreset(body: Record<string, unknown>): VerticalPresetId {
  if (body.profile === 'mobilerepair') return 'mobilerepair';
  const preset = String(body.preset || body.profile || 'fashion');
  if (preset in VERTICAL_PRESETS) return preset as VerticalPresetId;
  return 'fashion';
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') {
      assertCanMutateCommerce(session);
      if (session && session.role !== 'OWNER' && session.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: 'OWNER required to seed' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const storeName = body.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Solo Store';
    const preset = resolvePreset(body);

    if (body.legacy === true) {
      const result = await runDatabaseSeed({
        storeName,
        ownerEmail: body.ownerEmail || `owner@${(body.slug || 'solo').toLowerCase()}.local`,
        ownerPin: body.ownerPin || '1234',
        slug: body.slug || 'solo',
        sessionUserId: session?.userId,
      });
      return NextResponse.json({ success: true, seeded: result });
    }

    const result = await runDynamicSeed({
      storeName,
      ownerEmail: body.ownerEmail || `owner@${(body.slug || 'solo').toLowerCase()}.local`,
      ownerPin: body.ownerPin || '1234',
      slug: body.slug || 'solo',
      sessionUserId: session?.userId,
      preset,
    });

    return NextResponse.json({
      success: true,
      seeded: result,
      preset,
      mobilerepair: result.mobilerepair,
      catalogCount: result.catalogCount,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      {
        success: false,
        error: e.message || 'Seed failed',
        hint: 'Ensure DATABASE_URL points to a schema matching src/db/schema.ts (npm run db:bootstrap)',
      },
      { status: 500 },
    );
  }
}
