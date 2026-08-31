/**
 * Align legacy Grabber Business OS Postgres columns toward src/db/schema.ts
 */
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'require' });

const stmts = [
  // users
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_pin text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`,
  `UPDATE users SET hashed_pin = pin_hash WHERE hashed_pin IS NULL AND pin_hash IS NOT NULL`,

  // customers
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS hashed_password text`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT '0.00'`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true`,

  // stock_balances
  `ALTER TABLE stock_balances ADD COLUMN IF NOT EXISTS damaged integer DEFAULT 0 NOT NULL`,

  // journal_entries (legacy source_* → schema reference_*/description)
  `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reference_type text`,
  `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reference_id text`,
  `UPDATE journal_entries SET description = COALESCE(description, memo, 'Journal') WHERE description IS NULL`,
  `ALTER TABLE journal_entries ALTER COLUMN source_type DROP NOT NULL`,
  `ALTER TABLE journal_entries ALTER COLUMN source_type SET DEFAULT 'MANUAL'`,

  // journal_lines
  `ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS account_id uuid`,
  `UPDATE journal_lines jl SET account_id = coa.id
     FROM chart_of_accounts coa
     WHERE jl.account_id IS NULL AND jl.account_code IS NOT NULL AND coa.code = jl.account_code`,
  `ALTER TABLE journal_lines ALTER COLUMN account_code DROP NOT NULL`,

  // supplier_accounts
  `ALTER TABLE supplier_accounts ADD COLUMN IF NOT EXISTS credit_terms_days integer DEFAULT 30 NOT NULL`,

  // webhook_events (legacy processed → schema status)
  `ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'PROCESSED'`,
  `UPDATE webhook_events SET status = CASE WHEN processed THEN 'PROCESSED' ELSE 'PENDING' END WHERE status IS NULL`,

  // products (legacy base_price/base_cost/active → sale_price/cost_price/is_active + slug)
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(12,2) DEFAULT '0.00'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) DEFAULT '0.00'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2)`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10 NOT NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL`,
  `UPDATE products SET
      sale_price = COALESCE(NULLIF(sale_price, 0), base_price, 0),
      cost_price = COALESCE(NULLIF(cost_price, 0), base_cost, 0),
      is_active = COALESCE(is_active, active, true)
    WHERE true`,
  `UPDATE products SET slug = lower(regexp_replace(coalesce(sku, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
    WHERE slug IS NULL OR slug = ''`,
  `ALTER TABLE products ALTER COLUMN base_price SET DEFAULT 0`,
  `ALTER TABLE products ALTER COLUMN base_cost SET DEFAULT 0`,
  `UPDATE products SET base_price = COALESCE(base_price, sale_price, 0), base_cost = COALESCE(base_cost, cost_price, 0)`,
];

for (const stmt of stmts) {
  try {
    await db.unsafe(stmt);
    console.log('OK', stmt.replace(/\s+/g, ' ').slice(0, 100));
  } catch (e) {
    console.log('FAIL', e.message.split('\n')[0], '::', stmt.replace(/\s+/g, ' ').slice(0, 80));
  }
}

try {
  await db.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx ON products (slug)`);
  console.log('OK unique slug index');
} catch (e) {
  console.log('SKIP slug index', e.message.split('\n')[0]);
}

const n = await db`select count(*)::int as n from products`;
console.log('products rows', n[0].n);
await db.end({ timeout: 2 });
