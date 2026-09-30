-- Enforce company_deployments.server_id -> company_servers.id (idempotent).
UPDATE company_deployments
SET server_id = NULL
WHERE server_id IS NOT NULL
  AND server_id NOT IN (SELECT id FROM company_servers);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_deployments_server_id_fk'
  ) THEN
    ALTER TABLE company_deployments
      ADD CONSTRAINT company_deployments_server_id_fk
      FOREIGN KEY (server_id) REFERENCES company_servers(id) ON DELETE SET NULL;
  END IF;
END $$;
