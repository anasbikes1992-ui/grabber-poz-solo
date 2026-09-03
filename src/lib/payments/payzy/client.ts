export interface PayzyConfig {
  merchantId: string;
  appId: string;
  appSecret: string;
  env: 'sandbox' | 'live';
}

export function getPayzyConfig(): PayzyConfig {
  return {
    merchantId: process.env.PAYZY_MERCHANT_ID?.trim() || '',
    appId: process.env.PAYZY_APP_ID?.trim() || '',
    appSecret: process.env.PAYZY_APP_SECRET?.trim() || '',
    env: (process.env.PAYZY_ENV?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live',
  };
}

export function isPayzyConfigured(): boolean {
  const c = getPayzyConfig();
  return Boolean(c.merchantId && c.appId);
}
