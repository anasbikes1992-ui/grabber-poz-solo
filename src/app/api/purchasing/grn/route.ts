import { NextResponse } from 'next/server';
import { defaultPurchasingEngine } from '@/lib/commerce/purchasing-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { poIdOrNumber, grnNumber = `GRN-${Date.now()}`, items = [], receivedBy } = body;

    const res = defaultPurchasingEngine.receiveGRN({
      poIdOrNumber,
      grnNumber,
      items,
      receivedBy,
    });

    return NextResponse.json({
      success: true,
      grn: res.grn,
      po: res.po,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
