/**
 * Align legacy Grabber Business OS Postgres columns toward src/db/schema.ts
 * Prefer: npm run db:bootstrap (applies drizzle/migrations/0002_legacy_column_canonicalization.sql)
 */
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const db = postgres(process.env.DATABASE_URL || process.env.database_url, { max: 1, prepare: false, ssl: 'require' });

const stmts = [
  // tax_profiles legacy → schema isActive + timestamps
  `ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL`,
  `ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL`,

  // tax_rates legacy columns
  `ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS effective_from timestamptz DEFAULT now() NOT NULL`,
  `ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS effective_to timestamptz`,
  `ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL`,
  `ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS rate_percentage numeric(7,4)`,
  `UPDATE tax_rates SET rate_percentage = rate WHERE rate_percentage IS NULL AND rate IS NOT NULL`,
  `UPDATE tax_rates SET rate_percentage = 0 WHERE rate_percentage IS NULL`,

  // suppliers legacy payment_terms → schema tax_number + active
  `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number text`,
  `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true NOT NULL`,

  // purchase_orders legacy destination_warehouse_id/total_cost → schema warehouse_id/total_amount
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse_id uuid`,
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) DEFAULT '0.00'`,
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by uuid`,
  `UPDATE purchase_orders SET warehouse_id = destination_warehouse_id WHERE warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL`,
  `UPDATE purchase_orders SET total_amount = total_cost WHERE (total_amount IS NULL OR total_amount = 0) AND total_cost IS NOT NULL`,

  // purchase_order_lines legacy column names → schema po_id/ordered_qty/received_qty/total_cost
  `ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS po_id uuid`,
  `ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS ordered_qty integer`,
  `ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS received_qty integer DEFAULT 0`,
  `ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS total_cost numeric(12,2)`,
  `UPDATE purchase_order_lines SET po_id = purchase_order_id WHERE po_id IS NULL AND purchase_order_id IS NOT NULL`,
  `UPDATE purchase_order_lines SET ordered_qty = ordered_quantity WHERE ordered_qty IS NULL AND ordered_quantity IS NOT NULL`,
  `UPDATE purchase_order_lines SET received_qty = received_quantity WHERE received_qty IS NULL AND received_quantity IS NOT NULL`,
  `UPDATE purchase_order_lines SET total_cost = line_cost WHERE total_cost IS NULL AND line_cost IS NOT NULL`,

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

  // Bidirectional legacy ↔ schema column sync (insert/update)
  `CREATE OR REPLACE FUNCTION sync_purchase_order_legacy_columns()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.warehouse_id IS NOT NULL AND NEW.destination_warehouse_id IS NULL THEN
       NEW.destination_warehouse_id := NEW.warehouse_id;
     ELSIF NEW.destination_warehouse_id IS NOT NULL AND NEW.warehouse_id IS NULL THEN
       NEW.warehouse_id := NEW.destination_warehouse_id;
     END IF;
     IF NEW.total_amount IS NOT NULL AND (NEW.total_cost IS NULL OR NEW.total_cost = 0) THEN
       NEW.total_cost := NEW.total_amount;
     ELSIF NEW.total_cost IS NOT NULL AND (NEW.total_amount IS NULL OR NEW.total_amount = 0) THEN
       NEW.total_amount := NEW.total_cost;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_sync_purchase_order_legacy ON purchase_orders`,
  `CREATE TRIGGER trg_sync_purchase_order_legacy
     BEFORE INSERT OR UPDATE ON purchase_orders
     FOR EACH ROW EXECUTE FUNCTION sync_purchase_order_legacy_columns()`,

  `CREATE OR REPLACE FUNCTION sync_purchase_order_line_legacy_columns()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.po_id IS NOT NULL AND NEW.purchase_order_id IS NULL THEN
       NEW.purchase_order_id := NEW.po_id;
     ELSIF NEW.purchase_order_id IS NOT NULL AND NEW.po_id IS NULL THEN
       NEW.po_id := NEW.purchase_order_id;
     END IF;
     IF NEW.ordered_qty IS NOT NULL AND NEW.ordered_quantity IS NULL THEN
       NEW.ordered_quantity := NEW.ordered_qty;
     ELSIF NEW.ordered_quantity IS NOT NULL AND NEW.ordered_qty IS NULL THEN
       NEW.ordered_qty := NEW.ordered_quantity;
     END IF;
     IF NEW.received_qty IS NOT NULL AND NEW.received_quantity IS NULL THEN
       NEW.received_quantity := NEW.received_qty;
     ELSIF NEW.received_quantity IS NOT NULL AND NEW.received_qty IS NULL THEN
       NEW.received_qty := NEW.received_quantity;
     END IF;
     IF NEW.total_cost IS NOT NULL AND NEW.line_cost IS NULL THEN
       NEW.line_cost := NEW.total_cost;
     ELSIF NEW.line_cost IS NOT NULL AND NEW.total_cost IS NULL THEN
       NEW.total_cost := NEW.line_cost;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_sync_purchase_order_line_legacy ON purchase_order_lines`,
  `CREATE TRIGGER trg_sync_purchase_order_line_legacy
     BEFORE INSERT OR UPDATE ON purchase_order_lines
     FOR EACH ROW EXECUTE FUNCTION sync_purchase_order_line_legacy_columns()`,

  `CREATE OR REPLACE FUNCTION sync_tax_rate_legacy_columns()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.rate_percentage IS NOT NULL AND (NEW.rate IS NULL OR NEW.rate = 0) THEN
       NEW.rate := NEW.rate_percentage;
     ELSIF NEW.rate IS NOT NULL AND (NEW.rate_percentage IS NULL OR NEW.rate_percentage = 0) THEN
       NEW.rate_percentage := NEW.rate;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_sync_tax_rate_legacy ON tax_rates`,
  `CREATE TRIGGER trg_sync_tax_rate_legacy
     BEFORE INSERT OR UPDATE ON tax_rates
     FOR EACH ROW EXECUTE FUNCTION sync_tax_rate_legacy_columns()`,
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
