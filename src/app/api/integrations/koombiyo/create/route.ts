import { NextResponse } from 'next/server';

/**
 * Koombiyo delivery create stub — honest when credentials missing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNumber, recipientName, recipientPhone, address } = body as {
      orderNumber?: string;
      recipientName?: string;
      recipientPhone?: string;
      address?: string;
    };
    if (!orderNumber || !recipientPhone || !address) {
      return NextResponse.json(
        { success: false, error: 'orderNumber, recipientPhone, address required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.KOOMBIYO_API_KEY;
    const baseUrl = process.env.KOOMBIYO_API_URL || 'https://api.koombiyo.com';

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'KOOMBIYO_API_KEY required in production' }, { status: 503 });
      }
      return NextResponse.json({
        success: true,
        stub: true,
        note: 'Dev stub — set KOOMBIYO_API_KEY for live create',
        preview: { orderNumber, recipientName, recipientPhone, address },
      });
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/shipments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: orderNumber,
        recipient: { name: recipientName, phone: recipientPhone, address },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Koombiyo API error', data }, { status: 502 });
    }
    return NextResponse.json({ success: true, provider: data });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
