-- Wave B vertical depth: itemType, salon commission, marketing spend, order UTM
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "item_type" text DEFAULT 'PHYSICAL' NOT NULL;

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "commission_pct" numeric(5, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "commission_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'STAFF';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaign_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "utm_json" jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "marketing_spend" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel" text NOT NULL,
  "campaign_id" text,
  "campaign_name" text,
  "amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "currency" text DEFAULT 'LKR' NOT NULL,
  "spent_on" timestamp with time zone DEFAULT now() NOT NULL,
  "notes" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "marketing_spend_channel_idx" ON "marketing_spend" ("channel");
CREATE INDEX IF NOT EXISTS "marketing_spend_campaign_idx" ON "marketing_spend" ("campaign_id");
CREATE INDEX IF NOT EXISTS "marketing_spend_spent_on_idx" ON "marketing_spend" ("spent_on");

CREATE INDEX IF NOT EXISTS "orders_campaign_id_idx" ON "orders" ("campaign_id");
CREATE INDEX IF NOT EXISTS "products_item_type_idx" ON "products" ("item_type");
