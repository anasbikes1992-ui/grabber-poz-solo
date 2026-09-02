import { sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { listWhatsAppTemplates, renderTemplate } from '@/lib/whatsapp/templates';

/** Placeholder seeded in demo config — override via NEXT_PUBLIC_WHATSAPP_NUMBER or Store Builder. */
export const WHATSAPP_PLACEHOLDER_DIGITS = '94771234567';

export function resolveStorefrontWhatsAppNumber(dbNumber?: string | null): string | undefined {
  const env = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  if (env) return env;

  const db = dbNumber?.trim();
  if (!db) return undefined;

  const digits = db.replace(/\D/g, '');
  if (digits === WHATSAPP_PLACEHOLDER_DIGITS) return undefined;
  return db;
}

const GREETING_RE =
  /^(hi|hello|hey|hii|helo|salam|ayubowan|good\s*(morning|afternoon|evening)|start|help)[\s!.?]*$/i;

export function isWhatsAppGreeting(text: string): boolean {
  return GREETING_RE.test(text.trim());
}

function storeName() {
  return process.env.NEXT_PUBLIC_STORE_NAME?.trim() || 'Grabber';
}

/** Auto-reply with configured templates when customer opens with a greeting (24h session window). */
export async function handleInboundWhatsAppGreeting(from: string, inboundText: string) {
  if (!isWhatsAppGreeting(inboundText)) {
    return { handled: false as const, sent: 0 };
  }

  const templates = (await listWhatsAppTemplates()).filter((t) => t.active !== false);
  const welcome =
    templates.find((t) => t.id === 'tpl_welcome' || t.name === 'welcome_greeting') ??
    (templates.length > 0 ? templates[0] : undefined);
  const menu = templates.find((t) => t.id === 'tpl_menu' || t.name === 'main_menu');

  const payloads: string[] = [];
  if (welcome) {
    payloads.push(renderTemplate(welcome.body, { storeName: storeName(), customerName: 'there' }));
  }
  if (menu && menu.id !== welcome?.id) {
    payloads.push(renderTemplate(menu.body, { storeName: storeName() }));
  }
  if (!payloads.length) {
    payloads.push(
      `Hi! Welcome to ${storeName()}. Reply *order* to shop, *repair* for device service, or *staff* to reach our team.`,
    );
  }

  let sent = 0;
  const results: Awaited<ReturnType<typeof sendWhatsAppText>>[] = [];
  for (const text of payloads) {
    const result = await sendWhatsAppText({ to: from, text });
    results.push(result);
    if (result.success) sent += 1;
  }

  return { handled: true as const, sent, results };
}
