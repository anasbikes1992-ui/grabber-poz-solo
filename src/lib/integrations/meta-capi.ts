import { createHash } from 'crypto';
import { resolveMarketingPixels, hasMetaConversionsApiToken } from '@/lib/config/resolve-marketing';
import { fetchWithRetry } from '@/lib/http/retry-fetch';

function sha256(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function sendMetaPurchaseEvent(input: {
  orderNumber: string;
  value: number;
  currency?: string;
  email?: string | null;
  phone?: string | null;
}) {
  if (!hasMetaConversionsApiToken()) {
    return { sent: false as const, reason: 'META_CONVERSIONS_API_TOKEN not set' };
  }

  const token = process.env.META_CONVERSIONS_API_TOKEN!.trim();
  const pixels = await resolveMarketingPixels();
  const pixelId = pixels.metaPixelId;
  if (!pixelId) {
    return { sent: false as const, reason: 'Meta Pixel ID not configured' };
  }

  const userData: Record<string, string[]> = {};
  if (input.email) userData.em = [sha256(input.email)];
  if (input.phone) userData.ph = [sha256(normalizePhone(input.phone))];

  const res = await fetchWithRetry(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: input.currency || 'LKR',
            value: input.value,
            order_id: input.orderNumber,
          },
        },
      ],
      access_token: token,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiError =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: { message?: string } }).error?.message || '')
        : '';
    return {
      sent: false as const,
      reason: `Meta API error (${res.status})${apiError ? `: ${apiError}` : ''}`,
      status: res.status,
      data,
    };
  }

  return { sent: true as const, status: res.status, data };
}
