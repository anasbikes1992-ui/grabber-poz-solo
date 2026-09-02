import {
  listAutomationRules,
  appendAutomationLog,
  listAutomationLogs,
  type AutomationRule,
} from '@/lib/automation/rules-store';
import { enqueueJob } from '@/lib/jobs/outbox';
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

export function buildAutomationIdempotencyKey(
  ruleId: string,
  event: AutomationEvent,
  ctx: AutomationContext,
) {
  const entity = ctx.orderId || ctx.repairId || ctx.productId || ctx.customerId;
  return `${ruleId}:${event}:${entity || 'global'}`;
}

async function wasAlreadySuccessful(idempotencyKey: string): Promise<boolean> {
  const logs = await listAutomationLogs(200);
  return logs.some((l) => l.idempotencyKey === idempotencyKey && l.status === 'SUCCESS');
}

async function runAction(rule: AutomationRule, ctx: AutomationContext) {
  const action = rule.action;
  if (action.type === 'WHATSAPP_TEXT') {
    const to = interpolate(action.to, ctx);
    const text = interpolate(action.text, ctx);
    if (!to || to.replace(/\D/g, '').length < 9) {
      throw new Error('WhatsApp recipient phone missing — ensure customer has phone on file');
    }
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await sendWhatsAppText({ to, text });
      if (result.success) {
        return {
          channel: 'WHATSAPP',
          to,
          stub: result.stub === true,
          messageId: 'messageId' in result ? result.messageId : undefined,
          attempt,
        };
      }
      lastError = new Error(result.error || 'WhatsApp send failed');
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
    }
    throw lastError ?? new Error('WhatsApp send failed');
  }
  if (action.type === 'LOG') {
    return { channel: 'LOG', message: interpolate(action.message, ctx) };
  }
  throw new Error('Unknown automation action type');
}

export async function retryFailedAutomationLog(logId: string) {
  const logs = await listAutomationLogs(200);
  const entry = logs.find((l) => l.id === logId);
  if (!entry) throw new Error('Log entry not found');
  if (entry.status !== 'FAILED') throw new Error('Only failed logs can be retried');

  const rules = await listAutomationRules();
  const rule = rules.find((r) => r.id === entry.ruleId);
  if (!rule) throw new Error('Automation rule not found');

  const ctx = (entry.detail?.context as AutomationContext) || {};
  const retryKey = `${entry.idempotencyKey}:retry:${logId}`;

  if (await wasAlreadySuccessful(retryKey)) {
    return { ruleId: rule.id, status: 'SKIPPED' as const, reason: 'Already retried successfully' };
  }

  try {
    const outcome = await runAction(rule, ctx);
    await appendAutomationLog({
      ruleId: rule.id,
      event: entry.event as AutomationEvent,
      status: 'SUCCESS',
      idempotencyKey: retryKey,
      detail: { ...outcome, context: ctx, retriedFrom: logId },
    });
    return { ruleId: rule.id, status: 'SUCCESS' as const, outcome };
  } catch (err) {
    await appendAutomationLog({
      ruleId: rule.id,
      event: entry.event as AutomationEvent,
      status: 'FAILED',
      idempotencyKey: retryKey,
      detail: { error: (err as Error).message, context: ctx, retriedFrom: logId },
    });
    throw err;
  }
}

export async function dispatchAutomationEvent(event: AutomationEvent, ctx: AutomationContext) {
  const rules = await listAutomationRules();
  const results = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, event, ctx)) continue;
    const idempotencyKey = buildAutomationIdempotencyKey(rule.id, event, ctx);

    if (await wasAlreadySuccessful(idempotencyKey)) {
      results.push({ ruleId: rule.id, status: 'SKIPPED' as const, reason: 'idempotent' });
      continue;
    }

    try {
      const outcome = await runAction(rule, ctx);
      await appendAutomationLog({
        ruleId: rule.id,
        event,
        status: 'SUCCESS',
        idempotencyKey,
        detail: { ...outcome, context: ctx },
      });
      results.push({ ruleId: rule.id, status: 'SUCCESS' as const });
    } catch (err) {
      await appendAutomationLog({
        ruleId: rule.id,
        event,
        status: 'FAILED',
        idempotencyKey,
        detail: { error: (err as Error).message, context: ctx },
      });
      await enqueueJob({
        type: 'AUTOMATION_RETRY',
        idempotencyKey: `auto_retry_${idempotencyKey}`,
        payload: { logId: idempotencyKey },
        scheduledAt: new Date(Date.now() + 60_000),
      }).catch(() => undefined);
      results.push({ ruleId: rule.id, status: 'FAILED' as const, error: (err as Error).message });
    }
  }

  return results;
}
