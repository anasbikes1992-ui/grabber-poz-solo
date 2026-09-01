/**
 * Compare live Postgres columns to src/db/schema.ts expectations and add missing columns.
 */
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';

import { postgresClientOptions, resolveDirectDatabaseUrl } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const url = resolveDirectDatabaseUrl();
if (!url) {
  console.error('Database URL missing — set DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

/** Minimal type map for ADD COLUMN (safe defaults). */
const EXPECTED = {
  customers: {
    segment: `text DEFAULT 'NEW' NOT NULL`,
    credit_limit: `numeric(12,2) DEFAULT '0.00' NOT NULL`,
    active: `boolean DEFAULT true NOT NULL`,
    hashed_password: `text`,
  },
  suppliers: {
    tax_number: `text`,
    active: `boolean DEFAULT true NOT NULL`,
  },
  tax_profiles: {
    is_active: `boolean DEFAULT true NOT NULL`,
    created_at: `timestamptz DEFAULT now() NOT NULL`,
  },
  tax_rates: {
    rate_percentage: `numeric(7,4)`,
    effective_from: `timestamptz DEFAULT now() NOT NULL`,
    effective_to: `timestamptz`,
    created_at: `timestamptz DEFAULT now() NOT NULL`,
  },
  products: {
    slug: `text`,
    sale_price: `numeric(12,2) DEFAULT '0.00'`,
    cost_price: `numeric(12,2) DEFAULT '0.00'`,
    wholesale_price: `numeric(12,2)`,
    reorder_level: `integer DEFAULT 10 NOT NULL`,
    image_url: `text`,
    is_active: `boolean DEFAULT true NOT NULL`,
  },
  purchase_orders: {
    warehouse_id: `uuid`,
    total_amount: `numeric(12,2) DEFAULT '0.00'`,
    approved_by: `uuid`,
  },
  purchase_order_lines: {
    po_id: `uuid`,
    ordered_qty: `integer`,
    received_qty: `integer DEFAULT 0`,
    total_cost: `numeric(12,2)`,
  },
  users: {
    hashed_pin: `text`,
    updated_at: `timestamptz DEFAULT now()`,
  },
  stock_balances: {
    damaged: `integer DEFAULT 0 NOT NULL`,
  },
  supplier_accounts: {
    credit_terms_days: `integer DEFAULT 30 NOT NULL`,
  },
  journal_entries: {
    description: `text`,
    reference_type: `text`,
    reference_id: `text`,
  },
  journal_lines: {
    account_id: `uuid`,
  },
  webhook_events: {
    status: `text DEFAULT 'PROCESSED'`,
  },
};

const db = postgres(url, postgresClientOptions(url));

let added = 0;
let skipped = 0;

for (const [table, cols] of Object.entries(EXPECTED)) {
  const existing = await db`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  const have = new Set(existing.map((r) => r.column_name));

  for (const [col, ddl] of Object.entries(cols)) {
    if (have.has(col)) {
      skipped += 1;
      continue;
    }
    const stmt = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${ddl}`;
    try {
      await db.unsafe(stmt);
      console.log('ADDED', `${table}.${col}`);
      added += 1;
    } catch (e) {
      console.error('FAIL', table, col, e.message.split('\n')[0]);
    }
  }
}

// Backfills
const backfills = [
  `UPDATE users SET hashed_pin = pin_hash WHERE hashed_pin IS NULL AND pin_hash IS NOT NULL`,
  `UPDATE tax_rates SET rate_percentage = rate WHERE rate_percentage IS NULL AND rate IS NOT NULL`,
  `UPDATE tax_rates SET rate_percentage = 0 WHERE rate_percentage IS NULL`,
  `UPDATE products SET
      sale_price = COALESCE(NULLIF(sale_price, 0), base_price, 0),
      cost_price = COALESCE(NULLIF(cost_price, 0), base_cost, 0),
      is_active = COALESCE(is_active, active, true)
    WHERE true`,
  `UPDATE products SET slug = lower(regexp_replace(coalesce(sku, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
    WHERE slug IS NULL OR slug = ''`,
  `UPDATE purchase_orders SET warehouse_id = destination_warehouse_id WHERE warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL`,
  `UPDATE purchase_orders SET total_amount = total_cost WHERE (total_amount IS NULL OR total_amount = 0) AND total_cost IS NOT NULL`,
  `UPDATE purchase_order_lines SET po_id = purchase_order_id WHERE po_id IS NULL AND purchase_order_id IS NOT NULL`,
  `UPDATE purchase_order_lines SET ordered_qty = ordered_quantity WHERE ordered_qty IS NULL AND ordered_quantity IS NOT NULL`,
  `UPDATE purchase_order_lines SET received_qty = received_quantity WHERE received_qty IS NULL AND received_quantity IS NOT NULL`,
  `UPDATE purchase_order_lines SET total_cost = line_cost WHERE total_cost IS NULL AND line_cost IS NOT NULL`,
  `UPDATE customers SET segment = 'NEW' WHERE segment IS NULL`,
  `UPDATE customers SET credit_limit = '0.00' WHERE credit_limit IS NULL`,
  `UPDATE customers SET active = true WHERE active IS NULL`,
];

for (const stmt of backfills) {
  try {
    await db.unsafe(stmt);
    console.log('BACKFILL OK', stmt.slice(0, 60).replace(/\s+/g, ' '));
  } catch (e) {
    console.log('BACKFILL SKIP', e.message.split('\n')[0]);
  }
}

console.log(`\nSummary: added=${added} skipped=${skipped}`);
await db.end({ timeout: 2 });
