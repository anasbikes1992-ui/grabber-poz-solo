export interface MintpayConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  env: 'sandbox' | 'live';
}

export function getMintpayConfig(): MintpayConfig {
  return {
    merchantId: process.env.MINTPAY_MERCHANT_ID?.trim() || '',
    apiKey: process.env.MINTPAY_API_KEY?.trim() || '',
    apiSecret: process.env.MINTPAY_API_SECRET?.trim() || '',
    env: (process.env.MINTPAY_ENV?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live',
  };
}

export function isMintpayConfigured(): boolean {
  const c = getMintpayConfig();
  return Boolean(c.merchantId && c.apiKey);
}
