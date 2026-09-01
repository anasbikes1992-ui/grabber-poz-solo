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
