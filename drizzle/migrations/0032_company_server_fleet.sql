CREATE TABLE IF NOT EXISTS company_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'Contabo',
  region text NOT NULL DEFAULT 'Sri Lanka / APAC',
  public_ip text,
  hostname text,
  coolify_url text,
  cpu_cores integer NOT NULL DEFAULT 4,
  ram_gb integer NOT NULL DEFAULT 8,
  disk_gb integer NOT NULL DEFAULT 160,
  max_clients integer NOT NULL DEFAULT 5,
  health_status text NOT NULL DEFAULT 'UNKNOWN',
  disk_usage_percent integer NOT NULL DEFAULT 0,
  ram_pressure text NOT NULL DEFAULT 'UNKNOWN',
  backup_status text NOT NULL DEFAULT 'UNKNOWN',
  notes text NOT NULL DEFAULT '',
  next_action text,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_servers_name_idx ON company_servers(name);
CREATE INDEX IF NOT EXISTS company_servers_health_idx ON company_servers(health_status);
CREATE INDEX IF NOT EXISTS company_servers_created_idx ON company_servers(created_at);

ALTER TABLE company_deployments ADD COLUMN IF NOT EXISTS server_id uuid;
ALTER TABLE company_deployments ADD COLUMN IF NOT EXISTS backup_status text NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE company_deployments ADD COLUMN IF NOT EXISTS last_backup_at timestamptz;
ALTER TABLE company_deployments ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

CREATE INDEX IF NOT EXISTS company_deployments_server_idx ON company_deployments(server_id);
