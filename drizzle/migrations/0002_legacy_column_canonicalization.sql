-- 0002_legacy_column_canonicalization.sql
-- Idempotent bridge from legacy Supabase column names → src/db/schema.ts
-- Safe on fresh DBs (IF NOT EXISTS) and existing production DBs (backfill + triggers)
--> statement-breakpoint
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS effective_from timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS effective_to timestamptz;
--> statement-breakpoint
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE tax_rates ADD COLUMN IF NOT EXISTS rate_percentage numeric(7,4);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tax_rates' AND column_name = 'rate'
  ) THEN
    UPDATE tax_rates SET rate_percentage = rate WHERE rate_percentage IS NULL AND rate IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
UPDATE tax_rates SET rate_percentage = 0 WHERE rate_percentage IS NULL;
--> statement-breakpoint
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number text;
--> statement-breakpoint
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS warehouse_id uuid;
--> statement-breakpoint
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'destination_warehouse_id'
  ) THEN
    UPDATE purchase_orders SET warehouse_id = destination_warehouse_id
    WHERE warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'total_cost'
  ) THEN
    UPDATE purchase_orders SET total_amount = total_cost
    WHERE (total_amount IS NULL OR total_amount = 0) AND total_cost IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS po_id uuid;
--> statement-breakpoint
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS ordered_qty integer;
--> statement-breakpoint
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS received_qty integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS total_cost numeric(12,2);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_lines' AND column_name = 'purchase_order_id'
  ) THEN
    UPDATE purchase_order_lines SET po_id = purchase_order_id
    WHERE po_id IS NULL AND purchase_order_id IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_lines' AND column_name = 'ordered_quantity'
  ) THEN
    UPDATE purchase_order_lines SET ordered_qty = ordered_quantity
    WHERE ordered_qty IS NULL AND ordered_quantity IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_lines' AND column_name = 'received_quantity'
  ) THEN
    UPDATE purchase_order_lines SET received_qty = received_quantity
    WHERE received_qty IS NULL AND received_quantity IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'purchase_order_lines' AND column_name = 'line_cost'
  ) THEN
    UPDATE purchase_order_lines SET total_cost = line_cost
    WHERE total_cost IS NULL AND line_cost IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_pin text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'pin_hash'
  ) THEN
    UPDATE users SET hashed_pin = pin_hash WHERE hashed_pin IS NULL AND pin_hash IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hashed_password text;
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment text DEFAULT 'NEW' NOT NULL;
--> statement-breakpoint
UPDATE customers SET segment = 'NEW' WHERE segment IS NULL;
--> statement-breakpoint
ALTER TABLE stock_balances ADD COLUMN IF NOT EXISTS damaged integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS description text;
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reference_type text;
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS reference_id text;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'memo'
  ) THEN
    UPDATE journal_entries SET description = COALESCE(description, memo, 'Journal') WHERE description IS NULL;
  ELSE
    UPDATE journal_entries SET description = COALESCE(description, 'Journal') WHERE description IS NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS account_id uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'account_code'
  ) THEN
    UPDATE journal_lines jl SET account_id = coa.id
      FROM chart_of_accounts coa
      WHERE jl.account_id IS NULL AND jl.account_code IS NOT NULL AND coa.code = jl.account_code;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE supplier_accounts ADD COLUMN IF NOT EXISTS credit_terms_days integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS status text DEFAULT 'PROCESSED';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'webhook_events' AND column_name = 'processed'
  ) THEN
    UPDATE webhook_events SET status = CASE WHEN processed THEN 'PROCESSED' ELSE 'PENDING' END WHERE status IS NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(12,2) DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2);
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10 NOT NULL;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'base_price'
  ) THEN
    UPDATE products SET sale_price = COALESCE(NULLIF(sale_price, 0), base_price, 0) WHERE true;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'base_cost'
  ) THEN
    UPDATE products SET cost_price = COALESCE(NULLIF(cost_price, 0), base_cost, 0) WHERE true;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'active'
  ) THEN
    UPDATE products SET is_active = COALESCE(is_active, active, true) WHERE true;
  END IF;
END $$;
--> statement-breakpoint
UPDATE products SET slug = lower(regexp_replace(coalesce(sku, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx ON products (slug);
--> statement-breakpoint
-- shifts: resolve drizzle-kit push prompt (cashier_id vs opened_by)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cashier_id uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'opened_by'
  ) THEN
    UPDATE shifts SET cashier_id = opened_by WHERE cashier_id IS NULL AND opened_by IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
-- Legacy ↔ schema sync triggers (temporary bridge until legacy columns dropped)
CREATE OR REPLACE FUNCTION sync_purchase_order_legacy_columns()
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
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sync_purchase_order_legacy ON purchase_orders;
--> statement-breakpoint
CREATE TRIGGER trg_sync_purchase_order_legacy
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION sync_purchase_order_legacy_columns();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sync_purchase_order_line_legacy_columns()
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
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sync_purchase_order_line_legacy ON purchase_order_lines;
--> statement-breakpoint
CREATE TRIGGER trg_sync_purchase_order_line_legacy
  BEFORE INSERT OR UPDATE ON purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION sync_purchase_order_line_legacy_columns();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sync_tax_rate_legacy_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rate_percentage IS NOT NULL AND (NEW.rate IS NULL OR NEW.rate = 0) THEN
    NEW.rate := NEW.rate_percentage;
  ELSIF NEW.rate IS NOT NULL AND (NEW.rate_percentage IS NULL OR NEW.rate_percentage = 0) THEN
    NEW.rate_percentage := NEW.rate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_sync_tax_rate_legacy ON tax_rates;
--> statement-breakpoint
CREATE TRIGGER trg_sync_tax_rate_legacy
  BEFORE INSERT OR UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION sync_tax_rate_legacy_columns();
