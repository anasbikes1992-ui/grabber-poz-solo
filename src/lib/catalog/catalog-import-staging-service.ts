import { db, catalogImportRows, catalogImportRuns } from '@/db';
import {
  stageCatalogImport,
  type CatalogImportSourceSystem,
  type CatalogStagingResult,
} from './catalog-import-staging';

export type PersistCatalogStagingInput = {
  csv: string;
  sourceSystem: CatalogImportSourceSystem;
  sourceNamespace: string;
  fileName?: string;
  createdBy?: string | null;
};

export type PersistCatalogStagingResult = {
  importRunId: string;
  staged: CatalogStagingResult;
};

function parentSourceIdByChild(staged: CatalogStagingResult): Map<string, string> {
  const map = new Map<string, string>();
  for (const family of staged.families) {
    for (const child of family.children) {
      map.set(child.sourceId, family.parent.sourceId);
    }
  }
  return map;
}

export async function persistCatalogStagingRun(
  input: PersistCatalogStagingInput,
): Promise<PersistCatalogStagingResult> {
  const staged = stageCatalogImport(input.csv, input.sourceSystem);
  const parentMap = parentSourceIdByChild(staged);

  const importRunId = await db.transaction(async (tx) => {
    const [run] = await tx
      .insert(catalogImportRuns)
      .values({
        sourceSystem: input.sourceSystem,
        sourceNamespace: input.sourceNamespace,
        sourceFileHash: staged.summary.sourceFileHash,
        fileName: input.fileName || null,
        mode: 'DRY_RUN',
        status: 'STAGED',
        totalRows: staged.summary.totalRows,
        summaryJson: staged.summary,
        createdBy: input.createdBy || null,
      })
      .returning({ id: catalogImportRuns.id });

    if (staged.rows.length > 0) {
      await tx.insert(catalogImportRows).values(
        staged.rows.map((row) => ({
          importRunId: run.id,
          rowIndex: row.rowIndex,
          sourceSystem: input.sourceSystem,
          sourceNamespace: input.sourceNamespace,
          sourceId: row.sourceId,
          sourceHash: row.sourceHash,
          rowType: row.type,
          parentSourceId: parentMap.get(row.sourceId) || null,
          internalSku: row.internalSku,
          title: row.title,
          status: row.warnings.length > 0 ? 'WARNING' : 'STAGED',
          rowJson: row,
          warningsJson: row.warnings,
          decisionJson: {},
        })),
      );
    }

    return run.id;
  });

  return { importRunId, staged };
}
