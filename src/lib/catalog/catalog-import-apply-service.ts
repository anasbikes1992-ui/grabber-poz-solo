import { and, eq } from 'drizzle-orm';
import {
  catalogImportRows,
  catalogImportRuns,
  categories,
  db,
  externalProductMappings,
  productVariants,
  products,
  taxProfiles,
} from '@/db';
import {
  buildCatalogImportApplyPlan,
  type CatalogImportApplyRow,
} from './catalog-import-apply-plan';
import type { WooStagedRow } from './woocommerce-staging';

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

function rowPrice(row: WooStagedRow, fallback = 0): string {
  return Number(row.currentPrice ?? row.regularPrice ?? fallback).toFixed(2);
}

function rowCost(): string {
  return '0.00';
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
      rowJson: row.rowJson as unknown as WooStagedRow,
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
          barcode: null,
          costPrice: rowCost(),
          salePrice: rowPrice(action.row.rowJson),
          imageUrl: action.row.rowJson.images[0] || null,
          description: action.row.rowJson.description || action.row.rowJson.shortDescription || null,
          taxProfileId: tax?.id || null,
          categoryId,
          isActive: false,
          itemType: 'PHYSICAL',
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
          barcode: null,
          costPrice: rowCost(),
          salePrice: rowPrice(action.row.rowJson),
          attributesJson: action.row.rowJson.attributes || {},
          active: false,
        })
        .returning({ id: productVariants.id });

      createdVariants++;
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
