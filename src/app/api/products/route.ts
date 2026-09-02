import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  createProduct,
  listProductsWithVariants,
  softDeleteProduct,
  updateProduct,
} from '@/lib/catalog/product-service';

export async function GET() {
  try {
    const data = await listProductsWithVariants();
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, products: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const prod = await createProduct(body);
    return NextResponse.json({ success: true, product: prod });
  } catch (err: unknown) {
    const e = err as Error;
    const status = e.message === 'name and sku required' ? 400 : 400;
    return NextResponse.json({ success: false, error: e.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const prod = await updateProduct(id, body);
    return NextResponse.json({ success: true, product: prod });
  } catch (err: unknown) {
    const e = err as Error;
    const status = e.message === 'Product not found' ? 404 : 400;
    return NextResponse.json({ success: false, error: e.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const prod = await softDeleteProduct(id);
    return NextResponse.json({ success: true, product: prod, softDeleted: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
