import { and, eq, inArray } from 'drizzle-orm';
import { db, products, stockBalances, taxProfiles, branches, categories, productVariants } from '@/db';

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'product'}-${Date.now().toString(36).slice(-4)}`;
}

export async function listProductsWithVariants() {
  const [branch] = await db.select().from(branches).limit(1);
  const rows = await db.select().from(products).limit(500);
  const productIds = rows.map((p) => p.id);
  const variantRows =
    productIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, true)))
      : [];
  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) || [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const stocks = branch
    ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branch.id))
    : [];
  const stockKey = (productId: string, variantId?: string | null) =>
    `${productId}:${variantId || 'base'}`;
  const stockMap = new Map(
    stocks.map((s) => [stockKey(s.productId, s.variantId), Number(s.onHand ?? 0)]),
  );
  const cats = await db.select().from(categories).limit(200);
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  return {
    branchId: branch?.id || null,
    products: rows.map((p) => {
      const variants = (variantsByProduct.get(p.id) || []).map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode || v.sku,
        price: Number(v.salePrice ?? p.salePrice),
        cost: Number(v.costPrice ?? p.costPrice),
        stock: stockMap.get(stockKey(p.id, v.id)) ?? 0,
        active: v.active,
      }));
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || p.sku,
        category: (p.categoryId && catMap.get(p.categoryId)) || 'Uncategorized',
        categoryId: p.categoryId,
        price: Number(p.salePrice),
        cost: Number(p.costPrice),
        stock: stockMap.get(stockKey(p.id, null)) ?? 0,
        tax: 'STANDARD_VAT (18%)',
        isActive: p.isActive,
        variants,
        variantCount: variants.length,
      };
    }),
  };
}

export async function createProduct(body: Record<string, unknown>) {
  const name = String(body.name || '').trim();
  const sku = String(body.sku || '').trim();
  if (!name || !sku) {
    throw new Error('name and sku required');
  }

  const [tax] = await db.select().from(taxProfiles).limit(1);
  let categoryId: string | null = (body.categoryId as string) || null;
  if (!categoryId && body.category) {
    const slug = String(body.category).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existing) categoryId = existing.id;
    else {
      const [created] = await db
        .insert(categories)
        .values({ name: String(body.category), slug })
        .returning();
      categoryId = created.id;
    }
  }

  const [prod] = await db
    .insert(products)
    .values({
      name,
      sku,
      slug: slugify(name),
      barcode: (body.barcode as string) || null,
      salePrice: Number(body.price ?? body.salePrice ?? 0).toFixed(2),
      costPrice: Number(body.cost ?? body.costPrice ?? 0).toFixed(2),
      taxProfileId: tax?.id || null,
      categoryId,
      isActive: true,
    })
    .returning();

  const [branch] = await db.select().from(branches).limit(1);
  const initialStock = Number(body.stock ?? 0);
  if (branch && initialStock > 0) {
    await db.insert(stockBalances).values({
      locationType: 'BRANCH',
      locationId: branch.id,
      productId: prod.id,
      onHand: initialStock,
      reserved: 0,
      damaged: 0,
    });
  }

  return prod;
}

export async function updateProduct(id: string, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name != null) patch.name = body.name;
  if (body.sku != null) patch.sku = body.sku;
  if (body.barcode != null) patch.barcode = body.barcode;
  if (body.price != null) patch.salePrice = Number(body.price).toFixed(2);
  if (body.cost != null) patch.costPrice = Number(body.cost).toFixed(2);
  if (body.isActive != null) patch.isActive = body.isActive;

  const [prod] = await db.update(products).set(patch).where(eq(products.id, id)).returning();
  if (!prod) throw new Error('Product not found');
  return prod;
}

export async function softDeleteProduct(id: string) {
  const [prod] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return prod;
}
