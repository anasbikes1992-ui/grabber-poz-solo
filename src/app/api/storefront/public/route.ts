import { NextResponse } from 'next/server';
import { readStorefrontConfig } from '@/lib/config/storefront-config';

/** Public CMS payload for SSR storefront home */
export async function GET() {
  try {
    const storefront = await readStorefrontConfig();
    return NextResponse.json({ success: true, storefront });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
