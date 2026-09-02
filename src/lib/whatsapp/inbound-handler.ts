import { desc, eq } from 'drizzle-orm';
import { db, customers, hasDatabaseUrl, orders, repairJobs } from '@/db';
import { isWhatsAppConfigured, normalizeWhatsAppTo, sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { listWhatsAppTemplates, renderTemplate } from '@/lib/whatsapp/templates';

/** Placeholder seeded in demo config — override via NEXT_PUBLIC_WHATSAPP_NUMBER or Store Builder. */
export const WHATSAPP_PLACEHOLDER_DIGITS = '94771234567';

export type InboundIntent = 'greeting' | 'order' | 'repair' | 'staff' | 'menu' | 'unknown';

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
  /^(hi|hello|hey|hii|helo|salam|ayubowan|good\s*(morning|afternoon|evening)|start)[\s!.?]*$/i;

export function isWhatsAppGreeting(text: string): boolean {
  return GREETING_RE.test(text.trim());
}

/** Match customer ↔ business WhatsApp numbers (handles +94 / 0 prefixes). */
export function phonesMatch(a: string, b: string): boolean {
  const da = normalizeWhatsAppTo(a);
  const db = normalizeWhatsAppTo(b);
  if (!da || !db) return false;
  if (da === db) return true;
  return da.slice(-9) === db.slice(-9);
}

export function parseInboundIntent(text: string): InboundIntent {
  const raw = text.trim();
  if (isWhatsAppGreeting(raw)) return 'greeting';

  const t = raw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(1|one|order|shop|catalog|buy|store|cod)\b/.test(t)) return 'order';
  if (/^(2|two|repair|repairs|fix|track|ticket|device)\b/.test(t)) return 'repair';
  if (/^(3|three|staff|agent|human|talk|support)\b/.test(t) || /^help me\b/.test(t)) return 'staff';
  if (/^(menu|options|restart|start over)\b/.test(t)) return 'menu';
  if (raw.toLowerCase() === 'help') return 'menu';
  return 'unknown';
}

function storeName() {
  return process.env.NEXT_PUBLIC_STORE_NAME?.trim() || 'Grabber';
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CERTIFY_HTTP_BASE_URL?.trim() ||
    'https://grabber-poz-solo.vercel.app'
  ).replace(/\/$/, '');
}

async function sendMessages(to: string, texts: string[]) {
  let sent = 0;
  const results: Awaited<ReturnType<typeof sendWhatsAppText>>[] = [];
  for (const text of texts) {
    const result = await sendWhatsAppText({ to, text });
    results.push(result);
    if (result.success) sent += 1;
  }
  return { sent, results };
}

async function templateBody(ids: string[], names: string[], fallback: string) {
  const templates = (await listWhatsAppTemplates()).filter((t) => t.active !== false);
  const hit =
    templates.find((t) => ids.includes(t.id)) ??
    templates.find((t) => names.includes(t.name));
  return hit?.body ?? fallback;
}

/** Auto-reply with welcome + main menu templates. */
export async function handleInboundWhatsAppGreeting(from: string, inboundText?: string) {
  if (inboundText && !isWhatsAppGreeting(inboundText)) {
    return { handled: false as const, intent: 'greeting' as const, sent: 0, results: [] as const };
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
      `Hi! Welcome to ${storeName()}. Reply *1* to order, *2* for repairs, or *3* to reach staff.`,
    );
  }

  const { sent, results } = await sendMessages(from, payloads);
  return { handled: true as const, intent: 'greeting' as const, sent, results, configured: isWhatsAppConfigured() };
}

async function handleOrderIntent(from: string) {
  const base = appUrl();
  const recent = await lookupRecentOrdersForPhone(from);
  const body = await templateBody(
    ['tpl_order_link'],
    ['order_link'],
    '🛒 *Order online*\n\nBrowse: {{shopUrl}}\nCheckout (COD): {{checkoutUrl}}\n\nReply *menu* anytime for options.',
  );
  let text = renderTemplate(body, {
    storeName: storeName(),
    shopUrl: `${base}/store`,
    checkoutUrl: `${base}/shop/checkout`,
  });
  if (recent.length) {
    const lines = recent.map((o) => `• ${o.orderNumber} — LKR ${o.grandTotal} — _${o.orderStatus}_`);
    text += `\n\n📦 *Recent orders:*\n${lines.join('\n')}`;
  }
  const { sent, results } = await sendMessages(from, [text]);
  return { handled: true as const, intent: 'order' as const, sent, results };
}

