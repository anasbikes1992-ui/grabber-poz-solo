import { and, eq, isNull } from 'drizzle-orm';
import {
  catalogImportRows,
  catalogImportRuns,
  branches,
  categories,
  db,
  externalProductMappings,
  productImportMetadata,
  productMediaLinks,
  productSupplierPreferences,
  productVariants,
  products,
  stockBalances,
  stockLots,
  stockMovements,
  suppliers,
  taxProfiles,
} from '@/db';
import {
  buildCatalogImportApplyPlan,
  type CatalogImportApplyRow,
} from './catalog-import-apply-plan';
import type { UniversalStagedCatalogRow } from './universal-catalog';

export type ApplyCatalogImportInput = {
  importRunId: string;
  approvedSourceIds?: string[];
  actorId?: string | null;
};

export type ApplyCatalogImportResult = {
  importRunId: string;
  createdProducts: number;
  createdVariants: number;
  skippedRows: number;
  sourceMappings: number;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 56) || 'catalog-item'
  );
}

function productSlug(row: CatalogImportApplyRow): string {
  return `${slugify(row.title)}-${slugify(row.sourceSystem)}-${slugify(row.sourceId)}`.slice(0, 96);
}

function categorySlug(path: string[]): string {
  return slugify(path.join('-'));
}

async function resolveCategoryId(
  tx: typeof db,
  categoryPath: string[] | undefined,
): Promise<string | null> {
  if (!categoryPath?.length) return null;

  let parentId: string | null = null;
  let currentId: string | null = null;
  for (let i = 0; i < categoryPath.length; i++) {
    const name = categoryPath[i].trim();
    if (!name) continue;
    const slug = categorySlug(categoryPath.slice(0, i + 1));
    const [existing] = await tx.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existing) {
      currentId = existing.id;
      parentId = existing.id;
      continue;
    }
    const createdRows: Array<{ id: string }> = await tx
      .insert(categories)
      .values({ name, slug, parentId })
      .returning({ id: categories.id });
    const created = createdRows[0];
    currentId = created.id;
    parentId = created.id;
  }

  return currentId;
}

function rowPrice(row: UniversalStagedCatalogRow, fallback = 0): string {
  return Number(row.currentPrice ?? row.regularPrice ?? fallback).toFixed(2);
}

function rowCostPrice(row: UniversalStagedCatalogRow): string {
  return Number(row.costPrice ?? 0).toFixed(2);
}

function rowWholesalePrice(row: UniversalStagedCatalogRow): string | null {
  return row.wholesalePrice == null ? null : Number(row.wholesalePrice).toFixed(2);
}

function selectedRows(
  rows: CatalogImportApplyRow[],
  approvedSourceIds?: string[],
): CatalogImportApplyRow[] {
  if (approvedSourceIds?.length) {
    const approved = new Set(approvedSourceIds);
    return rows.filter((row) => approved.has(row.sourceId));
  }
  return rows.filter((row) => row.warningsJson?.length === 0);
}

async function resolveSupplierId(tx: typeof db, supplierName: string | null | undefined): Promise<string | null> {
  const name = supplierName?.trim();
  if (!name) return null;
  const [existing] = await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, name)).limit(1);
  if (existing) return existing.id;
  const [created] = await tx.insert(suppliers).values({ name }).returning({ id: suppliers.id });
  return created.id;
}

