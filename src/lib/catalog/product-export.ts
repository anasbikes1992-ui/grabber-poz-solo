import { and, eq, inArray } from 'drizzle-orm';
import { db, branches, categories, products, productVariants, stockBalances } from '@/db';
import { PRODUCT_CSV_HEADERS, buildProductCsv } from './catalog-csv';

export type ProductExportRow = Record<(typeof PRODUCT_CSV_HEADERS)[number], string | number>;

export async function fetchProductExportRows(): Promise<ProductExportRow[]> {
  const [branch] = await db.select().from(branches).limit(1);
  const rows = await db.select().from(products).where(eq(products.isActive, true)).limit(5000);
  if (!rows.length) return [];

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

  const catRows = await db.select().from(categories).limit(500);
  const catMap = new Map(catRows.map((c) => [c.id, c.name]));

  const out: ProductExportRow[] = [];

  for (const p of rows) {
    const category = (p.categoryId && catMap.get(p.categoryId)) || 'General';
    const rawVariants = variantsByProduct.get(p.id) || [];
    // Filter out dummy 'simple' / 'default' variants so they don't corrupt base product SKU
    const realVariants = rawVariants.filter(
      (v) =>
        v.name &&
        v.name.toLowerCase() !== 'simple' &&
        v.name.toLowerCase() !== 'default' &&
        v.name.toLowerCase() !== 'standard' &&
        v.name !== p.name,
    );

    const cleanDesc = (p.description || '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (realVariants.length === 0) {
      out.push({
        Name: p.name,
        Category: category,
        SKU: p.sku,
        Barcode: p.barcode || p.sku,
        CostPrice: Number(p.costPrice).toFixed(2),
        SalePrice: Number(p.salePrice).toFixed(2),
        InitialStock: stockMap.get(stockKey(p.id, null)) ?? 0,
        VariantName: '',
        Images: p.imageUrl || '',
        Description: cleanDesc,
      });
      continue;
    }

    for (const v of realVariants) {
      out.push({
        Name: p.name,
        Category: category,
        SKU: v.sku,
        Barcode: v.barcode || v.sku,
        CostPrice: Number(v.costPrice ?? p.costPrice).toFixed(2),
        SalePrice: Number(v.salePrice ?? p.salePrice).toFixed(2),
        InitialStock: stockMap.get(stockKey(p.id, v.id)) ?? 0,
        VariantName: v.name,
        Images: p.imageUrl || '',
        Description: cleanDesc,
      });
    }
  }

  return out;
}

export async function exportProductsCsv(): Promise<string> {
  const rows = await fetchProductExportRows();
  return buildProductCsv(rows);
}
