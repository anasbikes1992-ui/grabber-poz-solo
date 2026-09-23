import { NextResponse } from 'next/server';
import { loadStorefrontCatalog } from '@/lib/storefront/catalog-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  const requestedPage = Number(searchParams.get('page') || '1');
  const requestedLimit = Number(searchParams.get('limit') || '0');
  const shouldPaginate = Number.isFinite(requestedLimit) && requestedLimit > 0;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const limit = shouldPaginate ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100) : 0;
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

  const total = result.items.length;
  const totalPages = shouldPaginate ? Math.max(1, Math.ceil(total / limit)) : 1;
  const safePage = shouldPaginate ? Math.min(page, totalPages) : 1;
  const items = shouldPaginate
    ? result.items.slice((safePage - 1) * limit, safePage * limit)
    : result.items;

  return NextResponse.json({
    success: true,
    branchId: result.branchId,
    items,
    pagination: {
      page: safePage,
      limit: shouldPaginate ? limit : total,
      total,
      totalPages,
      hasNext: shouldPaginate && safePage < totalPages,
      hasPrev: shouldPaginate && safePage > 1,
    },
  });
}
