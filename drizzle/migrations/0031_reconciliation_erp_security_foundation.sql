CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date timestamptz NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'LKR',
  description text,
  bank_reference text,
  direction text NOT NULL DEFAULT 'CREDIT',
  status text NOT NULL DEFAULT 'UNMATCHED',
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_statement_lines_account_ref_idx
  ON bank_statement_lines(account_id, bank_reference)
  WHERE bank_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS bank_statement_lines_status_idx
  ON bank_statement_lines(status, statement_date);

CREATE TABLE IF NOT EXISTS bank_payment_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_line_id uuid NOT NULL REFERENCES bank_statement_lines(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'PROPOSED',
  confidence numeric(6,4) NOT NULL DEFAULT '0.0000',
  difference_amount numeric(12,2) NOT NULL DEFAULT '0.00',
  rule text NOT NULL DEFAULT 'MANUAL',
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bank_payment_matches_line_idx
  ON bank_payment_matches(statement_line_id);

CREATE INDEX IF NOT EXISTS bank_payment_matches_payment_idx
  ON bank_payment_matches(payment_id);

CREATE TABLE IF NOT EXISTS purchase_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  decision text NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_approval_events_po_idx
  ON purchase_approval_events(purchase_order_id, created_at);

CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_pos integer NOT NULL DEFAULT 0,
  on_time_rate numeric(6,4) NOT NULL DEFAULT '0.0000',
  fill_rate numeric(6,4) NOT NULL DEFAULT '0.0000',
  cost_variance_rate numeric(8,4) NOT NULL DEFAULT '0.0000',
  score numeric(6,2) NOT NULL DEFAULT '0.00',
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_scorecards_supplier_idx
  ON supplier_scorecards(supplier_id, period_end);

CREATE TABLE IF NOT EXISTS cost_variance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  expected_cost numeric(12,2) NOT NULL DEFAULT '0.00',
  actual_cost numeric(12,2) NOT NULL DEFAULT '0.00',
  variance_percent numeric(8,4) NOT NULL DEFAULT '0.0000',
  severity text NOT NULL DEFAULT 'INFO',
  status text NOT NULL DEFAULT 'OPEN',
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS cost_variance_alerts_status_idx
  ON cost_variance_alerts(status, severity, created_at);

CREATE TABLE IF NOT EXISTS forecast_accuracy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_run_id uuid REFERENCES forecast_runs(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  horizon_days integer NOT NULL DEFAULT 30,
  forecast_qty numeric(12,4) NOT NULL DEFAULT '0.0000',
  actual_qty numeric(12,4) NOT NULL DEFAULT '0.0000',
  wmape numeric(8,4) NOT NULL DEFAULT '0.0000',
  bias numeric(8,4) NOT NULL DEFAULT '0.0000',
  method text NOT NULL DEFAULT 'DETERMINISTIC_BASELINE',
  measured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forecast_accuracy_snapshots_run_idx
  ON forecast_accuracy_snapshots(forecast_run_id, measured_at);
