CREATE TABLE IF NOT EXISTS fulfillment_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  work_type text NOT NULL,
  status text NOT NULL DEFAULT 'READY',
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_work_items_order_idx
  ON fulfillment_work_items(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS fulfillment_work_items_type_status_idx
  ON fulfillment_work_items(work_type, status);

CREATE TABLE IF NOT EXISTS barcode_label_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'QUEUED',
  detail_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barcode_label_queue_source_idx
  ON barcode_label_queue(source_type, source_id);

CREATE INDEX IF NOT EXISTS barcode_label_queue_status_idx
  ON barcode_label_queue(status);
