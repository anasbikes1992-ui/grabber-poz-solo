import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';

export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const body = await req.json();
    const to = body.to as string | undefined;
    const text = body.text as string | undefined;

    const result = await sendWhatsAppText({ to: to || '', text: text || '' });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: result.data },
        { status: result.status || 400 },
      );
    }

    if (result.stub) {
      return NextResponse.json({
        success: true,
        stub: true,
        note: 'Dev stub — configure WHATSAPP_TOKEN / WHATSAPP_PHONE_ID for live send',
        preview: result.preview,
      });
    }

    return NextResponse.json({ success: true, provider: result.provider, messageId: result.messageId });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 500 });
  }
}
