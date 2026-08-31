-- Align legacy Business OS columns toward src/db/schema.ts
-- Safe / idempotent for nvsejnlnulplmptnptpj

ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_pin text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE users SET hashed_pin = pin_hash WHERE hashed_pin IS NULL AND pin_hash IS NOT NULL;

ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS account_id uuid;
UPDATE journal_lines jl
SET account_id = coa.id
FROM chart_of_accounts coa
WHERE jl.account_id IS NULL
  AND jl.account_code IS NOT NULL
  AND coa.code = jl.account_code;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit numeric(12, 2) DEFAULT '0.00';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS hashed_password text;
