import { createHash } from 'crypto';
import { getPayHereConfig, isPayHereConfigured, type PayHereConfig } from '@/lib/payments/lkr-provider';

export { getPayHereConfig, isPayHereConfigured, type PayHereConfig };

export interface PayHerePayloadInput {
  orderNumber: string;
  amount: number;
  itemsDescription: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  country?: string;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
  recurrence?: string; // e.g. "1 Month", "2 Week"
  duration?: string;   // e.g. "1 Year", "Forever"
}

export function generatePayHereCheckoutPayload(input: PayHerePayloadInput, config?: PayHereConfig) {
  const cfg = config || getPayHereConfig();
  if (!cfg.merchantId || !cfg.secret) {
    throw new Error('PayHere not configured — set PAYHERE_MERCHANT_ID and PAYHERE_SECRET');
  }

  const amountNum = Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error('PayHere amount must be a positive number');
  }
  const amount = amountNum.toFixed(2);
  const orderId = String(input.orderNumber).trim();
  const currency = 'LKR';
  const secretHash = createHash('md5').update(cfg.secret).digest('hex').toUpperCase();
  const hash = createHash('md5')
    .update(cfg.merchantId + orderId + amount + currency + secretHash)
    .digest('hex')
    .toUpperCase();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const checkoutUrl =
    cfg.mode === 'sandbox'
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

  const fields: Record<string, string> = {
    merchant_id: cfg.merchantId,
    return_url: input.returnUrl || `${appUrl}/shop/checkout?paid=1`,
    cancel_url: input.cancelUrl || `${appUrl}/shop/checkout?cancelled=1`,
    notify_url: input.notifyUrl || `${appUrl}/api/webhooks/payhere`,
    order_id: orderId,
    items: (input.itemsDescription || 'Order').slice(0, 240),
    amount,
    currency,
    first_name: input.customerName || 'Customer',
    last_name: '',
    email: input.customerEmail || 'customer@example.com',
    phone: input.customerPhone || '0770000000',
    address: input.address || 'Colombo',
    city: input.city || 'Colombo',
    country: input.country || 'Sri Lanka',
    hash,
  };

  // If recurring subscription parameters are passed (PayHere Recurring API)
  if (input.recurrence && input.duration) {
    fields.recurrence = input.recurrence;
    fields.duration = input.duration;
  }

  return {
    checkoutUrl,
    fields,
  };
}

export interface PayHereRefundParams {
  paymentId: string;
  description: string;
  appId?: string;
  appSecret?: string;
  mode?: 'sandbox' | 'live';
}

export async function executePayHereRefund(params: PayHereRefundParams): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
  data?: unknown;
}> {
  const appId = params.appId || process.env.PAYHERE_APP_ID;
  const appSecret = params.appSecret || process.env.PAYHERE_APP_SECRET;
  const mode = params.mode || (process.env.PAYHERE_MODE === 'sandbox' ? 'sandbox' : 'live');

  if (!appId || !appSecret) {
    return {
      success: false,
      error: 'PayHere Automated Refund requires PAYHERE_APP_ID and PAYHERE_APP_SECRET (from PayHere Dashboard > Settings > API Keys)',
    };
  }

  const baseUrl = mode === 'sandbox' ? 'https://sandbox.payhere.lk' : 'https://www.payhere.lk';

  try {
    // 1. Fetch OAuth Access Token
    const authCode = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/merchant/v1/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authCode}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return { success: false, error: `Failed to obtain PayHere OAuth token: ${errText}` };
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return { success: false, error: 'No access_token returned by PayHere OAuth' };
    }

    // 2. Call Refund API
    const refundRes = await fetch(`${baseUrl}/merchant/v1/payment/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_id: params.paymentId,
        description: params.description || 'Customer order refund',
      }),
    });

    const refundJson = (await refundRes.json()) as { status?: number; msg?: string; data?: { refund_id?: string } };
    if (refundJson.status === 1) {
      return {
        success: true,
        refundId: refundJson.data?.refund_id,
        data: refundJson,
      };
    } else {
      return {
        success: false,
        error: refundJson.msg || 'PayHere refund declined',
        data: refundJson,
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}
