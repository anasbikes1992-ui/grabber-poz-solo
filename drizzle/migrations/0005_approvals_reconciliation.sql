-- 0005: Approvals table, stock FK hardening, reconciliation view

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  tool_name text NOT NULL,
  description text NOT NULL,
  risk text NOT NULL DEFAULT 'DRAFT',
  payload_json jsonb NOT NULL DEFAULT '{}',
  requested_by text NOT NULL,
  role text NOT NULL DEFAULT 'OWNER',
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolved_by text
);

CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals (status, created_at DESC);

-- Reconciliation view: physical movement sum vs on_hand
CREATE OR REPLACE VIEW stock_ledger_reconciliation AS
SELECT
  sb.location_type,
  sb.location_id,
  sb.product_id,
  sb.variant_id,
  sb.on_hand,
  COALESCE(SUM(sm.delta) FILTER (
    WHERE sm.type NOT IN ('RESERVATION', 'RELEASE')
  ), 0)::int AS ledger_sum,
  sb.on_hand - COALESCE(SUM(sm.delta) FILTER (
    WHERE sm.type NOT IN ('RESERVATION', 'RELEASE')
  ), 0)::int AS drift
FROM stock_balances sb
LEFT JOIN stock_movements sm ON
  sm.location_id = sb.location_id
  AND sm.product_id = sb.product_id
  AND (
    (sm.variant_id IS NULL AND sb.variant_id IS NULL)
    OR sm.variant_id = sb.variant_id
  )
GROUP BY sb.id, sb.location_type, sb.location_id, sb.product_id, sb.variant_id, sb.on_hand;
