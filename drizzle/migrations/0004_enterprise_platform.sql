-- 0004: Stock ledger hardening + enterprise platform tables

ALTER TYPE stock_movement_type_enum ADD VALUE IF NOT EXISTS 'REPAIR_PARTS_ISSUE';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS terminal_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_sequence integer;

ALTER TABLE order_returns ADD COLUMN IF NOT EXISTS grading_status text;

ALTER TABLE hire_purchase_contracts ADD COLUMN IF NOT EXISTS late_fee_accrued numeric(12,2) NOT NULL DEFAULT '0.00';

DO $$ BEGIN
  CREATE TYPE job_outbox_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS job_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  idempotency_key text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}',
  status job_outbox_status_enum NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS job_outbox_type_key_idx ON job_outbox (type, idempotency_key);
CREATE INDEX IF NOT EXISTS job_outbox_status_sched_idx ON job_outbox (status, scheduled_at);

CREATE TABLE IF NOT EXISTS serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'IN_STOCK',
  location_type location_type_enum,
  location_id uuid,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  warranty_expires timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS serial_numbers_product_idx ON serial_numbers (product_id);

CREATE TABLE IF NOT EXISTS stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  location_type location_type_enum NOT NULL,
  location_id uuid NOT NULL,
  qty_on_hand integer NOT NULL DEFAULT 0,
  expiry_date timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_lots_batch_loc_idx ON stock_lots (location_id, product_id);
CREATE INDEX IF NOT EXISTS stock_lots_expiry_idx ON stock_lots (expiry_date);

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(12,4) NOT NULL,
  unit text NOT NULL DEFAULT 'ea'
);

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'DRAFT',
  lines_json jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT '0.00',
  expires_at timestamptz,
  reservation_expires_at timestamptz,
  converted_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotations_status_idx ON quotations (status);

CREATE OR REPLACE FUNCTION prevent_stock_movement_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'stock_movements are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_movements_immutable ON stock_movements;
CREATE TRIGGER stock_movements_immutable
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();
