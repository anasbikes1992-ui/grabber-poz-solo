CREATE TABLE IF NOT EXISTS product_import_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  source_system text NOT NULL,
  source_namespace text NOT NULL,
  source_id text NOT NULL,
  brand_name text,
  tags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  warranty_months integer,
  max_discount_amount numeric(12,2),
  single_discount boolean,
  discount_percent numeric(7,4),
  weight_value numeric(12,4),
  weight_unit text,
  length_cm numeric(12,4),
  width_cm numeric(12,4),
  height_cm numeric(12,4),
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_import_metadata_source_idx
  ON product_import_metadata(source_system, source_namespace, source_id, variant_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS product_import_metadata_product_idx ON product_import_metadata(product_id);
CREATE INDEX IF NOT EXISTS product_import_metadata_variant_idx ON product_import_metadata(variant_id);
CREATE INDEX IF NOT EXISTS product_import_metadata_brand_idx ON product_import_metadata(brand_name);

CREATE TABLE IF NOT EXISTS product_media_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  alt_text text,
  source_system text NOT NULL DEFAULT 'catalog_import',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_media_links_product_idx ON product_media_links(product_id);
CREATE INDEX IF NOT EXISTS product_media_links_variant_idx ON product_media_links(variant_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_media_links_product_url_idx
  ON product_media_links(product_id, variant_id, source_url) NULLS NOT DISTINCT;

CREATE TABLE IF NOT EXISTS product_supplier_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  last_cost numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_supplier_preferences_product_idx ON product_supplier_preferences(product_id);
CREATE INDEX IF NOT EXISTS product_supplier_preferences_supplier_idx ON product_supplier_preferences(supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_supplier_preferences_unique_idx
  ON product_supplier_preferences(product_id, variant_id, supplier_name) NULLS NOT DISTINCT;
