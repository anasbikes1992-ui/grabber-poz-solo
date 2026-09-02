import { createHash } from 'crypto';
import { getPayHereConfig, isPayHereConfigured } from '@/lib/payments/lkr-provider';

export type PayHereCheckoutInput = {
  orderNumber: string;
  amount: number;
  itemsDescription: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

export function buildPayHereCheckoutPayload(input: PayHereCheckoutInput) {
  if (!isPayHereConfigured()) {
    throw new Error('PayHere not configured — set PAYHERE_MERCHANT_ID and PAYHERE_SECRET');
  }

  const { merchantId, secret, mode } = getPayHereConfig();
  const amountNum = Number(input.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error('PayHere amount must be a positive number');
  }
  const amount = amountNum.toFixed(2);
  const orderId = String(input.orderNumber).trim();
  const currency = 'LKR';
  const secretHash = createHash('md5').update(secret).digest('hex').toUpperCase();
  const hash = createHash('md5')
    .update(merchantId + orderId + amount + currency + secretHash)
    .digest('hex')
    .toUpperCase();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const checkoutUrl =
    mode === 'sandbox' ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';

  return {
    checkoutUrl,
    fields: {
      merchant_id: merchantId,
      return_url: `${appUrl}/shop/checkout?paid=1`,
      cancel_url: `${appUrl}/shop/checkout?cancelled=1`,
      notify_url: `${appUrl}/api/webhooks/payhere`,
      order_id: orderId,
      items: input.itemsDescription.slice(0, 240),
      amount,
      currency,
      first_name: input.customerName || 'Customer',
      email: input.customerEmail || 'customer@example.com',
      phone: input.customerPhone || '0770000000',
      hash,
    },
  };
}
