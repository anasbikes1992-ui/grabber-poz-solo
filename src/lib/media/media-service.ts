import { desc, eq, ilike, or } from 'drizzle-orm';
import { db, mediaAssets, products } from '@/db';

function cleanBasename(filename: string): string {
  // Strip extension and trailing suffixes like _1, _thumb, -thumb, etc.
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  return nameWithoutExt;
}

function normalizeStr(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function listMediaAssets(limit = 200) {
  const assets = await db
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(limit);
  return assets;
}

export async function createMediaAssetRecord(params: {
  title: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes?: number;
  source?: string;
}) {
  const [asset] = await db
    .insert(mediaAssets)
    .values({
      title: params.title,
      assetType: 'PRODUCT_IMAGE',
      source: params.source || 'LOCAL_UPLOAD',
      fileUrl: params.fileUrl,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
    })
    .returning();
  return asset;
}

export async function deleteMediaAssetRecord(id: string) {
  const [deleted] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
  return deleted;
}

/**
 * Auto-aligns a single uploaded media file with a product by SKU, Barcode, or Product Name.
 */
export async function autoAlignSingleMedia(fileUrl: string, originalFilename: string) {
  const rawKey = cleanBasename(originalFilename);
  const normalizedKey = normalizeStr(rawKey);
  if (!normalizedKey) return null;

  // 1. Try exact SKU or Barcode match
  const [exactMatch] = await db
    .select({ id: products.id, name: products.name, sku: products.sku })
    .from(products)
    .where(or(ilike(products.sku, rawKey), ilike(products.barcode, rawKey)))
    .limit(1);

  if (exactMatch) {
    await db
      .update(products)
      .set({ imageUrl: fileUrl, updatedAt: new Date() })
      .where(eq(products.id, exactMatch.id));
    return { matched: true, productId: exactMatch.id, name: exactMatch.name, sku: exactMatch.sku, matchType: 'SKU/Barcode' };
  }

  // 2. Try product name match
  const prods = await db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).limit(5000);
  const nameMatch = prods.find((p) => {
    const normName = normalizeStr(p.name);
    return normName === normalizedKey || (normName.length > 5 && (normName.includes(normalizedKey) || normalizedKey.includes(normName)));
  });

  if (nameMatch) {
    await db
      .update(products)
      .set({ imageUrl: fileUrl, updatedAt: new Date() })
      .where(eq(products.id, nameMatch.id));
    return { matched: true, productId: nameMatch.id, name: nameMatch.name, sku: nameMatch.sku, matchType: 'Name' };
  }

  return { matched: false };
}

/**
 * Bulk auto-aligns all media assets in the media library with matching products.
 */
export async function bulkAutoAlignMedia() {
  const assets = await listMediaAssets(1000);
  const prods = await db
    .select({ id: products.id, name: products.name, sku: products.sku, barcode: products.barcode, imageUrl: products.imageUrl })
    .from(products)
    .limit(10000);

  const skuMap = new Map<string, typeof prods[0]>();
  const barcodeMap = new Map<string, typeof prods[0]>();
  const nameMap = new Map<string, typeof prods[0]>();

  for (const p of prods) {
    if (p.sku) skuMap.set(normalizeStr(p.sku), p);
    if (p.barcode) barcodeMap.set(normalizeStr(p.barcode), p);
    if (p.name) nameMap.set(normalizeStr(p.name), p);
  }

  let alignedCount = 0;
  const matches: Array<{ assetTitle: string; productName: string; sku: string; matchType: string }> = [];

  for (const asset of assets) {
    const rawKey = cleanBasename(asset.title);
    const normKey = normalizeStr(rawKey);
    if (!normKey) continue;

    let target = skuMap.get(normKey) || barcodeMap.get(normKey) || nameMap.get(normKey);
    let matchType = 'Exact';

    if (!target) {
      // Fuzzy contains match for long titles
      target = prods.find((p) => {
        const np = normalizeStr(p.name);
        return np.length > 6 && (np.includes(normKey) || normKey.includes(np));
      });
      if (target) matchType = 'Name Fuzzy';
    }

    if (target) {
      await db
        .update(products)
        .set({ imageUrl: asset.fileUrl, updatedAt: new Date() })
        .where(eq(products.id, target.id));

      alignedCount++;
      matches.push({
        assetTitle: asset.title,
        productName: target.name,
        sku: target.sku,
        matchType,
      });
    }
  }

  return {
    totalAssets: assets.length,
    alignedCount,
    matches,
  };
}
