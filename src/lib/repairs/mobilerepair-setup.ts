/**
 * MobileRepair shop profile — catalog seed, repair price matrix, vertical preset.
 */
import { eq, sql } from 'drizzle-orm';
import {
  branches,
  businessConfig,
  businessProfile,
  productVariants,
  products,
  repairServiceCatalog,
  stockBalances,
  taxProfiles,
} from '@/db/schema';
import { VERTICAL_PRESETS } from '@/lib/config/vertical-presets';
import { lookupRepairCatalogQuote } from '@/lib/repairs/catalog';
import { REPAIR_CATEGORIES, REPAIR_DEVICE_TREE } from '@/lib/repairs/device-tree';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

const CATALOG_MODELS: Array<{ brand: string; category: string; model: string }> = [];
for (const [brand, cats] of Object.entries(REPAIR_DEVICE_TREE)) {
  for (const [category, models] of Object.entries(cats)) {
    for (const model of models.slice(0, 3)) {
      CATALOG_MODELS.push({ brand, category, model });
    }
  }
}

export async function seedMobileRepairCatalog(tx: Tx) {
  const [existing] = await tx.select().from(repairServiceCatalog).limit(1);
  if (existing) {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(repairServiceCatalog);
    return Number(count || 0);
  }

  let inserted = 0;
  for (const row of CATALOG_MODELS) {
    for (const cat of REPAIR_CATEGORIES) {
      for (const partQuality of ['OEM_ORIGINAL', 'GRADE_A_COMPATIBLE'] as const) {
        const quote = lookupRepairCatalogQuote({
          brand: row.brand,
          deviceModel: row.model,
          repairCategory: cat.id,
          partQuality,
        });
        await tx.insert(repairServiceCatalog).values({
          brand: row.brand,
          deviceModel: row.model,
          repairCategory: cat.id,
          partQuality,
          estimatedCostLkr: String(quote.estimatedCostLkr.toFixed(2)),
          estimatedMinutes: quote.estimatedMinutes,
          warrantyDays: quote.warrantyDays,
          active: true,
        });
        inserted += 1;
      }
    }
  }
  return inserted;
}

const PHONE_CATALOG = [
  {
    sku: 'MR-IP15P-256-BLK',
    slug: 'iphone-15-pro-256-black',
    name: 'Apple iPhone 15 Pro 256GB — Black',
    sale: '340000.00',
    cost: '295000.00',
    variants: [
      {
        sku: 'MR-IP15P-256-BLK-NEW',
        name: '256GB / Black / Sealed New / TRCSL 1Y',
        sale: '340000',
        attrs: { Storage: '256GB', Color: 'Black', Condition: 'SEALED_NEW', Warranty: 'TRCSL_COMPANY_1Y' },
      },
      {
        sku: 'MR-IP15P-256-BLK-POA',
        name: '256GB / Black / Pre-Owned A / 6M Store',
        sale: '285000',
        attrs: { Storage: '256GB', Color: 'Black', Condition: 'PRE_OWNED_GRADE_A', Warranty: 'STORE_WARRANTY_6M' },
      },
    ],
  },
  {
    sku: 'MR-S24U-256',
    slug: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    sale: '320000.00',
    cost: '275000.00',
    variants: [
      {
        sku: 'MR-S24U-256-NEW',
        name: '256GB / Titanium / Sealed New',
        sale: '320000',
        attrs: { Storage: '256GB', Color: 'Titanium', Condition: 'SEALED_NEW', Warranty: 'TRCSL_COMPANY_1Y' },
      },
      {
        sku: 'MR-S24U-256-POA',
        name: '256GB / Titanium / Pre-Owned A',
        sale: '265000',
        attrs: { Storage: '256GB', Color: 'Titanium', Condition: 'PRE_OWNED_GRADE_A', Warranty: 'STORE_WARRANTY_6M' },
      },
    ],
  },
];

export async function seedMobileRepairProducts(tx: Tx, branchId: string, taxProfileId?: string) {
  const seeded: string[] = [];
  for (const p of PHONE_CATALOG) {
    let [product] = await tx
      .insert(products)
      .values({
        name: p.name,
        sku: p.sku,
        slug: p.slug,
        salePrice: p.sale,
        costPrice: p.cost,
        isActive: true,
        taxProfileId: taxProfileId || null,
      })
      .onConflictDoNothing()
      .returning();

    if (!product) {
      [product] = await tx.select().from(products).where(eq(products.sku, p.sku)).limit(1);
    }
    if (!product?.id) continue;

    for (const v of p.variants) {
      let [variant] = await tx
        .insert(productVariants)
        .values({
          productId: product.id,
          name: v.name,
          sku: v.sku,
          salePrice: v.sale,
          costPrice: p.cost,
          attributesJson: v.attrs,
          active: true,
        })
        .onConflictDoNothing()
        .returning();

      if (!variant) {
        [variant] = await tx.select().from(productVariants).where(eq(productVariants.sku, v.sku)).limit(1);
      }
      if (variant?.id) {
        await tx
          .insert(stockBalances)
          .values({
            locationType: 'BRANCH',
            locationId: branchId,
            productId: product.id,
            variantId: variant.id,
            onHand: 5,
            reserved: 0,
            damaged: 0,
          })
          .onConflictDoNothing();
      }
    }

    seeded.push(product.slug);
  }
  return seeded;
}

export async function applyMobileRepairVertical(tx: Tx, storeName = 'MobileRepair Shop') {
  const preset = VERTICAL_PRESETS.mobilerepair;

  await tx
    .insert(businessProfile)
    .values({ name: storeName, currency: 'LKR', timezone: 'Asia/Colombo' })
    .onConflictDoNothing();

  const [profile] = await tx.select().from(businessProfile).limit(1);
  if (profile && profile.name !== storeName) {
    await tx.update(businessProfile).set({ name: storeName }).where(eq(businessProfile.id, profile.id));
  }

  const existing = await tx.select().from(businessConfig).limit(1);
  const flags = { ...preset.flags };
  if (existing[0]) {
    const prev = (existing[0].configJson || {}) as Record<string, unknown>;
    await tx
      .update(businessConfig)
      .set({
        vertical: preset.vertical,
        configJson: { ...prev, verticalFlags: flags, verticalPreset: 'mobilerepair', profile: 'mobilerepair' },
        enableTableService: false,
        enableKitchenOrders: false,
        updatedAt: new Date(),
      })
      .where(eq(businessConfig.id, existing[0].id));
  } else {
    await tx.insert(businessConfig).values({
      vertical: preset.vertical,
      configJson: { verticalFlags: flags, verticalPreset: 'mobilerepair', profile: 'mobilerepair' },
    });
  }
}

export async function runMobileRepairSetup(
  db: { transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T> },
  opts: { storeName?: string } = {},
) {
  return db.transaction(async (tx) => {
    const [branch] = await tx.select().from(branches).limit(1);
    if (!branch) throw new Error('No branch — run POST /api/seed first');

    const [tax] = await tx.select().from(taxProfiles).limit(1);

    const catalogRows = await seedMobileRepairCatalog(tx);
    const productSlugs = await seedMobileRepairProducts(tx, branch.id, tax?.id);
    await applyMobileRepairVertical(tx, opts.storeName || 'MobileRepair Shop');

    return {
      catalogRows,
      productSlugs,
      preset: 'mobilerepair',
      branchId: branch.id,
    };
  });
}