async function persistCatalogExtensions(
  tx: typeof db,
  params: {
    row: CatalogImportApplyRow;
    productId: string;
    variantId?: string | null;
    branchId?: string | null;
    sourceSystem: string;
    sourceNamespace: string;
  },
): Promise<void> {
  const row = params.row.rowJson;
  await tx.insert(productImportMetadata).values({
    productId: params.productId,
    variantId: params.variantId || null,
    sourceSystem: params.sourceSystem,
    sourceNamespace: params.sourceNamespace,
    sourceId: params.row.sourceId,
    brandName: row.brandName || null,
    tagsJson: row.tags || [],
    warrantyMonths: row.warrantyMonths || null,
    maxDiscountAmount: row.maxDiscountAmount == null ? null : Number(row.maxDiscountAmount).toFixed(2),
    singleDiscount: row.singleDiscount,
    discountPercent: row.discountPercent == null ? null : Number(row.discountPercent).toFixed(4),
    weightValue: row.dimensions.weightValue == null ? null : Number(row.dimensions.weightValue).toFixed(4),
    weightUnit: row.dimensions.weightUnit,
    lengthCm: row.dimensions.lengthCm == null ? null : Number(row.dimensions.lengthCm).toFixed(4),
    widthCm: row.dimensions.widthCm == null ? null : Number(row.dimensions.widthCm).toFixed(4),
    heightCm: row.dimensions.heightCm == null ? null : Number(row.dimensions.heightCm).toFixed(4),
    rawJson: row.raw,
  }).onConflictDoNothing();

  if (row.images.length > 1) {
    await tx.insert(productMediaLinks).values(
      row.images.map((url, index) => ({
        productId: params.productId,
        variantId: params.variantId || null,
        sourceUrl: url,
        sortOrder: index,
        altText: row.title,
        sourceSystem: `${params.sourceSystem}:catalog_import`,
      })),
    ).onConflictDoNothing();
  }

  const supplierId = await resolveSupplierId(tx, row.supplierName);
  if (row.supplierName) {
    await tx.insert(productSupplierPreferences).values({
      productId: params.productId,
      variantId: params.variantId || null,
      supplierId,
      supplierName: row.supplierName,
      lastCost: row.costPrice == null ? null : Number(row.costPrice).toFixed(2),
    }).onConflictDoNothing();
  }

  const qty = row.stock.status === 'provided' ? row.stock.quantity || 0 : 0;
  if (!params.branchId || qty <= 0) return;

  const [bal] = await tx
    .select()
    .from(stockBalances)
    .where(
      and(
        eq(stockBalances.locationType, 'BRANCH'),
        eq(stockBalances.locationId, params.branchId),
        eq(stockBalances.productId, params.productId),
        params.variantId ? eq(stockBalances.variantId, params.variantId) : isNull(stockBalances.variantId),
      ),
    )
    .limit(1);
  const previousQty = bal?.onHand || 0;
  if (bal) {
    await tx.update(stockBalances).set({ onHand: qty, updatedAt: new Date() }).where(eq(stockBalances.id, bal.id));
  } else {
    await tx.insert(stockBalances).values({
      locationType: 'BRANCH',
      locationId: params.branchId,
      productId: params.productId,
      variantId: params.variantId || null,
      onHand: qty,
      reserved: 0,
      damaged: 0,
    });
  }
  const delta = qty - previousQty;
  if (delta !== 0) {
    await tx.insert(stockMovements).values({
      locationType: 'BRANCH',
      locationId: params.branchId,
      productId: params.productId,
      variantId: params.variantId || null,
      type: 'COUNT',
      delta,
      unitCost: row.costPrice == null ? null : Number(row.costPrice).toFixed(2),
      referenceType: 'CATALOG_IMPORT',
      referenceId: params.row.sourceId,
      notes: 'Approved catalog import initial stock',
    });
  }

  if (row.expiryDate) {
    await tx.insert(stockLots).values({
      batchCode: `IMPORT-${params.row.sourceId}`.slice(0, 64),
      productId: params.productId,
      variantId: params.variantId || null,
      locationType: 'BRANCH',
      locationId: params.branchId,
      qtyOnHand: qty,
      expiryDate: new Date(`${row.expiryDate}T00:00:00.000Z`),
    });
  }
}

