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
  unitCost: number;
  stock: number;
  variant: string;
  imageUrl?: string | null;
  description?: string | null;
  category: string;
  categoryId?: string | null;
};

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
    const stockKey = (productId: string, variantId?: string | null) =>
      `${productId}:${variantId || 'base'}`;
    const stockMap = new Map(
      stocks.map((s) => [stockKey(s.productId, s.variantId), Number(s.onHand ?? 0)]),
    );

    const items: StorefrontCatalogItem[] = [];

    for (const p of catalog) {
      const pVariants = variantsByProduct.get(p.id) || [];
      const catName = (p.categoryId && catMap.get(p.categoryId)) || 'Uncategorized';
      if (pVariants.length) {
        for (const v of pVariants) {
          items.push({
            id: v.id,
            productId: p.id,
            variantId: v.id,
            slug: p.slug,
            name: p.name,
            sku: v.sku,
            barcode: v.barcode || v.sku,
            unitPrice: Number(v.salePrice ?? p.salePrice),
            unitCost: Number(v.costPrice ?? p.costPrice),
            stock: stockMap.get(stockKey(p.id, v.id)) ?? 0,
            variant: v.name,
            imageUrl: p.imageUrl,
            description: p.description,
            category: catName,
            categoryId: p.categoryId,
          });
        }
      } else {
        items.push({
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
          imageUrl: p.imageUrl,
          description: p.description,
          category: catName,
          categoryId: p.categoryId,
        });
      }
    }

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
