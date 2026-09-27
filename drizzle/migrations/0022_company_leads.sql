CREATE TABLE IF NOT EXISTS company_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  business_type text NOT NULL DEFAULT 'General Retail',
  branch_count text NOT NULL DEFAULT '1',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW',
  source text NOT NULL DEFAULT 'company_landing',
  notes text NOT NULL DEFAULT '',
  next_action text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_contacted_at timestamptz
);

CREATE INDEX IF NOT EXISTS company_leads_status_idx ON company_leads(status);
CREATE INDEX IF NOT EXISTS company_leads_created_idx ON company_leads(created_at);
CREATE INDEX IF NOT EXISTS company_leads_email_idx ON company_leads(email);
