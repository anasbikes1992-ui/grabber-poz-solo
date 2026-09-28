CREATE TABLE IF NOT EXISTS order_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  idempotency_key text,
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_automation_events_order_idx
  ON order_automation_events(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS order_automation_events_status_idx
  ON order_automation_events(status);

CREATE UNIQUE INDEX IF NOT EXISTS order_automation_events_idempotency_idx
  ON order_automation_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
