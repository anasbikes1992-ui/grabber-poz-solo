import { NextResponse } from 'next/server';
import { defaultCommerceService } from '@/lib/commerce/commerce-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fromLocationType = 'WAREHOUSE',
      fromLocationId,
      toLocationType = 'BRANCH',
      toLocationId,
      items = [],
      transferNumber = `TRF-${Date.now()}`,
      actorId,
    } = body;

    const res = defaultCommerceService.transferStock({
      transferNumber,
      fromLocationType,
      fromLocationId,
      toLocationType,
      toLocationId,
      items,
      actorId,
    });

    return NextResponse.json({
      success: true,
      transfer: res,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
