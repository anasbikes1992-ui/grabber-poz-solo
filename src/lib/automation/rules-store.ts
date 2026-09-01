import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type AutomationRule = {
  id: string;
  name: string;
  event: 'ORDER_CREATED' | 'ORDER_PAID' | 'STOCK_LOW' | 'CUSTOMER_CREATED';
  active: boolean;
  condition?: { channel?: string; minTotal?: number };
  action:
    | { type: 'WHATSAPP_TEXT'; to: string; text: string }
    | { type: 'LOG'; message: string };
};

export type AutomationLogEntry = {
  id: string;
  ruleId: string;
  event: string;
  status: 'SUCCESS' | 'FAILED';
  idempotencyKey: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'auto_order_whatsapp',
    name: 'Order confirmation WhatsApp',
    event: 'ORDER_CREATED',
    active: true,
    condition: { channel: 'STOREFRONT' },
    action: {
      type: 'WHATSAPP_TEXT',
      to: '{{customerPhone}}',
      text: 'Hi {{customerName}}, your order {{orderNumber}} for LKR {{grandTotal}} is confirmed. Thank you!',
    },
  },
  {
    id: 'auto_order_log',
    name: 'Order created audit log',
    event: 'ORDER_CREATED',
    active: true,
    action: {
      type: 'LOG',
      message: 'Order {{orderNumber}} created on channel {{channel}}',
    },
  },
];

export async function listAutomationRules(): Promise<AutomationRule[]> {
  const cfg = await readConfigJson();
  const rules = (cfg.automationRules as AutomationRule[] | undefined) || [];
  return rules.length ? rules : DEFAULT_RULES;
}

export async function saveAutomationRules(rules: AutomationRule[]) {
  await mergeConfigJson({ automationRules: rules });
  return rules;
}

export async function appendAutomationLog(entry: Omit<AutomationLogEntry, 'id' | 'createdAt'>) {
  const cfg = await readConfigJson();
  const logs = (cfg.automationLogs as AutomationLogEntry[] | undefined) || [];
  const row: AutomationLogEntry = {
    ...entry,
    id: `alog_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = [row, ...logs].slice(0, 200);
  await mergeConfigJson({ automationLogs: next });
  return row;
}

export async function listAutomationLogs(limit = 50) {
  const cfg = await readConfigJson();
  const logs = (cfg.automationLogs as AutomationLogEntry[] | undefined) || [];
  return logs.slice(0, limit);
}
