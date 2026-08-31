import { NextResponse } from 'next/server';

/**
 * WhatsApp Cloud API send stub.
 * Production requires WHATSAPP_TOKEN + WHATSAPP_PHONE_ID — fails loud if missing.
 * Dev without credentials returns honest stub (not a fake provider message id).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = body.to as string | undefined;
    const text = body.text as string | undefined;
    if (!to || !text) {
      return NextResponse.json({ success: false, error: 'to and text required' }, { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'WHATSAPP_TOKEN and WHATSAPP_PHONE_ID required in production' },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        stub: true,
        note: 'Dev stub — configure WHATSAPP_TOKEN / WHATSAPP_PHONE_ID for live send',
        preview: { to, text: String(text).slice(0, 200) },
      });
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error?.message || 'WhatsApp API error', data }, { status: 502 });
    }
    return NextResponse.json({ success: true, provider: data });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
