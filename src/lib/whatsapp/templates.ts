import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  body: string;
  variables: string[];
  active: boolean;
};

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_welcome',
    name: 'welcome_greeting',
    language: 'en',
    body: 'Hi! Welcome to {{storeName}} 👋 How can we help you today?',
    variables: ['storeName'],
    active: true,
  },
  {
    id: 'tpl_menu',
    name: 'main_menu',
    language: 'en',
    body:
      'Choose an option:\n\n1️⃣ *Order* — browse our catalog & COD checkout\n2️⃣ *Repairs* — track a device ticket\n3️⃣ *Staff* — speak to our team\n\nReply with 1, 2, or 3.',
    variables: [],
    active: true,
  },
  {
    id: 'tpl_order_link',
    name: 'order_link',
    language: 'en',
    body:
      '🛒 *Order from {{storeName}}*\n\nBrowse catalog: {{shopUrl}}\nCOD checkout: {{checkoutUrl}}\n\nReply *menu* for more options.',
    variables: ['storeName', 'shopUrl', 'checkoutUrl'],
    active: true,
  },
  {
    id: 'tpl_repair_status',
    name: 'repair_status',
    language: 'en',
    body: '🔧 *Your repair tickets:*\n\n{{ticketLines}}\n\nTrack online: {{trackUrl}}\n\nReply *menu* for main options.',
    variables: ['ticketLines', 'trackUrl'],
    active: true,
  },
  {
    id: 'tpl_repair_none',
    name: 'repair_none',
    language: 'en',
    body:
      '🔧 No repair ticket found for this WhatsApp number.\n\nRequest service: {{requestUrl}}\nTrack with ticket #: {{trackUrl}}',
    variables: ['requestUrl', 'trackUrl'],
    active: true,
  },
  {
    id: 'tpl_staff_ack',
    name: 'staff_ack',
    language: 'en',
    body:
      '✅ Thanks! A {{storeName}} team member will reply shortly.\n\nReply *1* to order · *2* for repairs · *menu* for options.',
    variables: ['storeName'],
    active: true,
  },
  {
    id: 'tpl_fallback',
    name: 'fallback_menu',
    language: 'en',
    body:
      'Reply *1* Order · *2* Repairs · *3* Staff · *menu* Show options',
    variables: [],
    active: true,
  },
  {
    id: 'tpl_order_confirm',
    name: 'order_confirmation',
    language: 'en',
    body: 'Hi {{customerName}}, order {{orderNumber}} for LKR {{grandTotal}} is confirmed.',
    variables: ['customerName', 'orderNumber', 'grandTotal'],
    active: true,
  },
  {
    id: 'tpl_low_stock',
    name: 'low_stock_alert',
    language: 'en',
    body: 'Low stock: {{productName}} has {{stock}} units left at {{branchName}}.',
    variables: ['productName', 'stock', 'branchName'],
    active: true,
  },
];

export async function listWhatsAppTemplates() {
  const cfg = await readConfigJson();
  const rows = (cfg.whatsappTemplates as WhatsAppTemplate[] | undefined) || [];
  return rows.length ? rows : DEFAULT_TEMPLATES;
}

export function extractTemplateVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function validateTemplate(
  template: WhatsAppTemplate,
): { ok: true } | { ok: false; error: string } {
  if (!template.name?.trim()) return { ok: false, error: 'Template name is required' };
  if (!template.body?.trim()) return { ok: false, error: `Template "${template.name}" body is empty` };

  const used = extractTemplateVariables(template.body);
  const declared = new Set(template.variables || []);
  const undeclared = used.filter((v) => !declared.has(v));
  if (undeclared.length) {
    return {
      ok: false,
      error: `Template "${template.name}" uses undeclared variables: ${undeclared.join(', ')}`,
    };
  }

  const unused = (template.variables || []).filter((v) => !used.includes(v));
  if (unused.length) {
    return {
      ok: false,
      error: `Template "${template.name}" declares unused variables: ${unused.join(', ')}`,
    };
  }

  return { ok: true };
}

export function validateTemplates(
  templates: WhatsAppTemplate[],
): { ok: true } | { ok: false; error: string } {
  const names = new Set<string>();
  for (const t of templates) {
    const nameKey = t.name.trim().toLowerCase();
    if (names.has(nameKey)) {
      return { ok: false, error: `Duplicate template name: ${t.name}` };
    }
    names.add(nameKey);
    const result = validateTemplate(t);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export async function saveWhatsAppTemplates(templates: WhatsAppTemplate[]) {
  const validation = validateTemplates(templates);
  if (!validation.ok) throw new Error(validation.error);
  await mergeConfigJson({ whatsappTemplates: templates });
  return templates;
}

export function renderTemplate(body: string, vars: Record<string, string | number>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}
