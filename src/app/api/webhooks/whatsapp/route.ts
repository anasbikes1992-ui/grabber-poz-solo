import { NextResponse } from 'next/server';

/**
 * WhatsApp Cloud API inbound webhook (verification + message intake).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'grabber_dev_verify';

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entries = body.entry || [];
    const messages: Array<{ from: string; text: string }> = [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const msg = change.value?.messages?.[0];
        if (msg?.from && msg.text?.body) {
          messages.push({ from: msg.from, text: msg.text.body });
        }
      }
    }

    // Persist lightweight webhook log via automation log store
    if (messages.length) {
      const { appendAutomationLog } = await import('@/lib/automation/rules-store');
      for (const m of messages) {
        await appendAutomationLog({
          ruleId: 'whatsapp_inbound',
          event: 'CUSTOMER_CREATED',
          status: 'SUCCESS',
          idempotencyKey: `wa_in_${m.from}_${Date.now()}`,
          detail: { from: m.from, text: m.text.slice(0, 500) },
        });
      }
    }

    return NextResponse.json({ success: true, received: messages.length });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
