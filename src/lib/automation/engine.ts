import { listAutomationRules, appendAutomationLog, type AutomationRule } from '@/lib/automation/rules-store';
import { sendWhatsAppText } from '@/lib/integrations/whatsapp';

export type AutomationEvent =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'STOCK_LOW'
  | 'CUSTOMER_CREATED'
  | 'REPAIR_CREATED'
  | 'REPAIR_STATUS_CHANGED'
  | 'REPAIR_READY';

export type AutomationContext = Record<string, unknown>;

export function interpolateTemplate(template: string, ctx: AutomationContext) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? ''));
}

function interpolate(template: string, ctx: AutomationContext) {
  return interpolateTemplate(template, ctx);
}

function ruleMatches(rule: AutomationRule, event: AutomationEvent, ctx: AutomationContext) {
  if (!rule.active || rule.event !== event) return false;
  if (rule.condition?.channel && ctx.channel !== rule.condition.channel) return false;
  if (rule.condition?.minTotal != null && Number(ctx.grandTotal || 0) < rule.condition.minTotal) return false;
  return true;
}

async function runAction(rule: AutomationRule, ctx: AutomationContext) {
  const action = rule.action;
  if (action.type === 'WHATSAPP_TEXT') {
    const to = interpolate(action.to, ctx);
    const text = interpolate(action.text, ctx);
    if (!to || to.replace(/\D/g, '').length < 9) {
      throw new Error('WhatsApp recipient phone missing — ensure customer has phone on file');
    }
    const result = await sendWhatsAppText({ to, text });
    if (!result.success) throw new Error(result.error || 'WhatsApp send failed');
    return {
      channel: 'WHATSAPP',
      to,
      stub: result.stub === true,
      messageId: 'messageId' in result ? result.messageId : undefined,
    };
  }
  if (action.type === 'LOG') {
    return { channel: 'LOG', message: interpolate(action.message, ctx) };
  }
  throw new Error('Unknown automation action type');
}

export async function dispatchAutomationEvent(event: AutomationEvent, ctx: AutomationContext) {
  const rules = await listAutomationRules();
  const results = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, event, ctx)) continue;
    const idempotencyKey = `${rule.id}:${event}:${ctx.orderId || ctx.repairId || ctx.productId || Date.now()}`;
    try {
      const outcome = await runAction(rule, ctx);
      await appendAutomationLog({
        ruleId: rule.id,
        event,
        status: 'SUCCESS',
        idempotencyKey,
        detail: outcome,
      });
      results.push({ ruleId: rule.id, status: 'SUCCESS' as const });
    } catch (err) {
      await appendAutomationLog({
        ruleId: rule.id,
        event,
        status: 'FAILED',
        idempotencyKey,
        detail: { error: (err as Error).message },
      });
      results.push({ ruleId: rule.id, status: 'FAILED' as const, error: (err as Error).message });
    }
  }

  return results;
}
