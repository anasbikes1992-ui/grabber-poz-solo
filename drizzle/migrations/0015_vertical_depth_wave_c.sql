-- Wave C: QR table tokens for public dining menu
ALTER TABLE "dining_tables" ADD COLUMN IF NOT EXISTS "qr_token" text;
CREATE UNIQUE INDEX IF NOT EXISTS "dining_tables_qr_token_idx" ON "dining_tables" ("qr_token") WHERE "qr_token" IS NOT NULL;
