CREATE TABLE IF NOT EXISTS forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'COMPLETED',
  method text NOT NULL DEFAULT 'DETERMINISTIC_BASELINE',
  lookback_days integer NOT NULL DEFAULT 30,
  lead_time_days integer NOT NULL DEFAULT 7,
  service_level text NOT NULL DEFAULT 'MEDIUM',
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecast_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  avg_daily_demand numeric(12,4) NOT NULL DEFAULT '0.0000',
  demand_30d integer NOT NULL DEFAULT 0,
  on_hand integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  available integer NOT NULL DEFAULT 0,
  safety_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  suggested_order_qty integer NOT NULL DEFAULT 0,
  stockout_risk text NOT NULL DEFAULT 'LOW',
  classification text NOT NULL DEFAULT 'C-Z',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sku_classifications (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  abc_class text NOT NULL DEFAULT 'C',
  xyz_class text NOT NULL DEFAULT 'Z',
  velocity_score numeric(12,4) NOT NULL DEFAULT '0.0000',
  revenue_share numeric(12,4) NOT NULL DEFAULT '0.0000',
  demand_cv numeric(12,4) NOT NULL DEFAULT '0.0000',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replenishment_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_item_id uuid REFERENCES forecast_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT',
  suggested_order_qty integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE INDEX IF NOT EXISTS forecast_runs_created_idx ON forecast_runs(created_at);
CREATE INDEX IF NOT EXISTS forecast_items_run_idx ON forecast_items(run_id);
CREATE INDEX IF NOT EXISTS forecast_items_product_idx ON forecast_items(product_id);
CREATE INDEX IF NOT EXISTS forecast_items_risk_idx ON forecast_items(stockout_risk);
CREATE INDEX IF NOT EXISTS sku_classifications_abc_idx ON sku_classifications(abc_class);
CREATE INDEX IF NOT EXISTS replenishment_recommendations_product_idx ON replenishment_recommendations(product_id);
CREATE INDEX IF NOT EXISTS replenishment_recommendations_status_idx ON replenishment_recommendations(status);