async function lookupRepairsForPhone(from: string) {
  if (!hasDatabaseUrl()) return [];
  const rows = await db.select().from(repairJobs).orderBy(desc(repairJobs.updatedAt)).limit(40);
  return rows.filter((j) => phonesMatch(j.customerPhone, from)).slice(0, 3);
}

async function lookupRecentOrdersForPhone(from: string) {
  if (!hasDatabaseUrl()) return [];
  const digits = normalizeWhatsAppTo(from);
  const [customer] = await db.select().from(customers).where(eq(customers.phone, digits)).limit(1);
  if (!customer) {
    const all = await db.select().from(customers).limit(200);
    const match = all.find((c) => phonesMatch(c.phone, from));
    if (!match) return [];
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, match.id))
      .orderBy(desc(orders.createdAt))
      .limit(2);
    return rows;
  }
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
    .orderBy(desc(orders.createdAt))
    .limit(2);
}

async function handleRepairIntent(from: string) {
  const base = appUrl();
  const jobs = await lookupRepairsForPhone(from);
  const trackUrl = `${base}/shop/repairs/track`;
  const requestUrl = `${base}/shop/repairs/request`;

  if (jobs.length) {
    const lines = jobs.map(
      (j) => `• *${j.jobNumber}* — ${j.deviceModel} — _${j.status}_`,
    );
    const body = await templateBody(
      ['tpl_repair_status'],
      ['repair_status'],
      '🔧 *Your repair tickets:*\n\n{{ticketLines}}\n\nTrack: {{trackUrl}}\n\nReply *menu* for main options.',
    );
    const text = renderTemplate(body, {
      storeName: storeName(),
      ticketLines: lines.join('\n'),
      trackUrl,
    });
    const { sent, results } = await sendMessages(from, [text]);
    return { handled: true as const, intent: 'repair' as const, sent, results, tickets: jobs.length };
  }

  const body = await templateBody(
    ['tpl_repair_none'],
    ['repair_none'],
    '🔧 No open repair ticket found for this number.\n\nRequest service: {{requestUrl}}\nTrack (with ticket #): {{trackUrl}}\n\nReply *menu* for options.',
  );
  const text = renderTemplate(body, { storeName: storeName(), requestUrl, trackUrl });
  const { sent, results } = await sendMessages(from, [text]);
  return { handled: true as const, intent: 'repair' as const, sent, results, tickets: 0 };
}

async function handleStaffIntent(from: string, previewText?: string) {
  const ownerPhone =
    process.env.OWNER_WHATSAPP?.trim() ||
    process.env.STAFF_ESCALATION_PHONE?.trim() ||
    '';

  if (ownerPhone && !phonesMatch(ownerPhone, from)) {
    const alert = `📲 *WhatsApp escalation*\nCustomer: ${from}\nMessage: ${previewText?.slice(0, 120) || 'Requested staff (menu 3)'}\n\nReply on WhatsApp Business app.`;
    await sendWhatsAppText({ to: ownerPhone, text: alert }).catch(() => undefined);
  }

  const body = await templateBody(
    ['tpl_staff_ack'],
    ['staff_ack'],
    '✅ Thanks! A team member will reply shortly during business hours.\n\nUrgent order? Reply *1*\nRepair update? Reply *2*',
  );
  const text = renderTemplate(body, { storeName: storeName() });
  const { sent, results } = await sendMessages(from, [text]);
  return { handled: true as const, intent: 'staff' as const, sent, results };
}

async function handleUnknownIntent(from: string) {
  const body = await templateBody(
    ['tpl_fallback'],
    ['fallback_menu'],
    'Sorry, I didn\'t catch that.\n\nReply:\n*1* — Order online\n*2* — Repair status\n*3* — Talk to staff\n*menu* — Show options again',
  );
  const text = renderTemplate(body, { storeName: storeName() });
  const { sent, results } = await sendMessages(from, [text]);
  return { handled: true as const, intent: 'unknown' as const, sent, results };
}

/** Route inbound customer text through greeting → menu → order / repair / staff flows. */
export async function handleInboundWhatsAppMessage(from: string, inboundText: string) {
  const intent = parseInboundIntent(inboundText);

  switch (intent) {
    case 'greeting':
      return handleInboundWhatsAppGreeting(from, inboundText);
    case 'menu':
      return handleInboundWhatsAppGreeting(from);
    case 'order':
      return handleOrderIntent(from);
    case 'repair':
      return handleRepairIntent(from);
    case 'staff':
      return handleStaffIntent(from, inboundText);
    default:
      return handleUnknownIntent(from);
  }
}

export type InboundReplyResult = Awaited<ReturnType<typeof handleInboundWhatsAppMessage>>;
