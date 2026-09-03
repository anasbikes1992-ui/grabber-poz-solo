import { getWebXPayConfig, isWebXPayConfigured, type WebXPayConfig } from '@/lib/payments/lkr-provider';

export { getWebXPayConfig, isWebXPayConfigured, type WebXPayConfig };

export interface WebXPayPayloadInput {
  orderNumber: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export function generateWebXPayPayload(input: WebXPayPayloadInput, config?: WebXPayConfig) {
  const cfg = config || getWebXPayConfig();
  if (!cfg.publicKey || !cfg.secretKey) {
    throw new Error('WebXPay not configured — set WEBXPAY_PUBLIC_KEY and WEBXPAY_SECRET_KEY');
  }

  const amount = Number(input.amount).toFixed(2);
  const orderId = String(input.orderNumber).trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const checkoutUrl =
    cfg.env === 'live'
      ? 'https://webxpay.com/index.php'
      : 'https://staging.webxpay.com/index.php';

  return {
    checkoutUrl,
    fields: {
      order_id: orderId,
      amount,
      currency: 'LKR',
      first_name: input.customerName || 'Customer',
      email: input.customerEmail || 'customer@example.com',
      contact_number: input.customerPhone || '0770000000',
      return_url: input.returnUrl || `${appUrl}/shop/checkout?paid=1`,
      cancel_url: input.cancelUrl || `${appUrl}/shop/checkout?cancelled=1`,
      public_key: cfg.publicKey,
    },
  };
}
