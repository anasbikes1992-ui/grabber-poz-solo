import { and, eq, inArray } from 'drizzle-orm';
import { db, products, stockBalances, branches, productVariants, categories } from '@/db';
import { hasDatabaseUrl } from '@/lib/db/connection';

export type StorefrontCatalogItem = {
  id: string;
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  unitPriceMax?: number;
  unitCost: number;
  stock: number;
  variant: string;
  variantCount?: number;
  imageUrl?: string | null;
  description?: string | null;
  category: string;
  categoryId?: string | null;
};

type CatalogProductRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string | number;
  costPrice: string | number;
  imageUrl: string | null;
  description: string | null;
  categoryId: string | null;
};

type CatalogVariantRow = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: string | number | null;
  costPrice: string | number | null;
};

export function buildStorefrontFamilyItems({
  products: catalog,
  variantsByProduct,
  categoryMap,
  stockMap,
}: {
  products: CatalogProductRow[];
  variantsByProduct: Map<string, CatalogVariantRow[]>;
  categoryMap: Map<string, string>;
  stockMap: Map<string, number>;
}): StorefrontCatalogItem[] {
  const stockKey = (productId: string, variantId?: string | null) =>
    `${productId}:${variantId || 'base'}`;

  return catalog.map((p) => {
    const pVariants = variantsByProduct.get(p.id) || [];
    const catName = (p.categoryId && categoryMap.get(p.categoryId)) || 'Uncategorized';

    if (pVariants.length > 0) {
      const prices = pVariants.map((v) => Number(v.salePrice ?? p.salePrice));
      const costs = pVariants.map((v) => Number(v.costPrice ?? p.costPrice));
      const totalStock = pVariants.reduce((sum, v) => sum + (stockMap.get(stockKey(p.id, v.id)) ?? 0), 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return {
        id: p.id,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || p.sku,
        unitPrice: minPrice,
        unitPriceMax: maxPrice,
        unitCost: Math.min(...costs),
        stock: totalStock,
        variant: `${pVariants.length} options`,
        variantCount: pVariants.length,
        imageUrl: p.imageUrl,
        description: p.description,
        category: catName,
        categoryId: p.categoryId,
      };
    }

    return {
      id: p.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || p.sku,
      unitPrice: Number(p.salePrice),
      unitCost: Number(p.costPrice),
      stock: stockMap.get(stockKey(p.id, null)) ?? 0,
      variant: p.sku,
      variantCount: 0,
      imageUrl: p.imageUrl,
      description: p.description,
      category: catName,
      categoryId: p.categoryId,
    };
  });
}

export async function loadStorefrontCatalog(branchIdParam?: string | null): Promise<{
  ok: boolean;
  error?: string;
  branchId: string | null;
  items: StorefrontCatalogItem[];
}> {
  if (!hasDatabaseUrl()) {
    return {
      ok: false,
      error: 'DATABASE_URL or POSTGRES_URL not configured',
      branchId: null,
      items: [],
    };
  }

  try {
    let branchId = branchIdParam || null;
    if (!branchId) {
      const [b] = await db.select().from(branches).limit(1);
      branchId = b?.id || null;
    }

    const catalog = await db.select().from(products).where(eq(products.isActive, true)).limit(5000);
    const productIds = catalog.map((p) => p.id);
    const variants =
      productIds.length > 0
        ? await db
            .select()
            .from(productVariants)
            .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true)))
        : [];
    const variantsByProduct = new Map<string, typeof variants>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.productId) || [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }

    const allCats = await db.select().from(categories).limit(500);
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));

    const stocks = branchId
      ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branchId))
      : [];
    const stockMap = new Map(
      stocks.map((s) => [`${s.productId}:${s.variantId || 'base'}`, Number(s.onHand ?? 0)]),
    );

    const items = buildStorefrontFamilyItems({
      products: catalog,
      variantsByProduct,
      categoryMap: catMap,
      stockMap,
    });

    return { ok: true, branchId, items };
  } catch (err: unknown) {
    return {
      ok: false,
      error: (err as Error).message || 'Catalog load failed',
      branchId: null,
      items: [],
    };
  }
}
