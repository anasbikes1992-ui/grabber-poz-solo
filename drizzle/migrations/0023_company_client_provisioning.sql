CREATE TABLE IF NOT EXISTS company_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT 'General Retail',
  branch_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'PROSPECT',
  target_domain text,
  coolify_app_name text,
  database_name text,
  app_status text NOT NULL DEFAULT 'NOT_STARTED',
  database_status text NOT NULL DEFAULT 'NOT_STARTED',
  handover_status text NOT NULL DEFAULT 'NOT_READY',
  vertical_preset text NOT NULL DEFAULT 'general-retail',
  layout_template text NOT NULL DEFAULT 'retail_wholesale',
  notes text NOT NULL DEFAULT '',
  next_action text,
  target_launch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_clients_status_idx ON company_clients(status);
CREATE INDEX IF NOT EXISTS company_clients_created_idx ON company_clients(created_at);
CREATE INDEX IF NOT EXISTS company_clients_email_idx ON company_clients(email);

CREATE TABLE IF NOT EXISTS company_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  task_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  owner text NOT NULL DEFAULT 'Ops',
  notes text NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_onboarding_tasks_client_idx ON company_onboarding_tasks(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS company_onboarding_tasks_client_task_key_idx
  ON company_onboarding_tasks(client_id, task_key);
