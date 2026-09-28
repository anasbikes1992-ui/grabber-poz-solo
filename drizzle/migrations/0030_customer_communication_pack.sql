CREATE TABLE IF NOT EXISTS customer_metrics (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  lifetime_spend numeric(12,2) NOT NULL DEFAULT '0.00',
  order_count integer NOT NULL DEFAULT 0,
  last_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  last_order_at timestamptz,
  last_channel text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'WHATSAPP',
  status text NOT NULL DEFAULT 'PENDING',
  to_address text,
  message_preview text,
  idempotency_key text NOT NULL UNIQUE,
  provider_ref text,
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_metrics_last_order_idx
  ON customer_metrics(last_order_at);

CREATE INDEX IF NOT EXISTS customer_communication_events_customer_idx
  ON customer_communication_events(customer_id, created_at);

CREATE INDEX IF NOT EXISTS customer_communication_events_order_idx
  ON customer_communication_events(order_id, created_at);

CREATE INDEX IF NOT EXISTS customer_communication_events_status_idx
  ON customer_communication_events(status, created_at);