export async function applyCatalogImportRun(
  input: ApplyCatalogImportInput,
): Promise<ApplyCatalogImportResult> {
  const [run] = await db
    .select()
    .from(catalogImportRuns)
    .where(eq(catalogImportRuns.id, input.importRunId))
    .limit(1);
  if (!run) throw Object.assign(new Error('Import run not found'), { status: 404 });

  const stagedRowsRaw = await db
    .select()
    .from(catalogImportRows)
    .where(eq(catalogImportRows.importRunId, input.importRunId));

  const sourceSystem = run.sourceSystem;
  const sourceNamespace = run.sourceNamespace;
  const rows = selectedRows(
    stagedRowsRaw.map((row) => ({
      id: row.id,
      sourceSystem,
      sourceNamespace,
      sourceId: row.sourceId,
      rowType: row.rowType,
      parentSourceId: row.parentSourceId,
      internalSku: row.internalSku,
      title: row.title,
      rowJson: row.rowJson as unknown as UniversalStagedCatalogRow,
      warningsJson: row.warningsJson as string[],
    })),
    input.approvedSourceIds,
  );

  if (rows.length === 0) {
    return { importRunId: input.importRunId, createdProducts: 0, createdVariants: 0, skippedRows: 0, sourceMappings: 0 };
  }

  const existingMappings = await db
    .select({
      sourceId: externalProductMappings.sourceId,
      productId: externalProductMappings.productId,
      variantId: externalProductMappings.variantId,
    })
    .from(externalProductMappings)
    .where(
      and(
        eq(externalProductMappings.sourceSystem, sourceSystem),
        eq(externalProductMappings.sourceNamespace, sourceNamespace),
      ),
    );
  const existingProducts = await db.select({ sku: products.sku }).from(products).limit(100000);
  const existingVariants = await db.select({ sku: productVariants.sku }).from(productVariants).limit(100000);
  const existingSkus = new Set(
    [...existingProducts.map((row) => row.sku), ...existingVariants.map((row) => row.sku)].map((sku) => sku.toUpperCase()),
  );

  const plan = buildCatalogImportApplyPlan({ rows, existingMappings, existingSkus });
  const blockers = plan.actions.filter((action) => action.type === 'conflict_sku' || action.type === 'wait_for_parent');
  if (blockers.length > 0) {
    throw Object.assign(new Error('Import apply blocked by SKU conflicts or missing variant parents'), {
      status: 409,
      details: blockers.map((action) => ({
        type: action.type,
        sourceId: action.row.sourceId,
        title: action.row.title,
        reason: 'reason' in action ? action.reason : undefined,
      })),
    });
  }

  let createdProducts = 0;
  let createdVariants = 0;
  let sourceMappings = 0;
  let skippedRows = 0;

  await db.transaction(async (tx) => {
    const [tax] = await tx.select().from(taxProfiles).limit(1);
    const [branch] = await tx.select({ id: branches.id }).from(branches).limit(1);
    const productIdBySource = new Map<string, string>();
    for (const mapping of existingMappings) {
      if (mapping.productId) productIdBySource.set(mapping.sourceId, mapping.productId);
    }

    for (const action of plan.actions) {
      if (action.type === 'skip_mapped') {
        skippedRows++;
        if (action.row.id) {
          await tx.update(catalogImportRows).set({ status: 'SKIPPED' }).where(eq(catalogImportRows.id, action.row.id));
        }
        continue;
      }
      if (action.type !== 'create_product') continue;

      const categoryId = await resolveCategoryId(tx as typeof db, action.row.rowJson.categories[0]);
      const [created] = await tx
        .insert(products)
        .values({
          name: action.row.title,
          slug: productSlug(action.row),
          sku: action.row.internalSku || action.row.rowJson.internalSku,
          barcode: action.row.rowJson.barcode || null,
          costPrice: rowCostPrice(action.row.rowJson),
          salePrice: rowPrice(action.row.rowJson),
          wholesalePrice: rowWholesalePrice(action.row.rowJson),
          imageUrl: action.row.rowJson.images[0] || null,
          description: action.row.rowJson.description || action.row.rowJson.shortDescription || null,
          taxProfileId: tax?.id || null,
          categoryId,
          isActive: false,
          itemType: action.row.rowJson.itemType || 'PHYSICAL',
        })
        .returning({ id: products.id });

      productIdBySource.set(action.row.sourceId, created.id);
      createdProducts++;
      await tx.insert(externalProductMappings).values({
        sourceSystem,
        sourceNamespace,
        sourceId: action.row.sourceId,
        sourceType: action.productKind === 'variable_parent' ? 'PRODUCT_FAMILY' : 'PRODUCT',
        sourceSku: action.row.rowJson.rawSku || null,
        sourceHash: action.row.rowJson.sourceHash,
        productId: created.id,
        variantId: null,
        importRunId: input.importRunId,
      });
      sourceMappings++;
      await persistCatalogExtensions(tx as typeof db, {
        row: action.row,
        productId: created.id,
        sourceSystem,
        sourceNamespace,
        branchId: branch?.id || null,
      });
      if (action.row.id) {
        await tx.update(catalogImportRows).set({ status: 'APPLIED' }).where(eq(catalogImportRows.id, action.row.id));
      }
    }

    for (const action of plan.actions) {
      if (action.type !== 'create_variant') continue;
      const productId = productIdBySource.get(action.parentSourceId);
      if (!productId) continue;

      const [created] = await tx
        .insert(productVariants)
        .values({
          productId,
          name: action.row.rowJson.attributes
            ? Object.values(action.row.rowJson.attributes).filter(Boolean).join(' / ') || action.row.title
            : action.row.title,
          sku: action.row.internalSku || action.row.rowJson.internalSku,
          barcode: action.row.rowJson.barcode || null,
          costPrice: rowCostPrice(action.row.rowJson),
          salePrice: rowPrice(action.row.rowJson),
          attributesJson: action.row.rowJson.attributes || {},
          active: false,
        })
        .returning({ id: productVariants.id });

      createdVariants++;
      await persistCatalogExtensions(tx as typeof db, {
        row: action.row,
        productId,
        variantId: created.id,
        sourceSystem,
        sourceNamespace,
        branchId: branch?.id || null,
      });
      await tx.insert(externalProductMappings).values({
        sourceSystem,
        sourceNamespace,
        sourceId: action.row.sourceId,
        sourceType: 'VARIANT',
        sourceSku: action.row.rowJson.rawSku || null,
        sourceHash: action.row.rowJson.sourceHash,
        productId,
        variantId: created.id,
        importRunId: input.importRunId,
      });
      sourceMappings++;
      if (action.row.id) {
        await tx.update(catalogImportRows).set({ status: 'APPLIED' }).where(eq(catalogImportRows.id, action.row.id));
      }
    }

    await tx
      .update(catalogImportRuns)
      .set({ mode: 'APPLY', status: 'APPLIED', appliedAt: new Date() })
      .where(eq(catalogImportRuns.id, input.importRunId));
  });

  return { importRunId: input.importRunId, createdProducts, createdVariants, skippedRows, sourceMappings };
}
