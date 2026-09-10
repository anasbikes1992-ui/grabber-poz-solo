import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { bulkAssignCategory, bulkSoftDeleteProducts } from '@/lib/catalog/product-service';

export async function POST(req: Request) {
  try {
    const session = await requireStaffSession();
    assertCanMutateCommerce(session);

    const body = await req.json();
    const action = String(body.action || '').trim().toLowerCase();
    const productIds = Array.isArray(body.productIds) ? (body.productIds as string[]) : [];

    if (!productIds.length) {
      return NextResponse.json(
        { success: false, error: 'productIds array cannot be empty' },
        { status: 400 },
      );
    }

    if (action === 'delete') {
      const result = await bulkSoftDeleteProducts(productIds);
      return NextResponse.json({
        success: true,
        action: 'delete',
        count: result.count,
        productIds: result.productIds,
        message: `Successfully soft-deleted ${result.count} product(s).`,
      });
    }

    if (action === 'assign-category') {
      const category = String(body.category || body.categoryName || '').trim();
      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Category name or ID is required' },
          { status: 400 },
        );
      }
      const result = await bulkAssignCategory(productIds, category);
      return NextResponse.json({
        success: true,
        action: 'assign-category',
        count: result.count,
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        productIds: result.productIds,
        message: `Successfully assigned ${result.count} product(s) to "${category}".`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported bulk action "${action}". Valid actions: 'delete', 'assign-category'` },
      { status: 400 },
    );
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Bulk operation failed' },
      { status: e.status || 500 },
    );
  }
}
