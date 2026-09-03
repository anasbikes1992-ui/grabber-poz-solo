import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import {
  createProduct,
  listProductsWithVariants,
  softDeleteProduct,
  updateProduct,
} from '@/lib/catalog/product-service';

export async function GET() {
  try {
    await requireStaffSession();
    const data = await listProductsWithVariants();
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: e.message || 'Load failed', products: [] },
      { status: e.status || 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const body = await req.json();
    const prod = await createProduct(body);
    return NextResponse.json({ success: true, product: prod });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const body = await req.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const prod = await updateProduct(id, body);
    return NextResponse.json({ success: true, product: prod });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    const status = e.status || (e.message === 'Product not found' ? 404 : 400);
    return NextResponse.json({ success: false, error: e.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const prod = await softDeleteProduct(id);
    return NextResponse.json({ success: true, product: prod, softDeleted: true });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
