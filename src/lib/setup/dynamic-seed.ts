/**
 * Preset-aware dynamic seed — base COA/branches + vertical catalog + module bootstrap.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  businessConfig,
  categories,
  diningTables,
  productVariants,
  products,
  stockBalances,
  taxProfiles,
} from '@/db/schema';
import { VERTICAL_PRESETS, type VerticalPresetId } from '@/lib/config/vertical-presets';
import { runMobileRepairSetup } from '@/lib/repairs/mobilerepair-setup';
import { runDatabaseSeed, type SeedInput, type SeedResult } from '@/lib/setup/seed-service';
import { markPresetApplied, markSeedComplete } from '@/lib/setup/onboarding-milestones';
import { mergeConfigJson } from '@/lib/config/business-settings';
import { DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import { writeStorefrontConfig } from '@/lib/config/storefront-config';

type CatalogItem = {
  sku: string;
  slug: string;
  name: string;
  sale: string;
  cost: string;
  category?: string;
  variants?: Array<{ name: string; sku: string; sale?: string }>;
};

const PRESET_CATALOGS: Partial<Record<VerticalPresetId, CatalogItem[]>> = {
  fashion: [
    { sku: 'DEMO-SHIRT-L', slug: 'demo-linen-shirt', name: 'Linen Casual Shirt', sale: '4500.00', cost: '2500.00', category: 'Apparel' },
    { sku: 'DEMO-OXFORD-M', slug: 'demo-oxford-shirt', name: 'Oxford Button-Down', sale: '5200.00', cost: '2800.00', category: 'Apparel' },
    { sku: 'DEMO-CHINO-32', slug: 'demo-chino', name: 'Stretch Chino Trousers', sale: '6500.00', cost: '3400.00', category: 'Apparel' },
    { sku: 'DEMO-POLO-XL', slug: 'demo-polo', name: 'Pique Cotton Polo', sale: '3800.00', cost: '1900.00', category: 'Apparel' },
  ],
  grocery: [
    { sku: 'GROC-MILK-1L', slug: 'fresh-milk-1l', name: 'Fresh Milk 1L', sale: '420.00', cost: '280.00', category: 'Dairy' },
    { sku: 'GROC-RICE-5KG', slug: 'basmati-rice-5kg', name: 'Basmati Rice 5kg', sale: '1850.00', cost: '1400.00', category: 'Pantry' },
    { sku: 'GROC-SOAP-200', slug: 'herbal-soap', name: 'Herbal Soap 200g', sale: '180.00', cost: '95.00', category: 'Personal Care' },
    { sku: 'GROC-JUICE-1L', slug: 'orange-juice', name: 'Orange Juice 1L', sale: '650.00', cost: '420.00', category: 'Beverages' },
  ],
  restaurant: [
    { sku: 'MENU-KOTTHU', slug: 'chicken-kottu', name: 'Chicken Kottu', sale: '1200.00', cost: '450.00', category: 'Mains' },
    { sku: 'MENU-RICE-CURRY', slug: 'rice-curry', name: 'Rice & Curry', sale: '850.00', cost: '320.00', category: 'Mains' },
    { sku: 'MENU-LATTE', slug: 'cafe-latte', name: 'Café Latte', sale: '650.00', cost: '180.00', category: 'Beverages' },
    { sku: 'MENU-WAFFLE', slug: 'belgian-waffle', name: 'Belgian Waffle', sale: '950.00', cost: '280.00', category: 'Desserts' },
  ],
  wholesale: [
    { sku: 'WH-BOLT-M8', slug: 'bolt-m8-box', name: 'M8 Bolt Box (100pc)', sale: '2800.00', cost: '1900.00', category: 'Hardware' },
    { sku: 'WH-CEMENT-50', slug: 'cement-50kg', name: 'Portland Cement 50kg', sale: '3200.00', cost: '2650.00', category: 'Building' },
    { sku: 'WH-PAINT-5L', slug: 'emulsion-5l', name: 'Emulsion Paint 5L', sale: '8500.00', cost: '6200.00', category: 'Paints' },
  ],
  electronics: [
    { sku: 'EL-IPH15-128', slug: 'iphone-15-128', name: 'iPhone 15 128GB', sale: '385000.00', cost: '340000.00', category: 'Phones' },
    { sku: 'EL-SAMS-A54', slug: 'galaxy-a54', name: 'Samsung Galaxy A54', sale: '125000.00', cost: '108000.00', category: 'Phones' },
    { sku: 'EL-AIRPODS', slug: 'airpods-pro', name: 'AirPods Pro', sale: '85000.00', cost: '72000.00', category: 'Accessories' },
  ],
  hybrid: [
    { sku: 'HYB-SHIRT-M', slug: 'hybrid-shirt', name: 'Retail Shirt M', sale: '3500.00', cost: '1800.00', category: 'Apparel' },
    { sku: 'HYB-SCREEN', slug: 'screen-repair', name: 'Screen Repair Service', sale: '15000.00', cost: '8000.00', category: 'Services' },
    { sku: 'HYB-BULK-RICE', slug: 'bulk-rice-25kg', name: 'Bulk Rice 25kg', sale: '8500.00', cost: '7200.00', category: 'Wholesale' },
  ],
  full: [
    { sku: 'FULL-DEMO-1', slug: 'full-demo-retail', name: 'Demo Retail SKU', sale: '2500.00', cost: '1200.00', category: 'General' },
    { sku: 'FULL-DEMO-2', slug: 'full-demo-service', name: 'Demo Service SKU', sale: '5000.00', cost: '2000.00', category: 'Services' },
  ],
};

async function applyVerticalFlags(presetId: VerticalPresetId) {
  const preset = VERTICAL_PRESETS[presetId];
  const [cfg] = await db.select().from(businessConfig).limit(1);
  const flags = preset.flags;
  if (cfg) {
    const prev = (cfg.configJson || {}) as Record<string, unknown>;
    await db
      .update(businessConfig)
      .set({
        vertical: preset.vertical,
        configJson: { ...prev, verticalFlags: flags, verticalPreset: presetId },
        enableTableService: Boolean(flags.restaurant),
        enableKitchenOrders: Boolean(flags.restaurant),
        updatedAt: new Date(),
      })
      .where(eq(businessConfig.id, cfg.id));
  } else {
    await db.insert(businessConfig).values({
      vertical: preset.vertical,
      configJson: { verticalFlags: flags, verticalPreset: presetId },
      enableTableService: Boolean(flags.restaurant),
      enableKitchenOrders: Boolean(flags.restaurant),
    });
  }
}

async function seedPresetCatalog(presetId: VerticalPresetId, branchId: string, taxProfileId?: string) {
  const catalog = PRESET_CATALOGS[presetId] || PRESET_CATALOGS.fashion!;
  const seeded: Array<{ id: string; sku: string; name: string }> = [];

  for (const item of catalog) {
    let categoryId: string | null = null;
    if (item.category) {
      const slug = item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
      if (existing) categoryId = existing.id;
      else {
        const [created] = await db.insert(categories).values({ name: item.category, slug }).returning();
        categoryId = created.id;
      }
    }

    const [prod] = await db
      .insert(products)
      .values({
        name: item.name,
        sku: item.sku,
        slug: item.slug,
        salePrice: item.sale,
        costPrice: item.cost,
        isActive: true,
        taxProfileId: taxProfileId || null,
        categoryId,
      })
      .onConflictDoNothing()
      .returning()
      .catch(async () => {
        const rows = await db.select().from(products).where(eq(products.sku, item.sku)).limit(1);
        return rows;
      });

    if (!prod) continue;

    if (item.variants?.length) {
      for (const v of item.variants) {
        await db
          .insert(productVariants)
          .values({
            productId: prod.id,
            name: v.name,
            sku: v.sku,
            salePrice: v.sale || item.sale,
            costPrice: item.cost,
            active: true,
          })
          .onConflictDoNothing();
      }
    }

    await db
      .insert(stockBalances)
      .values({
        locationType: 'BRANCH',
        locationId: branchId,
        productId: prod.id,
        onHand: 40,
        reserved: 0,
        damaged: 0,
      })
      .onConflictDoNothing();

    seeded.push({ id: prod.id, sku: prod.sku, name: prod.name });
  }
  return seeded;
}

async function seedRestaurantFloor(branchId: string | null) {
  const existing = await db.select().from(diningTables).limit(1);
  if (existing.length) return { reused: true, count: existing.length };
  const seed = [
    { name: 'Table 01 (Window)', capacity: 4, sortOrder: 1 },
    { name: 'Table 02 (Center)', capacity: 2, sortOrder: 2 },
    { name: 'Table 03 (Booth)', capacity: 6, sortOrder: 3 },
    { name: 'Takeaway Counter', capacity: 1, sortOrder: 4 },
  ];
  const rows = await db
    .insert(diningTables)
    .values(seed.map((s) => ({ ...s, branchId, status: 'VACANT' })))
    .returning();
  return { reused: false, count: rows.length };
}

async function seedStorefrontForPreset(presetId: VerticalPresetId, storeName: string) {
  const preset = VERTICAL_PRESETS[presetId];
  const heroTitle =
    presetId === 'mobilerepair' || presetId === 'electronics'
      ? `${storeName} — Devices & Repairs`
      : presetId === 'restaurant'
        ? `Welcome to ${storeName}`
        : `${storeName} — Shop Online`;

  const blocks = DEFAULT_STOREFRONT.blocks.map((b) => {
    if (b.type === 'HERO') {
      return { ...b, title: heroTitle, subtitle: preset.description };
    }
    if (b.type === 'VERTICAL_PROMO' && preset.flags.repairs) {
      return { ...b, enabled: true };
    }
    return b;
  });

  await writeStorefrontConfig({
    theme: {
      ...DEFAULT_STOREFRONT.theme,
      presetId: presetId === 'restaurant' ? 'hearth' : presetId === 'grocery' ? 'spindrift' : 'grabber',
    },
    blocks,
  });
  await mergeConfigJson({ storefrontSavedAt: new Date().toISOString() });
}

export type DynamicSeedInput = SeedInput & {
  preset?: VerticalPresetId;
};

export type DynamicSeedResult = SeedResult & {
  preset: VerticalPresetId;
  mobilerepair?: Awaited<ReturnType<typeof runMobileRepairSetup>>;
  restaurantFloor?: { reused: boolean; count: number };
  catalogCount: number;
};

export async function runDynamicSeed(input: DynamicSeedInput): Promise<DynamicSeedResult> {
  const presetId = input.preset || 'fashion';
  const useDefaultFashion = presetId === 'fashion';

  const base = await runDatabaseSeed({
    ...input,
    includeDefaultCatalog: useDefaultFashion,
  });

  await applyVerticalFlags(presetId);
  await markPresetApplied(presetId);

  let catalogCount = base.products.length;
  if (base.branchId && !useDefaultFashion && presetId !== 'mobilerepair') {
    const [tax] = await db.select().from(taxProfiles).limit(1);
    const extra = await seedPresetCatalog(presetId, base.branchId, tax?.id);
    catalogCount = extra.length;
  }

  let mobilerepair: Awaited<ReturnType<typeof runMobileRepairSetup>> | undefined;
  if (presetId === 'mobilerepair' || presetId === 'electronics') {
    mobilerepair = await runMobileRepairSetup(db, { storeName: input.storeName });
    catalogCount += mobilerepair?.catalogRows ?? 0;
  }

  let restaurantFloor: { reused: boolean; count: number } | undefined;
  if (presetId === 'restaurant' || presetId === 'full') {
    restaurantFloor = await seedRestaurantFloor(base.branchId ?? null);
  }

  await seedStorefrontForPreset(presetId, input.storeName);
  await markSeedComplete(presetId);

  return {
    ...base,
    preset: presetId,
    mobilerepair,
    restaurantFloor,
    catalogCount,
  };
}

export { PRESET_CATALOGS };
