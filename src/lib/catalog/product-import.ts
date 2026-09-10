/**
 * GRABBER BUSINESS OS — INTELLIGENT MULTI-PLATFORM PRODUCT IMPORTER
 * Supports WooCommerce, Shopify, MyPoz, POSLK, Excel, and Standard Grabber CSV exports.
 */
import { and, eq } from 'drizzle-orm';
import { db, branches, categories, products, productVariants, stockBalances, taxProfiles } from '@/db';

export type ImportRowInput = {
  name: string;
  category?: string;
  sku: string;
  barcode?: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  variantName?: string;
  imageUrl?: string;
  description?: string;
  reorderLevel?: number;
  isActive?: boolean;
};

export type ImportRowPreview = ImportRowInput & {
  rowIndex: number;
  status: 'VALID' | 'WARNING' | 'COLLISION';
  note?: string;
  existingProductId?: string;
};

export type ImportCommitSummary = {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  variantsAdded: number;
};

function slugify(name: string, index = 0): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || 'product'}-${Date.now().toString(36)}-${index}-${rand}`;
}

function parseCsvLine(line: string, delimiter = ','): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function cleanHeaderKey(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseProductCsv(csvText: string): ImportRowInput[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // Determine separator (tab or comma)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';
  const headers = parseCsvLine(firstLine, delimiter).map(cleanHeaderKey);

  const idx = (aliases: string[]) => {
    const cleanAliases = aliases.map(cleanHeaderKey);
    return headers.findIndex((h) => cleanAliases.includes(h));
  };

  // Comprehensive multi-platform alias matchers
  const nameI = idx(['name', 'productname', 'product', 'title', 'posttitle', 'itemname', 'item']);
  const skuI = idx(['sku', 'skucode', 'itemcode', 'productcode', 'code', 'variantsku']);
  const idI = idx(['id', 'productid', 'postid', 'itemid']);
  const barcodeI = idx(['gtinupceanorisbn', 'gtin', 'upc', 'ean', 'isbn', 'barcode', 'barcodee', 'itembarcode', 'barcodevalue']);
  const regPriceI = idx(['regularprice', 'price', 'retailprice', 'standardprice', 'msrp', 'unitprice']);
  const salePriceI = idx(['saleprice', 'specialprice', 'sellprice', 'discountedprice', 'promoprice']);
  const costI = idx(['costprice', 'cost', 'unitcost', 'purchaseprice', 'buyprice', 'supplierprice']);
  const stockI = idx(['stock', 'initialstock', 'quantity', 'qty', 'stockquantity', 'inventory', 'onhand']);
  const inStockI = idx(['instock', 'stockstatus', 'availability']);
  const catI = idx(['categories', 'category', 'productcategory', 'itemcategory', 'cat', 'department', 'dept', 'collection']);
  const imgI = idx(['images', 'imageurl', 'image', 'featuredimage', 'imagesrc', 'photourl', 'thumbnail']);
  const descI = idx(['description', 'productdescription', 'bodyhtml', 'details', 'fulltext']);
  const shortDescI = idx(['shortdescription', 'summary', 'excerpt', 'tagline']);
  const lowStockI = idx(['lowstockamount', 'reorderlevel', 'minstock', 'minimumquantity', 'reorderpoint']);
  const pubI = idx(['published', 'isactive', 'status', 'visible', 'active', 'visibilityincatalog']);
  const variantI = idx(['variantname', 'variant', 'sizecolor', 'size', 'color', 'attributes', 'attribute1value']);

  const rows: ImportRowInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const name = nameI >= 0 ? cols[nameI]?.trim() : '';
    let sku = skuI >= 0 ? cols[skuI]?.trim() : '';
    const idVal = idI >= 0 ? cols[idI]?.trim() : '';

    // If SKU is empty, fallback to ID or auto-generated sequence
    if (!sku) {
      if (idVal) {
        sku = `WC-${idVal}`;
      } else if (name) {
        sku = `GEN-${i.toString().padStart(5, '0')}`;
      }
    }

    if (!name || !sku) continue;

    // Price Resolution: prefer SalePrice if > 0, else RegularPrice
    const regPrice = regPriceI >= 0 ? Number(cols[regPriceI]?.replace(/[^0-9.]/g, '')) || 0 : 0;
    const salePrice = salePriceI >= 0 ? Number(cols[salePriceI]?.replace(/[^0-9.]/g, '')) || 0 : 0;
    const effectivePrice = salePrice > 0 ? salePrice : regPrice > 0 ? regPrice : 0;

    // Cost Price
    const costPrice = costI >= 0 ? Number(cols[costI]?.replace(/[^0-9.]/g, '')) || 0 : 0;

    // Stock Quantity Resolution
    let initialStock = stockI >= 0 ? Number(cols[stockI]?.replace(/[^0-9.-]/g, '')) || 0 : 0;
    if (initialStock <= 0 && inStockI >= 0) {
      const inStockVal = cols[inStockI]?.toLowerCase();
      if (inStockVal === '1' || inStockVal === 'yes' || inStockVal === 'instock') {
        initialStock = 1; // Mark at least 1 in stock if flag says in stock
      }
    }

    // Category Resolution (extract primary if comma-separated or breadcrumb)
    let category = 'General';
    if (catI >= 0 && cols[catI]?.trim()) {
      const rawCat = cols[catI].trim();
      const firstCat = rawCat.split(/[,>|]/)[0]?.trim();
      if (firstCat) category = firstCat;
    }

    // Image URL Resolution (extract first valid URL)
    let imageUrl: string | undefined;
    if (imgI >= 0 && cols[imgI]?.trim()) {
      const rawImgs = cols[imgI].trim();
      const firstImg = rawImgs.split(/[,|]/)[0]?.trim();
      if (firstImg && /^https?:\/\//i.test(firstImg)) {
        imageUrl = firstImg;
      }
    }

    // Description Resolution
    const desc = descI >= 0 ? cols[descI]?.trim() : '';
    const shortDesc = shortDescI >= 0 ? cols[shortDescI]?.trim() : '';
    const description = desc || shortDesc || undefined;

    // Reorder Level / Low stock
    const reorderLevel = lowStockI >= 0 ? Math.max(1, Number(cols[lowStockI]) || 10) : 10;

    // Published / Active status
    let isActive = true;
    if (pubI >= 0 && cols[pubI]?.trim()) {
      const pubVal = cols[pubI].trim().toLowerCase();
      if (['0', 'no', 'false', 'draft', 'hidden', 'private'].includes(pubVal)) {
        isActive = false;
      }
    }

    // Barcode
    const barcode = barcodeI >= 0 ? cols[barcodeI]?.trim() : '';

    // Variant
    let variantName = variantI >= 0 ? cols[variantI]?.trim() : undefined;
    if (variantName) {
      const vLower = variantName.toLowerCase();
      if (['simple', 'variable', 'grouped', 'external', 'default', 'standard', 'base'].includes(vLower)) {
        variantName = undefined;
      }
    }

    rows.push({
      name,
      category,
      sku,
      barcode,
      costPrice,
      salePrice: effectivePrice,
      initialStock: Math.max(0, initialStock),
      variantName: variantName || undefined,
      imageUrl,
      description,
      reorderLevel,
      isActive,
    });
  }

  return rows;
}

export async function validateImportRows(rows: ImportRowInput[]): Promise<ImportRowPreview[]> {
  let existingMap = new Map<string, string>();
  try {
    const existing = await db.select({ id: products.id, sku: products.sku }).from(products).limit(50000);
    existingMap = new Map(existing.map((p) => [p.sku.toUpperCase(), p.id]));
  } catch {
    /* database offline/unit test mode */
  }
  const seenInBatch = new Set<string>();

  return rows.map((row, rowIndex) => {
    const skuKey = row.sku.toUpperCase();
    const existingProductId = existingMap.get(skuKey);
    let status: ImportRowPreview['status'] = 'VALID';
    let note: string | undefined;

    if (existingProductId) {
      status = 'COLLISION';
      note = 'SKU exists in DB — will update existing product';
    } else if (seenInBatch.has(skuKey)) {
      status = 'COLLISION';
      note = 'Duplicate SKU in CSV — will merge/update with earlier row';
    } else if (!row.barcode) {
      status = 'WARNING';
      note = 'Missing barcode — will use SKU as barcode';
    }

    if (row.salePrice <= 0) {
      if (status !== 'COLLISION') status = 'WARNING';
      note = note ? `${note}; sale price is 0.00` : 'Sale price is 0.00';
    }

    seenInBatch.add(skuKey);
    return { ...row, rowIndex, status, note, existingProductId };
  });
}

async function resolveCategoryId(
  name: string,
  cache: Map<string, string>,
  tx: typeof db = db,
): Promise<string> {
  const cleanName = name.trim() || 'General';
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';

  if (cache.has(slug)) {
    return cache.get(slug)!;
  }

  const [existing] = await tx.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) {
    cache.set(slug, existing.id);
    return existing.id;
  }

  const [created] = await tx.insert(categories).values({ name: cleanName, slug }).returning();
  cache.set(slug, created.id);
  return created.id;
}

export async function commitImportRows(rows: ImportRowPreview[]): Promise<ImportCommitSummary> {
  const summary: ImportCommitSummary = {
    total: rows.length,
    added: 0,
    updated: 0,
    skipped: 0,
    variantsAdded: 0,
  };

  if (!rows.length) return summary;

  const [tax] = await db.select().from(taxProfiles).limit(1);
  const [branch] = await db.select().from(branches).limit(1);

  // Pre-load all existing product SKUs into memory
  const existingProds = await db.select({ id: products.id, sku: products.sku }).from(products).limit(50000);
  const skuToProductId = new Map<string, string>(
    existingProds.map((p) => [p.sku.toUpperCase(), p.id]),
  );

  const categoryCache = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name || !row.sku) {
        summary.skipped++;
        continue;
      }

      const skuKey = row.sku.toUpperCase();
      const categoryId = await resolveCategoryId(row.category || 'General', categoryCache, tx as unknown as typeof db);
      let productId = row.existingProductId || skuToProductId.get(skuKey);

      if (productId) {
        await tx
          .update(products)
          .set({
            name: row.name,
            barcode: row.barcode || row.sku,
            costPrice: String(row.costPrice.toFixed(2)),
            salePrice: String(row.salePrice.toFixed(2)),
            imageUrl: row.imageUrl || undefined,
            description: row.description || undefined,
            reorderLevel: row.reorderLevel ?? 10,
            categoryId,
            updatedAt: new Date(),
            isActive: row.isActive ?? true,
          })
          .where(eq(products.id, productId));
        summary.updated++;
      } else {
        const [prod] = await tx
          .insert(products)
          .values({
            name: row.name,
            sku: row.sku,
            slug: slugify(row.name, i),
            barcode: row.barcode || row.sku,
            costPrice: String(row.costPrice.toFixed(2)),
            salePrice: String(row.salePrice.toFixed(2)),
            imageUrl: row.imageUrl || null,
            description: row.description || null,
            reorderLevel: row.reorderLevel ?? 10,
            taxProfileId: tax?.id || null,
            categoryId,
            isActive: row.isActive ?? true,
          })
          .returning();
        productId = prod.id;
        skuToProductId.set(skuKey, prod.id);
        summary.added++;
      }

      if (row.variantName) {
        const variantSku = `${row.sku}-${row.variantName.replace(/\s+/g, '-').slice(0, 12)}`;
        const [existingVar] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.sku, variantSku))
          .limit(1);
        if (!existingVar) {
          await tx.insert(productVariants).values({
            productId,
            name: row.variantName,
            sku: variantSku,
            barcode: row.barcode || variantSku,
            costPrice: String(row.costPrice.toFixed(2)),
            salePrice: String(row.salePrice.toFixed(2)),
            attributesJson: { variant: row.variantName },
            active: true,
          });
          summary.variantsAdded++;
        }
      }

      if (branch && row.initialStock > 0 && !row.variantName) {
        const [bal] = await tx
          .select()
          .from(stockBalances)
          .where(
            and(
              eq(stockBalances.locationId, branch.id),
              eq(stockBalances.productId, productId),
            ),
          )
          .limit(1);
        if (bal) {
          await tx
            .update(stockBalances)
            .set({ onHand: row.initialStock, updatedAt: new Date() })
            .where(eq(stockBalances.id, bal.id));
        } else {
          await tx.insert(stockBalances).values({
            locationType: 'BRANCH',
            locationId: branch.id,
            productId,
            onHand: row.initialStock,
            reserved: 0,
            damaged: 0,
          });
        }
      }
    }
  });

  return summary;
}
