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

export async function saveWhatsAppTemplates(templates: WhatsAppTemplate[]) {
  await mergeConfigJson({ whatsappTemplates: templates });
  return templates;
}

export function renderTemplate(body: string, vars: Record<string, string | number>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}
