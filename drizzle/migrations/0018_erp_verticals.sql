-- Wave E: Pharmacy, Rental, Auto-parts, AP invoices, Bank recon, HR foundation

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  doctor_name text,
  status text NOT NULL DEFAULT 'DRAFT',
  pharmacist_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_status_idx ON prescriptions(status);

CREATE TABLE IF NOT EXISTS prescription_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  dosage_text text,
  lot_preference text
);
CREATE INDEX IF NOT EXISTS prescription_lines_rx_idx ON prescription_lines(prescription_id);

CREATE TABLE IF NOT EXISTS pharmacist_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  approver_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  decision text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pharmacist_approvals_rx_idx ON pharmacist_approvals(prescription_id);

CREATE TABLE IF NOT EXISTS rental_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'AVAILABLE',
  deposit_default numeric(12,2) NOT NULL DEFAULT 0.00,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0.00,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_assets_status_idx ON rental_assets(status);

CREATE TABLE IF NOT EXISTS rental_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  asset_id uuid NOT NULL REFERENCES rental_assets(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  rate_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'DRAFT',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_contracts_status_idx ON rental_contracts(status);
CREATE INDEX IF NOT EXISTS rental_contracts_asset_idx ON rental_contracts(asset_id);

CREATE TABLE IF NOT EXISTS rental_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS rental_periods_contract_idx ON rental_periods(contract_id);

CREATE TABLE IF NOT EXISTS rental_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'HELD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_deposits_contract_idx ON rental_deposits(contract_id);

CREATE TABLE IF NOT EXISTS vehicle_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (make_id, name)
);

CREATE TABLE IF NOT EXISTS vehicle_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  year_from integer,
  year_to integer,
  engine text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_generations_model_idx ON vehicle_generations(model_id);

CREATE TABLE IF NOT EXISTS vehicle_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES vehicle_generations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  oem_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (generation_id, product_id, variant_id)
);
CREATE INDEX IF NOT EXISTS vehicle_compatibility_product_idx ON vehicle_compatibility(product_id);

CREATE TABLE IF NOT EXISTS ap_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  subtotal numeric(12,2) NOT NULL DEFAULT 0.00,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  total_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  supplier_entry_id uuid REFERENCES supplier_entries(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS ap_invoices_supplier_idx ON ap_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS ap_invoices_status_idx ON ap_invoices(status);

CREATE TABLE IF NOT EXISTS ap_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES ap_invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method text NOT NULL DEFAULT 'BANK',
  paid_at timestamptz NOT NULL DEFAULT now(),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  supplier_entry_id uuid REFERENCES supplier_entries(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ap_payments_invoice_idx ON ap_payments(invoice_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  account_number_masked text,
  currency text NOT NULL DEFAULT 'LKR',
  gl_account_code text NOT NULL DEFAULT '1010',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date timestamptz NOT NULL,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0.00,
  closing_balance numeric(12,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'OPEN',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bank_reconciliations_account_idx ON bank_reconciliations(account_id);

CREATE TABLE IF NOT EXISTS bank_reconciliation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  description text,
  matched_payment_ref text,
  cleared boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS bank_recon_lines_recon_idx ON bank_reconciliation_lines(reconciliation_id);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  role_title text,
  hire_date timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employees_active_idx ON employees(active);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date timestamptz NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'PRESENT',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_date timestamptz NOT NULL,
  to_date timestamptz NOT NULL,
  leave_type text NOT NULL DEFAULT 'ANNUAL',
  status text NOT NULL DEFAULT 'PENDING',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leave_requests_emp_idx ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  total_gross numeric(12,2) NOT NULL DEFAULT 0.00,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0.00,
  notes text
);
CREATE INDEX IF NOT EXISTS payroll_lines_run_idx ON payroll_lines(run_id);
