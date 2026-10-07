CREATE TABLE IF NOT EXISTS delivery_riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  whatsapp_phone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  home_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  vehicle_type text,
  notes text,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_riders_active_idx
  ON delivery_riders(active);

CREATE INDEX IF NOT EXISTS delivery_riders_home_branch_idx
  ON delivery_riders(home_branch_id);

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rider_id uuid;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS assignment_mode text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rider_notification_status text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rider_notification_message_id text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rider_notified_at timestamptz;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS assignment_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_rider_id_fk'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT deliveries_rider_id_fk
      FOREIGN KEY (rider_id) REFERENCES delivery_riders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS deliveries_order_idx
  ON deliveries(order_id);

CREATE INDEX IF NOT EXISTS deliveries_rider_idx
  ON deliveries(rider_id);

CREATE INDEX IF NOT EXISTS deliveries_status_idx
  ON deliveries(status);

CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'INFO',
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_events_delivery_idx
  ON delivery_events(delivery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_events_order_idx
  ON delivery_events(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_events_type_idx
  ON delivery_events(event_type);
