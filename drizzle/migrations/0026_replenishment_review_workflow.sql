ALTER TABLE replenishment_recommendations
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS replenishment_recommendations_supplier_idx ON replenishment_recommendations(supplier_id);
CREATE INDEX IF NOT EXISTS replenishment_recommendations_warehouse_idx ON replenishment_recommendations(target_warehouse_id);
CREATE INDEX IF NOT EXISTS replenishment_recommendations_po_idx ON replenishment_recommendations(approved_po_id);
