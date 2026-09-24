-- Catalog migration staging for WooCommerce, Shopify, and standard CSV sources.
-- Additive only: no existing products, variants, stock, orders, payments, or ledger rows are changed.

CREATE TABLE IF NOT EXISTS catalog_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_namespace text NOT NULL,
  source_file_hash text NOT NULL,
  file_name text,
  mode text NOT NULL DEFAULT 'DRY_RUN',
  status text NOT NULL DEFAULT 'STAGED',
  total_rows integer NOT NULL DEFAULT 0,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX IF NOT EXISTS catalog_import_runs_source_hash_idx
  ON catalog_import_runs(source_system, source_namespace, source_file_hash);
CREATE INDEX IF NOT EXISTS catalog_import_runs_created_idx
  ON catalog_import_runs(created_at);

CREATE TABLE IF NOT EXISTS catalog_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES catalog_import_runs(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  source_system text NOT NULL,
  source_namespace text NOT NULL,
  source_id text NOT NULL,
  source_hash text NOT NULL,
  row_type text NOT NULL,
  parent_source_id text,
  internal_sku text,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'STAGED',
  row_json jsonb NOT NULL,
  warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_import_rows_run_row_idx
  ON catalog_import_rows(import_run_id, row_index);
CREATE INDEX IF NOT EXISTS catalog_import_rows_source_idx
  ON catalog_import_rows(source_system, source_namespace, source_id);
CREATE INDEX IF NOT EXISTS catalog_import_rows_status_idx
  ON catalog_import_rows(status);

CREATE TABLE IF NOT EXISTS external_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_namespace text NOT NULL,
  source_id text NOT NULL,
  source_type text NOT NULL DEFAULT 'PRODUCT',
  source_sku text,
  source_hash text,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  import_run_id uuid REFERENCES catalog_import_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS external_product_mappings_source_unique_idx
  ON external_product_mappings(source_system, source_namespace, source_id);
CREATE INDEX IF NOT EXISTS external_product_mappings_product_idx
  ON external_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS external_product_mappings_variant_idx
  ON external_product_mappings(variant_id);
