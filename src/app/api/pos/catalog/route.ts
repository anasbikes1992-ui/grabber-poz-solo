import { NextResponse } from 'next/server';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  const result = await loadStorefrontCatalog(branchId);

  if (!result.ok && result.error?.includes('not configured')) {
    return NextResponse.json(
      { success: false, error: result.error, items: [] },
      { status: 503 },
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, items: [] },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    branchId: result.branchId,
    items: result.items,
  });
}
