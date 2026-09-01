import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type BrandBrain = {
  voice: string;
  tagline: string;
  primaryColor: string;
  whatsappCta: string;
};

export const DEFAULT_BRAND_BRAIN: BrandBrain = {
  voice: 'Friendly, premium, islandwide retail',
  tagline: 'Quality you can trust — delivered islandwide',
  primaryColor: '#047857',
  whatsappCta: 'Order on WhatsApp',
};

export async function readBrandBrain(): Promise<BrandBrain> {
  const cfg = await readConfigJson();
  const raw = (cfg.brandBrain || {}) as Partial<BrandBrain>;
  return { ...DEFAULT_BRAND_BRAIN, ...raw };
}

export async function writeBrandBrain(input: Partial<BrandBrain>) {
  const current = await readBrandBrain();
  const next = { ...current, ...input };
  await mergeConfigJson({ brandBrain: next });
  return next;
}
