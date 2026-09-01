export type LkrPaymentProvider = 'WEBXPAY' | 'PAYHERE' | 'NONE';

export type WebXPayConfig = {
  env: 'staging' | 'live';
  publicKey: string;
  secretKey: string;
};

export type PayHereConfig = {
  merchantId: string;
  secret: string;
  mode: string;
};

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
};

export function getLkrPaymentProvider(): LkrPaymentProvider {
  const raw = (process.env.PAYMENTS_LKR_PROVIDER || '').trim().toUpperCase();
  if (raw === 'WEBXPAY' || raw === 'PAYHERE') return raw;
  return 'NONE';
}

export function getWebXPayConfig(): WebXPayConfig {
  const envRaw = (process.env.WEBXPAY_ENV || 'staging').trim().toLowerCase();
  return {
    env: envRaw === 'live' ? 'live' : 'staging',
    publicKey: process.env.WEBXPAY_PUBLIC_KEY?.trim() || '',
    secretKey: process.env.WEBXPAY_SECRET_KEY?.trim() || '',
  };
}

export function getPayHereConfig(): PayHereConfig {
  return {
    merchantId: process.env.PAYHERE_MERCHANT_ID?.trim() || '',
    secret: process.env.PAYHERE_SECRET?.trim() || '',
    mode: process.env.PAYHERE_MODE?.trim() || 'live',
  };
}

export function getStripeConfig(): StripeConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim() || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
  };
}

export function isWebXPayConfigured(): boolean {
  const c = getWebXPayConfig();
  return Boolean(c.publicKey && c.secretKey);
}

export function isPayHereConfigured(): boolean {
  const c = getPayHereConfig();
  return Boolean(c.merchantId && c.secret);
}

export function isStripeConfigured(): boolean {
  const c = getStripeConfig();
  return Boolean(c.secretKey);
}

/** True when LKR online gateway env matches selected provider (checkout redirect not wired yet). */
export function isLkrOnlinePaymentsConfigured(): boolean {
  const provider = getLkrPaymentProvider();
  if (provider === 'WEBXPAY') return isWebXPayConfigured();
  if (provider === 'PAYHERE') return isPayHereConfigured();
  return false;
}
