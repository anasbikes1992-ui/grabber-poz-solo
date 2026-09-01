import { readMarketingConfig, type MarketingConfig } from '@/lib/config/business-settings';

export type ResolvedMarketingPixels = MarketingConfig;

/** Env fallbacks for Vercel bootstrap before staff saves /marketing settings. */
export function marketingPixelsFromEnv(): MarketingConfig {
  const pick = (key: string) => process.env[key]?.trim() || undefined;
  return {
    metaPixelId: pick('NEXT_PUBLIC_META_PIXEL_ID'),
    ga4Id: pick('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'),
    gtmId: pick('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID'),
    tiktokPixelId: pick('NEXT_PUBLIC_TIKTOK_PIXEL_ID'),
  };
}

/** DB settings override env when present (staff UI at /marketing). */
export async function resolveMarketingPixels(): Promise<ResolvedMarketingPixels> {
  const env = marketingPixelsFromEnv();
  try {
    const db = await readMarketingConfig();
    return {
      metaPixelId: db.metaPixelId || env.metaPixelId,
      ga4Id: db.ga4Id || env.ga4Id,
      gtmId: db.gtmId || env.gtmId,
      tiktokPixelId: db.tiktokPixelId || env.tiktokPixelId,
    };
  } catch {
    return env;
  }
}

export function hasMetaConversionsApiToken(): boolean {
  return Boolean(process.env.META_CONVERSIONS_API_TOKEN?.trim());
}
