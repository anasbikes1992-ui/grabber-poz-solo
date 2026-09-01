import { chartOfAccounts } from '@/db/schema';

/** Canonical COA codes required for POS checkout, returns, and GRN posting. */
export const REQUIRED_COA = [
  { code: '1010', name: 'Cash on Hand', type: 'ASSET' as const },
  { code: '1020', name: 'Bank Account', type: 'ASSET' as const },
  { code: '1090', name: 'Sales Clearing Account', type: 'ASSET' as const },
  { code: '1100', name: 'Accounts Receivable (Polim Potha)', type: 'ASSET' as const },
  { code: '1200', name: 'Merchandise Inventory', type: 'ASSET' as const },
  { code: '2000', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY' as const },
  { code: '2100', name: 'VAT Payable', type: 'LIABILITY' as const },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' as const },
  { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE' as const },
];

export type CoaDb = {
  insert: (table: typeof chartOfAccounts) => {
    values: (row: (typeof REQUIRED_COA)[number]) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
};

/** Idempotent — safe to call before every checkout if seed was skipped. */
export async function ensureDefaultChartOfAccounts(dbOrTx: CoaDb) {
  for (const row of REQUIRED_COA) {
    await dbOrTx.insert(chartOfAccounts).values(row).onConflictDoNothing();
  }
}
