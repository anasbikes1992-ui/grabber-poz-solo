import { NextResponse } from 'next/server';
import { assertRole, getSession } from '@/lib/auth/session';
import { listWhatsAppTemplates, saveWhatsAppTemplates } from '@/lib/whatsapp/templates';

export async function GET() {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') assertRole(session, ['OWNER', 'ADMIN', 'MARKETING']);
    const templates = await listWhatsAppTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertRole(session, ['OWNER', 'ADMIN', 'MARKETING']);
    }
    const body = await req.json();
    const templates = await saveWhatsAppTemplates(body.templates || []);
    return NextResponse.json({ success: true, templates });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
