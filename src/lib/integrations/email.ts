/**
 * Outbound email — Resend HTTP API or console skip when unconfigured.
 * Never throws into commerce paths; logs to email_logs.
 */
import { eq } from 'drizzle-orm';
import { db, emailLogs, emailTemplates } from '@/db';

export type SendEmailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateKey?: string;
  relatedType?: string;
  relatedId?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.RESEND_FROM));
}

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export async function resolveEmailTemplate(templateKey: string, vars: Record<string, string> = {}) {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.templateKey, templateKey))
    .limit(1);
  if (!row || !row.active) return null;
  return {
    subject: applyVars(row.subject, vars),
    html: applyVars(row.bodyHtml, vars),
    text: applyVars(row.bodyText || row.bodyHtml.replace(/<[^>]+>/g, ' '), vars),
  };
}

export async function sendTemplatedEmail(input: {
  to: string;
  templateKey: string;
  vars?: Record<string, string>;
  fallbackSubject: string;
  fallbackText?: string;
  fallbackHtml?: string;
  relatedType?: string;
  relatedId?: string;
}) {
  const resolved = await resolveEmailTemplate(input.templateKey, input.vars || {}).catch(() => null);
  return sendEmail({
    to: input.to,
    subject: resolved?.subject || input.fallbackSubject,
    html: resolved?.html || input.fallbackHtml,
    text: resolved?.text || input.fallbackText,
    templateKey: input.templateKey,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<{
  success: boolean;
  status: string;
  id?: string;
  error?: string;
}> {
  const to = String(input.to || '').trim();
  const subject = String(input.subject || '').trim();
  if (!to || !subject) {
    return { success: false, status: 'FAILED', error: 'to and subject required' };
  }

  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'noreply@grabberpoz.com';
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const [log] = await db
      .insert(emailLogs)
      .values({
        toAddress: to,
        subject,
        templateKey: input.templateKey || null,
        status: 'SKIPPED',
        provider: 'none',
        errorMessage: 'RESEND_API_KEY not set',
        relatedType: input.relatedType || null,
        relatedId: input.relatedId || null,
      })
      .returning();
    return { success: true, status: 'SKIPPED', id: log.id };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: input.html || `<p>${input.text || subject}</p>`,
        text: input.text || subject,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      const [log] = await db
        .insert(emailLogs)
        .values({
          toAddress: to,
          subject,
          templateKey: input.templateKey || null,
          status: 'FAILED',
          provider: 'resend',
          errorMessage: data.message || `HTTP ${res.status}`,
          relatedType: input.relatedType || null,
          relatedId: input.relatedId || null,
        })
        .returning();
      return { success: false, status: 'FAILED', id: log.id, error: data.message || `HTTP ${res.status}` };
    }

    const [log] = await db
      .insert(emailLogs)
      .values({
        toAddress: to,
        subject,
        templateKey: input.templateKey || null,
        status: 'SENT',
        provider: 'resend',
        providerMessageId: data.id || null,
        relatedType: input.relatedType || null,
        relatedId: input.relatedId || null,
      })
      .returning();
    return { success: true, status: 'SENT', id: log.id };
  } catch (err) {
    const msg = (err as Error).message;
    const [log] = await db
      .insert(emailLogs)
      .values({
        toAddress: to,
        subject,
        templateKey: input.templateKey || null,
        status: 'FAILED',
        provider: 'resend',
        errorMessage: msg,
        relatedType: input.relatedType || null,
        relatedId: input.relatedId || null,
      })
      .returning();
    return { success: false, status: 'FAILED', id: log.id, error: msg };
  }
}
