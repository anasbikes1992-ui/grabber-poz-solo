import { NextResponse } from 'next/server';
import { readConfigJson } from '@/lib/config/business-settings';
import { DEFAULT_VERTICAL_FLAGS } from '@/lib/config/vertical-flags';
import { readStorefrontConfig } from '@/lib/config/storefront-config';

/** Public CMS payload for SSR storefront home */
export async function GET() {
  try {
    const storefront = await readStorefrontConfig();
    const cfg = await readConfigJson();
    const verticalFlags = { ...DEFAULT_VERTICAL_FLAGS, ...((cfg.verticalFlags as object) || {}) };
    return NextResponse.json({ success: true, storefront, verticalFlags });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
