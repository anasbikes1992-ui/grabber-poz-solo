import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, generateRandomPin, getSession } from '@/lib/auth/session';
import { getStoreName } from '@/lib/config/app-url';
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
    // Unconditional — this route seeds/overwrites catalogs, users, and settings.
    // Never gate this behind NODE_ENV; a non-production boot must not open it.
    const rawSession = await getSession();
    const session = assertCanMutateCommerce(rawSession);
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'OWNER required to seed' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const storeName = body.storeName || getStoreName();
    const preset = resolvePreset(body);
    // Never default to a guessable PIN — generate one and hand it back once.
    const ownerPin = body.ownerPin || generateRandomPin();

    if (body.legacy === true) {
      const result = await runDatabaseSeed({
        storeName,
        ownerEmail: body.ownerEmail || `owner@${(body.slug || 'solo').toLowerCase()}.local`,
        ownerPin,
        slug: body.slug || 'solo',
        sessionUserId: session?.userId,
      });
      return NextResponse.json({
        success: true,
        seeded: result,
        generatedPins: result.generatedPins,
        note: 'Staff PINs are generated per-role and returned once here. Store them now; rotate on first login.',
      });
    }

    const result = await runDynamicSeed({
      storeName,
      ownerEmail: body.ownerEmail || `owner@${(body.slug || 'solo').toLowerCase()}.local`,
      ownerPin,
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
      generatedPins: result.generatedPins,
      note: 'Staff PINs are generated per-role and returned once here. Store them now; rotate on first login.',
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
