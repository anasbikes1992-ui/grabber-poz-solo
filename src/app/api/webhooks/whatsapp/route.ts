import { NextResponse } from 'next/server';
import { resolveWhatsAppConfig, verifyWhatsAppWebhookSignature } from '@/lib/integrations/whatsapp';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const { verifyToken } = resolveWhatsAppConfig();

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody) as { entry?: unknown[] };
    const entries = body.entry || [];
    const messages: Array<{ from: string; text: string }> = [];

    for (const entry of entries as Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: string; text?: { body?: string } }> } }> }>) {
      for (const change of entry.changes || []) {
        const msg = change.value?.messages?.[0];
        if (msg?.from && msg.text?.body) {
          messages.push({ from: msg.from, text: msg.text.body });
        }
      }
    }

    if (messages.length) {
      const { appendAutomationLog } = await import('@/lib/automation/rules-store');
      for (const m of messages) {
        await appendAutomationLog({
          ruleId: 'whatsapp_inbound',
          event: 'CUSTOMER_CREATED',
          status: 'SUCCESS',
          idempotencyKey: `wa_in_${m.from}_${Date.now()}`,
          detail: { from: m.from, text: m.text.slice(0, 500), inbound: true },
        });
      }
    }

    return NextResponse.json({ success: true, received: messages.length });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
