-- Platform completion: tracking, stock take, trade-in, shift reconcile, transfer verify
CREATE TABLE IF NOT EXISTS "abandoned_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"customer_id" uuid,
	"cart_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"promo_code" text,
	"recovery_token" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"recovered_order_id" uuid,
	"abandoned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminded_at" timestamp with time zone,
	CONSTRAINT "abandoned_carts_recovery_token_unique" UNIQUE("recovery_token")
);

CREATE TABLE IF NOT EXISTS "stock_take_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_number" text NOT NULL,
	"location_type" "location_type_enum" NOT NULL,
	"location_id" uuid NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"total_variance_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"approved_by" uuid,
	"journal_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posted_at" timestamp with time zone,
	CONSTRAINT "stock_take_sessions_session_number_unique" UNIQUE("session_number")
);

CREATE TABLE IF NOT EXISTS "stock_take_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"system_on_hand" integer DEFAULT 0 NOT NULL,
	"physical_count" integer DEFAULT 0 NOT NULL,
	"variance" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade_in_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_number" text NOT NULL,
	"device_model" text NOT NULL,
	"imei" text,
	"condition_grade" text NOT NULL,
	"appraisal_value" numeric(12, 2) NOT NULL,
	"product_id" uuid,
	"customer_name" text,
	"customer_phone" text,
	"status" text DEFAULT 'ISSUED' NOT NULL,
	"applied_order_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_in_vouchers_voucher_number_unique" UNIQUE("voucher_number")
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_token" text;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "actual_payhere" numeric(12, 2);
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "actual_polim" numeric(12, 2);
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "reconciliation_json" jsonb;
ALTER TABLE "transfer_lines" ADD COLUMN IF NOT EXISTS "received_qty" integer;
ALTER TABLE "transfer_lines" ADD COLUMN IF NOT EXISTS "variance_qty" integer;

DO $$ BEGIN
  ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_recovered_order_id_orders_id_fk" FOREIGN KEY ("recovered_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_take_lines" ADD CONSTRAINT "stock_take_lines_session_id_stock_take_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stock_take_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_take_lines" ADD CONSTRAINT "stock_take_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_take_lines" ADD CONSTRAINT "stock_take_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "trade_in_vouchers" ADD CONSTRAINT "trade_in_vouchers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "trade_in_vouchers" ADD CONSTRAINT "trade_in_vouchers_applied_order_id_orders_id_fk" FOREIGN KEY ("applied_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "trade_in_vouchers" ADD CONSTRAINT "trade_in_vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "abandoned_carts_phone_status_idx" ON "abandoned_carts" USING btree ("phone","status");
