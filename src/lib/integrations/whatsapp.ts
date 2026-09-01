import { createHmac, timingSafeEqual } from 'crypto';

function trimEnv(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function resolveWhatsAppConfig() {
  const token = trimEnv(process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneId = trimEnv(process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID);
  const verifyToken = trimEnv(process.env.WHATSAPP_VERIFY_TOKEN) || 'grabber_dev_verify';
  const appSecret = trimEnv(process.env.WHATSAPP_APP_SECRET);
  const apiVersion = trimEnv(process.env.WHATSAPP_API_VERSION) || 'v21.0';
  return { token, phoneId, verifyToken, appSecret, apiVersion };
}

export function isWhatsAppConfigured(): boolean {
  const { token, phoneId } = resolveWhatsAppConfig();
  return Boolean(token && phoneId);
}

/** Normalize to digits-only international format (Meta expects country code, no +). */
export function normalizeWhatsAppTo(raw: string): string {
  return raw.replace(/\D/g, '');
}

export type WhatsAppSendResult =
  | { success: true; stub: true; preview: { to: string; text: string } }
  | { success: true; stub?: false; provider: unknown; messageId?: string }
  | { success: false; error: string; status?: number; data?: unknown };

export async function sendWhatsAppText(params: {
  to: string;
  text: string;
}): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppTo(params.to);
  const text = String(params.text || '').trim();
  if (!to || !text) {
    return { success: false, error: 'to and text required' };
  }

  const { token, phoneId, apiVersion } = resolveWhatsAppConfig();
  if (!token || !phoneId) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'WHATSAPP_TOKEN and WHATSAPP_PHONE_ID (or WHATSAPP_PHONE_NUMBER_ID) required in production',
        status: 503,
      };
    }
    return {
      success: true,
      stub: true,
      preview: { to, text: text.slice(0, 200) },
    };
  }

  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    return {
      success: false,
      error: data.error?.message || 'WhatsApp API error',
      status: res.status,
      data,
    };
  }

  return {
    success: true,
    provider: data,
    messageId: data.messages?.[0]?.id,
  };
}

/** Verify Meta webhook X-Hub-Signature-256 when WHATSAPP_APP_SECRET is set. */
export function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { appSecret } = resolveWhatsAppConfig();
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}
