export interface KokoConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  env: 'sandbox' | 'live';
}

export function getKokoConfig(): KokoConfig {
  return {
    merchantId: process.env.KOKO_MERCHANT_ID?.trim() || '',
    apiKey: process.env.KOKO_API_KEY?.trim() || '',
    apiSecret: process.env.KOKO_API_SECRET?.trim() || '',
    env: (process.env.KOKO_ENV?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live',
  };
}

export function isKokoConfigured(): boolean {
  const c = getKokoConfig();
  return Boolean(c.merchantId && c.apiKey);
}
