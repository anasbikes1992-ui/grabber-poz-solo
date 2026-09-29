import { appendAutomationLog, listAutomationLogs } from '@/lib/automation/rules-store';
import { readConfigJson } from '@/lib/config/business-settings';
import { normalizeWhatsAppTo, sendWhatsAppText } from '@/lib/integrations/whatsapp';
import { appendWhatsAppMessage } from '@/lib/whatsapp/thread-store';

export type CompanyLeadAutomationStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'DEMO_SCHEDULED'
  | 'PROPOSAL_SENT'
  | 'WON'
  | 'LOST'
  | 'ARCHIVED';

export type CompanyLeadAutomationInput = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType?: string | null;
  branchCount?: string | null;
  message?: string | null;
  status?: string | null;
};

type CompanyWhatsAppAutomationConfig = {
  enabled: boolean;
  autoReplyToLead: boolean;
  salesWhatsapp: string;
  demoUrl: string;
};

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function status(value: unknown): CompanyLeadAutomationStatus {
  const normalized = trim(value).toUpperCase();
  if (
    normalized === 'CONTACTED' ||
    normalized === 'DEMO_SCHEDULED' ||
    normalized === 'PROPOSAL_SENT' ||
    normalized === 'WON' ||
    normalized === 'LOST' ||
    normalized === 'ARCHIVED'
  ) {
    return normalized;
  }
  return 'NEW';
}

export async function readCompanyWhatsAppAutomationConfig(): Promise<CompanyWhatsAppAutomationConfig> {
  const cfg = await readConfigJson().catch(() => ({} as Record<string, unknown>));
  const automation = (cfg.companyWhatsAppAutomation || {}) as Record<string, unknown>;
  return {
    enabled: automation.enabled !== false,
    autoReplyToLead: automation.autoReplyToLead !== false,
    salesWhatsapp:
      trim(automation.salesWhatsapp) ||
      trim(cfg.companySalesWhatsapp) ||
      trim(cfg.ownerWhatsapp) ||
      trim(process.env.COMPANY_SALES_WHATSAPP) ||
      trim(process.env.OWNER_WHATSAPP),
    demoUrl:
      trim(automation.demoUrl) ||
      trim(process.env.COMPANY_DEMO_URL) ||
      trim(process.env.APP_URL) ||
      trim(process.env.NEXT_PUBLIC_APP_URL) ||
      'https://demo.grabberpoz.com',
  };
}

export function buildCompanyLeadOwnerAlert(lead: CompanyLeadAutomationInput) {
  return [
    'New Grabber Business OS inquiry',
    `Business: ${lead.businessName}`,
    `Owner: ${lead.ownerName}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Industry: ${lead.businessType || 'General Retail'}`,
    `Branches: ${lead.branchCount || '1'}`,
    lead.message ? `Need: ${lead.message}` : '',
    '',
    `Open CRM: ${trim(process.env.APP_URL) || 'https://grabberpoz.com'}/company/leads`,
  ].filter(Boolean).join('\n');
}

export function buildCompanyLeadCustomerMessage(lead: CompanyLeadAutomationInput, nextStatus: CompanyLeadAutomationStatus, demoUrl: string) {
  const name = lead.ownerName || 'there';
  if (nextStatus === 'DEMO_SCHEDULED') {
    return [
      `Hi ${name}, your Grabber Business OS Pro demo is scheduled.`,
      `Demo/store preview: ${demoUrl}`,
      'We will walk through POS, stock, storefront, Polim Potha, reports, and client handover.',
    ].join('\n');
  }
  if (nextStatus === 'PROPOSAL_SENT') {
    return [
      `Hi ${name}, we prepared the Grabber Business OS Pro proposal for ${lead.businessName}.`,
      'It is one full Pro package; implementation changes by vertical, branch count, providers, data import, and handover scope.',
      'Reply here if you want us to adjust timeline, hardware, or data migration scope.',
    ].join('\n');
  }
  if (nextStatus === 'WON') {
    return [
      `Welcome ${name}. We are starting ${lead.businessName}'s Grabber Business OS Pro onboarding.`,
      'Next steps: isolated app, isolated database, business profile, vertical preset, data review, smoke test, and handover checklist.',
      'We will confirm credentials only through the agreed secure channel.',
    ].join('\n');
  }
  if (nextStatus === 'CONTACTED') {
    return [
      `Hi ${name}, thanks for speaking with Grabber POZ.`,
      'We noted your requirements and will follow up with the right demo/proposal step.',
    ].join('\n');
  }
  return [
    `Hi ${name}, thanks for your interest in Grabber Business OS Pro.`,
    `We received the inquiry for ${lead.businessName}.`,
    `Demo/store preview: ${demoUrl}`,
    'Our team will contact you shortly to confirm your business flow and onboarding scope.',
  ].join('\n');
}

