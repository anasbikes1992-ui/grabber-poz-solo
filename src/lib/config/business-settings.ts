/**
 * Read/write business_config.config_json sections without duplicating merge logic.
 */
import { eq } from 'drizzle-orm';
import { db, businessConfig, businessProfile, hasDatabaseUrl } from '@/db';

export type MarketingConfig = {
  metaPixelId?: string;
  ga4Id?: string;
  gtmId?: string;
  tiktokPixelId?: string;
};

export type IntegrationsPublicConfig = {
  payhereMerchantId?: string;
  whatsappPhoneId?: string;
  promptExpressClientCode?: string;
};

export type BrandConfig = {
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
};

/** In-memory fallback when DATABASE_URL is unset (tests / local stubs). */
let memoryConfigJson: Record<string, unknown> = {};

async function ensureConfigRow() {
  const [row] = await db.select().from(businessConfig).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(businessConfig)
    .values({ configJson: {}, vertical: 'fashion' })
    .returning();
  return created;
}

export async function readConfigJson(): Promise<Record<string, unknown>> {
  if (!hasDatabaseUrl()) return { ...memoryConfigJson };
  try {
    const row = await ensureConfigRow();
    return (row.configJson || {}) as Record<string, unknown>;
  } catch {
    return { ...memoryConfigJson };
  }
}

export async function mergeConfigJson(patch: Record<string, unknown>) {
  const prev = await readConfigJson();
  const next = { ...prev, ...patch };

  if (!hasDatabaseUrl()) {
    memoryConfigJson = next;
    return { ...memoryConfigJson };
  }

  try {
    const row = await ensureConfigRow();
    await db
      .update(businessConfig)
      .set({ configJson: next, updatedAt: new Date() })
      .where(eq(businessConfig.id, row.id));
    memoryConfigJson = next;
    return next;
  } catch {
    memoryConfigJson = next;
    return { ...memoryConfigJson };
  }
}

export async function readMarketingConfig(): Promise<MarketingConfig> {
  const cfg = await readConfigJson();
  return (cfg.marketing || {}) as MarketingConfig;
}

export async function writeMarketingConfig(marketing: MarketingConfig) {
  const cfg = await readConfigJson();
  const prev = (cfg.marketing || {}) as MarketingConfig;
  return mergeConfigJson({ marketing: { ...prev, ...marketing } });
}

export async function readIntegrationsPublic(): Promise<IntegrationsPublicConfig> {
  const cfg = await readConfigJson();
  return {
    payhereMerchantId: cfg.payhereMerchantId as string | undefined,
    whatsappPhoneId: cfg.whatsappPhoneId as string | undefined,
    promptExpressClientCode: cfg.promptExpressClientCode as string | undefined,
  };
}

export async function readBusinessProfile() {
  const [profile] = await db.select().from(businessProfile).limit(1);
  return profile ?? null;
}

export async function upsertBusinessProfile(input: {
  name?: string;
  legalName?: string;
  taxNumber?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  currency?: string;
  timezone?: string;
}) {
  const [existing] = await db.select().from(businessProfile).limit(1);
  if (existing) {
    const [updated] = await db
      .update(businessProfile)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(businessProfile.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(businessProfile)
    .values({
      name: input.name || process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Business OS',
      currency: input.currency || 'LKR',
      timezone: input.timezone || 'Asia/Colombo',
      ...input,
    })
    .returning();
  return created;
}
