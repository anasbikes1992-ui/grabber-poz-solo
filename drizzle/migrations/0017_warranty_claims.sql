CREATE TABLE IF NOT EXISTS warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE,
  serial_id uuid NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_phone text,
  issue_description text NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED',
  resolution text,
  repair_job_id uuid REFERENCES repair_jobs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS warranty_claims_serial_idx ON warranty_claims(serial_id);
CREATE INDEX IF NOT EXISTS warranty_claims_status_idx ON warranty_claims(status);