async function automationAlreadyLogged(idempotencyKey: string) {
  const logs = await listAutomationLogs(200).catch(() => []);
  return logs.some((log) => log.idempotencyKey === idempotencyKey && log.status === 'SUCCESS');
}

async function logCompanyAutomation(input: {
  ruleId: string;
  event: string;
  status: 'SUCCESS' | 'FAILED';
  idempotencyKey: string;
  detail: Record<string, unknown>;
}) {
  await appendAutomationLog(input).catch(() => undefined);
}

async function sendAndRecord(input: {
  lead: CompanyLeadAutomationInput;
  kind: 'OWNER_ALERT' | 'LEAD_REPLY';
  to: string;
  text: string;
  idempotencyKey: string;
  event: string;
}) {
  if (await automationAlreadyLogged(input.idempotencyKey)) {
    return { skipped: true as const, reason: 'idempotent' };
  }

  const to = normalizeWhatsAppTo(input.to);
  if (!to) {
    await logCompanyAutomation({
      ruleId: 'company_whatsapp_sales',
      event: input.event,
      status: 'FAILED',
      idempotencyKey: input.idempotencyKey,
      detail: { kind: input.kind, leadId: input.lead.id, reason: 'missing_phone' },
    });
    return { skipped: true as const, reason: 'missing_phone' };
  }

  const result = await sendWhatsAppText({ to, text: input.text });
  await appendWhatsAppMessage({
    phone: to,
    direction: 'OUT',
    body: input.text,
    providerMessageId: result.success && 'messageId' in result ? result.messageId || null : null,
    status: result.success ? 'SENT' : 'FAILED',
  }).catch(() => undefined);

  await logCompanyAutomation({
    ruleId: 'company_whatsapp_sales',
    event: input.event,
    status: result.success ? 'SUCCESS' : 'FAILED',
    idempotencyKey: input.idempotencyKey,
    detail: {
      kind: input.kind,
      leadId: input.lead.id,
      to,
      stub: result.success && 'stub' in result ? Boolean(result.stub) : false,
      error: result.success ? undefined : result.error,
    },
  });

  return result;
}

export async function runCompanyLeadSubmittedAutomation(lead: CompanyLeadAutomationInput) {
  const config = await readCompanyWhatsAppAutomationConfig();
  if (!config.enabled) {
    await logCompanyAutomation({
      ruleId: 'company_whatsapp_sales',
      event: 'COMPANY_LEAD_SUBMITTED',
      status: 'SUCCESS',
      idempotencyKey: `company_lead:${lead.id}:automation_disabled`,
      detail: { leadId: lead.id, skipped: true, reason: 'disabled' },
    });
    return { enabled: false };
  }

  const sends = [];
  if (config.salesWhatsapp) {
    sends.push(sendAndRecord({
      lead,
      kind: 'OWNER_ALERT',
      to: config.salesWhatsapp,
      text: buildCompanyLeadOwnerAlert(lead),
      idempotencyKey: `company_lead:${lead.id}:owner_alert`,
      event: 'COMPANY_LEAD_SUBMITTED',
    }));
  }
  if (config.autoReplyToLead) {
    sends.push(sendAndRecord({
      lead,
      kind: 'LEAD_REPLY',
      to: lead.phone,
      text: buildCompanyLeadCustomerMessage(lead, 'NEW', config.demoUrl),
      idempotencyKey: `company_lead:${lead.id}:lead_reply:new`,
      event: 'COMPANY_LEAD_REPLY',
    }));
  }

  const results = await Promise.allSettled(sends);
  return { enabled: true, results };
}

export async function runCompanyLeadStatusAutomation(
  lead: CompanyLeadAutomationInput,
  previousStatus?: string | null,
) {
  const next = status(lead.status);
  if (status(previousStatus) === next) return { skipped: true, reason: 'status_unchanged' };
  if (!['CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON'].includes(next)) {
    return { skipped: true, reason: 'status_not_automated' };
  }

  const config = await readCompanyWhatsAppAutomationConfig();
  if (!config.enabled || !config.autoReplyToLead) return { skipped: true, reason: 'disabled' };

  return sendAndRecord({
    lead,
    kind: 'LEAD_REPLY',
    to: lead.phone,
    text: buildCompanyLeadCustomerMessage(lead, next, config.demoUrl),
    idempotencyKey: `company_lead:${lead.id}:lead_reply:${next.toLowerCase()}`,
    event: `COMPANY_LEAD_${next}`,
  });
}
