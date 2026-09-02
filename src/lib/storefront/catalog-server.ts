import { and, eq, or, sql } from 'drizzle-orm';
import { db, branches, categories, products, productVariants, stockBalances } from '@/db';

export type StorefrontVariant = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  attributesJson?: Record<string, string>;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  variants: StorefrontVariant[];
  updatedAt: Date;
};

export async function listPublishedProductSlugs(limit = 500) {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(limit);
}

export async function getStorefrontProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product || !product.isActive) return null;

  const [branch] = await db.select().from(branches).limit(1);
  const stocks = branch
    ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branch.id))
    : [];
  const stockKey = (productId: string, variantId?: string | null) =>
    `${productId}:${variantId || 'base'}`;
  const stockMap = new Map(
    stocks.map((s) => [stockKey(s.productId, s.variantId), Number(s.onHand ?? 0)]),
  );

  let category: string | null = null;
  if (product.categoryId) {
    const [cat] = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
    category = cat?.name ?? null;
  }

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.active, true)));

  const variants: StorefrontVariant[] = variantRows.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    salePrice: Number(v.salePrice ?? product.salePrice),
    costPrice: Number(v.costPrice ?? product.costPrice),
    stock: stockMap.get(stockKey(product.id, v.id)) ?? 0,
    attributesJson: (v.attributesJson as Record<string, string>) || {},
  }));

  const baseStock = stockMap.get(stockKey(product.id, null)) ?? 0;
  const totalStock =
    variants.length > 0 ? variants.reduce((s, v) => s + v.stock, 0) : baseStock;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode,
    salePrice: Number(product.salePrice),
    costPrice: Number(product.costPrice),
    imageUrl: product.imageUrl,
    category,
    stock: totalStock,
    variants,
    updatedAt: product.updatedAt,
  };
}

export async function listCategorySlugs(limit = 100) {
  return db
    .select({ slug: categories.slug, name: categories.name, updatedAt: categories.createdAt })
    .from(categories)
    .where(eq(categories.active, true))
    .limit(limit);
}

export async function getCategoryWithProducts(categorySlug: string) {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
  if (!cat) return null;
  const prods = await db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, cat.id), eq(products.isActive, true)))
    .limit(100);
  return { category: cat, products: prods };
}

export type StorefrontSearchHit = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  category: string | null;
};

/** Server-side storefront product search (STR-03). */
export async function searchStorefrontProducts(
  query: string,
  opts?: { categorySlug?: string; limit?: number },
): Promise<StorefrontSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const limit = opts?.limit ?? 50;
  const pattern = `%${q}%`;

  let categoryId: string | undefined;
  if (opts?.categorySlug) {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, opts.categorySlug)).limit(1);
    categoryId = cat?.id;
  }

  const conditions = [
    eq(products.isActive, true),
    or(
      sql`lower(${products.name}) like ${pattern}`,
      sql`lower(${products.sku}) like ${pattern}`,
      sql`lower(coalesce(${products.barcode}, '')) like ${pattern}`,
    ),
  ];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      barcode: products.barcode,
      salePrice: products.salePrice,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(and(...conditions))
    .limit(limit);

  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean))] as string[];
  const categoryRows =
    categoryIds.length > 0
      ? await db.select().from(categories).where(or(...categoryIds.map((id) => eq(categories.id, id))))
      : [];
  const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    barcode: r.barcode,
    salePrice: Number(r.salePrice),
    category: r.categoryId ? categoryMap.get(r.categoryId) ?? null : null,
  }));
}
