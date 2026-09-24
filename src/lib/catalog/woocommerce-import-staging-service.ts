import { persistCatalogStagingRun } from './catalog-import-staging-service';
import type { WooStagingResult } from './woocommerce-staging';

export type PersistWooStagingInput = {
  csv: string;
  sourceNamespace: string;
  fileName?: string;
  createdBy?: string | null;
};

export type PersistWooStagingResult = {
  importRunId: string;
  staged: WooStagingResult;
};

export async function persistWooCommerceStagingRun(
  input: PersistWooStagingInput,
): Promise<PersistWooStagingResult> {
  const result = await persistCatalogStagingRun({
    ...input,
    sourceSystem: 'woocommerce',
  });
  return { importRunId: result.importRunId, staged: result.staged as WooStagingResult };
}
