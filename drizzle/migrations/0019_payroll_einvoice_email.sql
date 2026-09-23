-- Wave F: EPF/ETF payroll columns, e-invoice submissions, email logs, payroll CoA helpers

ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_employee_epf numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_employer_epf numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_etf numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_net numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS employee_epf numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS employer_epf numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS etf_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_amount numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS basic_salary numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS epf_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS etf_eligible boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS einvoice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  document_type text NOT NULL DEFAULT 'TAX_INVOICE',
  status text NOT NULL DEFAULT 'DRAFT',
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_ref text,
  error_message text,
  submitted_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS einvoice_submissions_order_idx ON einvoice_submissions(order_id);
CREATE INDEX IF NOT EXISTS einvoice_submissions_status_idx ON einvoice_submissions(status);

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text NOT NULL DEFAULT 'QUEUED',
  provider text,
  provider_message_id text,
  error_message text,
  related_type text,
  related_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON email_logs(status);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON email_logs(created_at);

INSERT INTO chart_of_accounts (code, name, type, active)
VALUES
  ('2150', 'Net Wages Payable', 'LIABILITY', true),
  ('2200', 'EPF Payable', 'LIABILITY', true),
  ('2210', 'ETF Payable', 'LIABILITY', true),
  ('5100', 'Salaries & Wages Expense', 'EXPENSE', true),
  ('5110', 'Employer Statutory Contributions', 'EXPENSE', true)
ON CONFLICT (code) DO NOTHING;
