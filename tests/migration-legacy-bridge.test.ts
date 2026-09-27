import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('legacy migration bridge', () => {
  it('declares legacy alias columns before trigger functions reference them', () => {
    const sql = read('drizzle/migrations/0002_legacy_column_canonicalization.sql');
    const triggerStart = sql.indexOf('CREATE OR REPLACE FUNCTION sync_purchase_order_legacy_columns');

    expect(triggerStart).toBeGreaterThan(0);
    for (const column of [
      'tax_rates ADD COLUMN IF NOT EXISTS rate ',
      'purchase_orders ADD COLUMN IF NOT EXISTS destination_warehouse_id ',
      'purchase_orders ADD COLUMN IF NOT EXISTS total_cost ',
      'purchase_order_lines ADD COLUMN IF NOT EXISTS purchase_order_id ',
      'purchase_order_lines ADD COLUMN IF NOT EXISTS ordered_quantity ',
      'purchase_order_lines ADD COLUMN IF NOT EXISTS received_quantity ',
      'purchase_order_lines ADD COLUMN IF NOT EXISTS line_cost ',
    ]) {
      expect(sql.indexOf(column), column).toBeGreaterThan(-1);
      expect(sql.indexOf(column), column).toBeLessThan(triggerStart);
    }
  });
});
