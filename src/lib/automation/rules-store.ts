import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type AutomationRule = {
  id: string;
  name: string;
  event:
    | 'ORDER_CREATED'
    | 'ORDER_PAID'
    | 'STOCK_LOW'
    | 'CUSTOMER_CREATED'
    | 'REPAIR_CREATED'
    | 'REPAIR_STATUS_CHANGED'
    | 'REPAIR_READY';
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
  {
    id: 'auto_repair_created_whatsapp',
    name: 'Repair request confirmation WhatsApp',
    event: 'REPAIR_CREATED',
    active: true,
    action: {
      type: 'WHATSAPP_TEXT',
      to: '{{customerPhone}}',
      text: 'Hi {{customerName}}, we received repair ticket {{ticketCode}} for {{deviceModel}}. Issue: {{issue}}. We will contact you with an estimate soon.',
    },
  },
  {
    id: 'auto_repair_ready_whatsapp',
    name: 'Repair ready for collection WhatsApp',
    event: 'REPAIR_READY',
    active: true,
    action: {
      type: 'WHATSAPP_TEXT',
      to: '{{customerPhone}}',
      text: 'Good news {{customerName}}! Repair {{ticketCode}} for {{deviceModel}} is ready for collection. Reply or visit us to arrange pickup.',
    },
  },
  {
    id: 'auto_repair_created_log',
    name: 'Repair intake audit log',
    event: 'REPAIR_CREATED',
    active: true,
    action: {
      type: 'LOG',
      message: 'Repair {{ticketCode}} created — {{serviceName}} ({{mode}})',
    },
  },
  {
    id: 'auto_stock_low_whatsapp',
    name: 'Low stock owner alert',
    event: 'STOCK_LOW',
    active: true,
    action: {
      type: 'WHATSAPP_TEXT',
      to: '{{ownerPhone}}',
      text: 'Low stock: {{productName}} ({{sku}}) — {{onHand}} on hand, reorder at {{reorderLevel}}.',
    },
  },
  {
    id: 'auto_stock_low_log',
    name: 'Low stock audit log',
    event: 'STOCK_LOW',
    active: true,
    action: {
      type: 'LOG',
      message: 'STOCK_LOW {{sku}} {{productName}} — {{onHand}}/{{reorderLevel}}',
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
