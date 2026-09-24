import type { WooStagedRow } from './woocommerce-staging';

export type CatalogImportApplyRow = {
  id?: string;
  sourceSystem: string;
  sourceNamespace: string;
  sourceId: string;
  rowType: string;
  parentSourceId?: string | null;
  internalSku?: string | null;
  title: string;
  rowJson: WooStagedRow;
  warningsJson?: string[];
};

export type ExistingExternalMapping = {
  sourceId: string;
  productId: string | null;
  variantId: string | null;
};

export type CatalogImportApplyAction =
  | { type: 'skip_mapped'; row: CatalogImportApplyRow; reason: string }
  | { type: 'conflict_sku'; row: CatalogImportApplyRow; sku: string; reason: string }
  | { type: 'create_product'; row: CatalogImportApplyRow; productKind: 'simple' | 'variable_parent' }
  | { type: 'create_variant'; row: CatalogImportApplyRow; parentSourceId: string }
  | { type: 'wait_for_parent'; row: CatalogImportApplyRow; parentSourceId: string; reason: string };

export type CatalogImportApplyPlan = {
  actions: CatalogImportApplyAction[];
  createCount: number;
  skipCount: number;
  conflictCount: number;
};

function rowSku(row: CatalogImportApplyRow): string {
  return (row.internalSku || row.rowJson.internalSku || row.rowJson.rawSku || '').trim();
}

export function buildCatalogImportApplyPlan({
  rows,
  existingMappings,
  existingSkus,
}: {
  rows: CatalogImportApplyRow[];
  existingMappings: ExistingExternalMapping[];
  existingSkus: Set<string>;
}): CatalogImportApplyPlan {
  const mappedSourceIds = new Set(existingMappings.map((mapping) => mapping.sourceId));
  const sourceIdsInBatch = new Set(rows.map((row) => row.sourceId));
  const batchParentIds = new Set(
    rows.filter((row) => row.rowType === 'variable').map((row) => row.sourceId),
  );
  const actions: CatalogImportApplyAction[] = [];

  for (const row of rows) {
    if (mappedSourceIds.has(row.sourceId)) {
      actions.push({ type: 'skip_mapped', row, reason: 'Source row already has an external mapping.' });
      continue;
    }

    const sku = rowSku(row);
    if (sku && existingSkus.has(sku.toUpperCase())) {
      actions.push({ type: 'conflict_sku', row, sku, reason: 'Internal SKU already exists without source mapping.' });
      continue;
    }

    if (row.rowType === 'variation') {
      const parentSourceId = row.parentSourceId || row.rowJson.parentRaw;
      if (!parentSourceId) {
        actions.push({ type: 'wait_for_parent', row, parentSourceId: '', reason: 'Variation has no parent source identity.' });
        continue;
      }
      const parentMapped = mappedSourceIds.has(parentSourceId);
      const parentInBatch = sourceIdsInBatch.has(parentSourceId) || batchParentIds.has(parentSourceId);
      if (!parentMapped && !parentInBatch) {
        actions.push({
          type: 'wait_for_parent',
          row,
          parentSourceId,
          reason: 'Variation parent is not approved in this batch and has no existing mapping.',
        });
        continue;
      }
      actions.push({ type: 'create_variant', row, parentSourceId });
      continue;
    }

    actions.push({
      type: 'create_product',
      row,
      productKind: row.rowType === 'variable' ? 'variable_parent' : 'simple',
    });
  }

  return {
    actions,
    createCount: actions.filter((action) => action.type === 'create_product' || action.type === 'create_variant').length,
    skipCount: actions.filter((action) => action.type === 'skip_mapped' || action.type === 'wait_for_parent').length,
    conflictCount: actions.filter((action) => action.type === 'conflict_sku').length,
  };
}
