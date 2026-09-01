import { and, eq } from 'drizzle-orm';
import { db, branches, categories, products, productVariants, stockBalances } from '@/db';

export type StorefrontVariant = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
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
