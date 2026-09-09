/**
 * Product import — validate → preview → transactional commit.
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseProductCsv(csvText: string): ImportRowInput[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const idx = (names: string[]) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1;

  const nameI = idx(['name', 'productname', 'product', 'title']);
  const catI = idx(['category', 'cat', 'categories']);
  const skuI = idx(['sku', 'skucode', 'id']);
  const barcodeI = idx(['barcode', 'barcodee', 'upc', 'ean']);
  const costI = idx(['costprice', 'cost', 'unitcost', 'purchaseprice']);
  const saleI = idx(['saleprice', 'price', 'sellprice', 'regularprice']);
  const stockI = idx(['initialstock', 'stock', 'qty', 'quantity']);
  const variantI = idx(['variantname', 'variant', 'sizecolor']);

  const rows: ImportRowInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = nameI >= 0 ? cols[nameI]?.trim() : '';
    let sku = skuI >= 0 ? cols[skuI]?.trim() : '';
    
    // Auto-generate SKU if blank
    if (!sku && name) {
      sku = `GEN-${i.toString().padStart(5, '0')}`;
    }
    
    if (!name || !sku) continue;
    rows.push({
      name,
      category: catI >= 0 ? cols[catI]?.trim() || 'General' : 'General',
      sku,
      barcode: barcodeI >= 0 ? cols[barcodeI]?.trim() : '',
      costPrice: costI >= 0 ? Number(cols[costI]) || 0 : 0,
      salePrice: saleI >= 0 ? Number(cols[saleI]) || 0 : 0,
      initialStock: stockI >= 0 ? Number(cols[stockI]) || 0 : 0,
      variantName: variantI >= 0 ? cols[variantI]?.trim() : undefined,
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
            categoryId,
            updatedAt: new Date(),
            isActive: true,
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
            taxProfileId: tax?.id || null,
            categoryId,
            isActive: true,
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
