-- 0003_pass2_returns_damages.sql
-- Idempotent DDL for Pass 2 relational domain engines: order_return_lines & damages

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS order_return_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES order_returns(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  unit_discount numeric(12, 2) NOT NULL DEFAULT '0.00',
  unit_tax numeric(12, 2) NOT NULL DEFAULT '0.00',
  unit_refund numeric(12, 2) NOT NULL DEFAULT '0.00',
  unit_cost numeric(12, 2) NOT NULL DEFAULT '0.00',
  grading_status text NOT NULL DEFAULT 'RESTOCKABLE',
  restocked_location_type location_type_enum,
  restocked_location_id uuid,
  serial_number text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS order_return_lines_ret_idx ON order_return_lines(return_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS order_return_lines_item_idx ON order_return_lines(order_item_id);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_number text NOT NULL UNIQUE,
  location_type location_type_enum NOT NULL,
  location_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_cost numeric(12, 2) NOT NULL DEFAULT '0.00',
  total_loss numeric(12, 2) NOT NULL DEFAULT '0.00',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'APPROVED',
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  reported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS damages_loc_prod_idx ON damages(location_id, product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS damages_created_idx ON damages(created_at);

--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title text;
--> statement-breakpoint
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description text;

--> statement-breakpoint
ALTER TABLE serial_numbers ADD COLUMN IF NOT EXISTS product_name text;
--> statement-breakpoint
ALTER TABLE serial_numbers ADD COLUMN IF NOT EXISTS customer_name text;
--> statement-breakpoint
ALTER TABLE serial_numbers ADD COLUMN IF NOT EXISTS customer_phone text;
--> statement-breakpoint
ALTER TABLE serial_numbers ADD COLUMN IF NOT EXISTS notes text;
--> statement-breakpoint
ALTER TABLE serial_numbers ADD COLUMN IF NOT EXISTS registered_by uuid;
