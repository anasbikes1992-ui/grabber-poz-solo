-- Idempotency: one client UUID per order (Postgres allows multiple NULLs under UNIQUE)
DROP INDEX IF EXISTS "orders_client_uuid_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "orders_client_uuid_idx" ON "orders" ("client_uuid");
