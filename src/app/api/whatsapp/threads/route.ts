import { NextResponse } from 'next/server';
import { requireStaffSession, assertCanMutateCommerce } from '@/lib/auth/session';
import {
  appendWhatsAppMessage,
  getOrCreateThreadByPhone,
  listWhatsAppMessages,
  listWhatsAppThreads,
  markThreadRead,
} from '@/lib/whatsapp/thread-store';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';

export async function GET(req: Request) {
  try {
    await requireStaffSession();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (threadId) {
      await markThreadRead(threadId);
      const messages = await listWhatsAppMessages(threadId);
      return NextResponse.json({ success: true, messages });
    }

    const threads = await listWhatsAppThreads(80);
    return NextResponse.json({ success: true, threads });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}

/** Send outbound and persist to inbox */
export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const body = await req.json();
    const phone = String(body.to || body.phone || '').replace(/\D/g, '');
    const text = String(body.text || '').trim();
    if (!phone || !text) {
      return NextResponse.json({ success: false, error: 'to and text required' }, { status: 400 });
    }

    const thread = await getOrCreateThreadByPhone(phone);
    const result = await sendWhatsAppText({ to: phone, text });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: result.data },
        { status: result.status || 400 },
      );
    }

    await appendWhatsAppMessage({
      phone,
      direction: 'OUT',
      body: text,
      providerMessageId: result.success && !result.stub ? result.messageId || null : null,
      status: result.stub ? 'STUB' : 'SENT',
    });

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      stub: Boolean(result.stub),
      messageId: 'messageId' in result ? result.messageId : undefined,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
