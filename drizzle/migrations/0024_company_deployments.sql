CREATE TABLE IF NOT EXISTS company_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  business_name text NOT NULL,
  app_name text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  domain text,
  database_name text,
  coolify_project_id text,
  coolify_service_id text,
  repository text NOT NULL DEFAULT 'anasbikes1992-ui/grabber-poz-solo',
  branch text NOT NULL DEFAULT 'main',
  commit_sha text,
  app_status text NOT NULL DEFAULT 'NOT_STARTED',
  database_status text NOT NULL DEFAULT 'NOT_STARTED',
  deploy_status text NOT NULL DEFAULT 'NOT_STARTED',
  health_status text NOT NULL DEFAULT 'UNKNOWN',
  notes text NOT NULL DEFAULT '',
  next_action text,
  last_deployed_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_deployments_client_idx ON company_deployments(client_id);
CREATE INDEX IF NOT EXISTS company_deployments_status_idx ON company_deployments(deploy_status);
CREATE INDEX IF NOT EXISTS company_deployments_domain_idx ON company_deployments(domain);
CREATE INDEX IF NOT EXISTS company_deployments_created_idx ON company_deployments(created_at);
