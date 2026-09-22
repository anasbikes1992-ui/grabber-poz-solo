-- Wave G: pay wages, PAYE stub, rental deposit GL, pharmacy controlled log, email templates

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS nic_number text,
  ADD COLUMN IF NOT EXISTS epf_number text,
  ADD COLUMN IF NOT EXISTS etf_number text,
  ADD COLUMN IF NOT EXISTS paye_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS total_paye numeric(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS wages_journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS statutory_journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wages_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS statutory_paid_at timestamptz;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS paye_amount numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE prescription_lines
  ADD COLUMN IF NOT EXISTS controlled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispensed_lot_id uuid REFERENCES stock_lots(id) ON DELETE SET NULL;

ALTER TABLE rental_deposits
  ADD COLUMN IF NOT EXISTS hold_journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS controlled_drug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  prescription_line_id uuid REFERENCES prescription_lines(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  lot_id uuid REFERENCES stock_lots(id) ON DELETE SET NULL,
  customer_name text,
  pharmacist_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS controlled_drug_logs_rx_idx ON controlled_drug_logs(prescription_id);
CREATE INDEX IF NOT EXISTS controlled_drug_logs_created_idx ON controlled_drug_logs(created_at);

INSERT INTO chart_of_accounts (code, name, type, active)
VALUES
  ('2160', 'PAYE / APIT Payable', 'LIABILITY', true),
  ('2320', 'Customer Deposits (Rental)', 'LIABILITY', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO email_templates (template_key, subject, body_html, body_text)
VALUES
  (
    'payslip',
    'Payslip — {{period}}',
    '<p>Hi {{name}},</p><p>Your payslip for <strong>{{period}}</strong> is ready.</p><p>Gross: LKR {{gross}}<br/>Net: LKR {{net}}</p>',
    'Hi {{name}}, payslip for {{period}}. Gross LKR {{gross}}. Net LKR {{net}}.'
  ),
  (
    'leave_decision',
    'Leave {{status}}',
    '<p>Your leave request was <strong>{{status}}</strong>.</p>',
    'Your leave request was {{status}}.'
  )
ON CONFLICT (template_key) DO NOTHING;
