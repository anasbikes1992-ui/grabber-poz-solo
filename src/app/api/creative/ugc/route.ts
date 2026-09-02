import { NextRequest, NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { createUgcCampaign } from '@/lib/creative/ugc-service';

export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const productName = String(body.productName || '').trim();
    if (!productName) {
      return NextResponse.json({ success: false, error: 'productName is required' }, { status: 400 });
    }

    const result = await createUgcCampaign({
      productId: body.productId,
      productName,
      productImageUrl: body.productImageUrl,
      objective: body.objective || 'CONVERSION',
      style: body.style || 'authentic',
      variantCount: body.variantCount,
      aspectRatio: body.aspectRatio,
      createdBy: session?.userId || null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
