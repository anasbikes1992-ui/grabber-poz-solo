import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  addCompatibility,
  listCompatibilityByGeneration,
  listCompatibilityByProduct,
  searchByOem,
  searchByVehicle,
} from '@/lib/auto-parts/service';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(req: Request) {
  try {
    await actor();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const generationId = searchParams.get('generationId');
    const makeId = searchParams.get('makeId');
    const modelId = searchParams.get('modelId');
    const year = searchParams.get('year');
    const oem = searchParams.get('oem');

    if (oem) {
      const rows = await searchByOem(oem);
      return NextResponse.json({ success: true, compatibility: rows });
    }

    if (productId) {
      const rows = await listCompatibilityByProduct(productId);
      return NextResponse.json({ success: true, compatibility: rows });
    }

    if (generationId && !makeId && !modelId && year == null) {
      const rows = await listCompatibilityByGeneration(generationId);
      return NextResponse.json({ success: true, compatibility: rows });
    }

    const rows = await searchByVehicle({
      makeId: makeId || undefined,
      modelId: modelId || undefined,
      generationId: generationId || undefined,
      year: year != null ? Number(year) : undefined,
    });

    return NextResponse.json({ success: true, compatibility: rows });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message, compatibility: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const row = await addCompatibility(body);
    return NextResponse.json({ success: true, compatibility: row });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
