CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"service" text NOT NULL,
	"specialist" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dining_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" text DEFAULT 'VACANT' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hire_purchase_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" text NOT NULL,
	"customer_id" uuid,
	"customer_name" text NOT NULL,
	"nic_number" text NOT NULL,
	"phone" text NOT NULL,
	"item_name" text NOT NULL,
	"product_id" uuid,
	"total_cash_price" numeric(12, 2) NOT NULL,
	"down_payment" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"monthly_emi" numeric(12, 2) NOT NULL,
	"total_months" integer NOT NULL,
	"paid_months" integer DEFAULT 0 NOT NULL,
	"next_due_date" timestamp with time zone,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hire_purchase_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE "hire_purchase_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text DEFAULT 'CASH' NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "kitchen_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kot_number" text NOT NULL,
	"table_id" uuid,
	"waiter_name" text,
	"items_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "kitchen_tickets_kot_number_unique" UNIQUE("kot_number")
);
--> statement-breakpoint
CREATE TABLE "loyalty_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'SILVER' NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"last_visit_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_members_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"type" text NOT NULL,
	"points_delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"order_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text,
	"device_model" text NOT NULL,
	"primary_fault" text,
	"inspection_remarks" text,
	"checklist_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lock_type" text,
	"parts_description" text,
	"parts_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"service_charge" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"advance_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"technician" text,
	"commission_pct" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'INTAKE' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_jobs_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "hashed_password" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_purchase_contracts" ADD CONSTRAINT "hire_purchase_contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_purchase_contracts" ADD CONSTRAINT "hire_purchase_contracts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_purchase_contracts" ADD CONSTRAINT "hire_purchase_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_purchase_installments" ADD CONSTRAINT "hire_purchase_installments_contract_id_hire_purchase_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."hire_purchase_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hire_purchase_installments" ADD CONSTRAINT "hire_purchase_installments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_table_id_dining_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."dining_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD CONSTRAINT "loyalty_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_member_id_loyalty_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."loyalty_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_starts_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "hp_contracts_status_idx" ON "hire_purchase_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "hp_installments_contract_idx" ON "hire_purchase_installments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "kitchen_tickets_table_idx" ON "kitchen_tickets" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "loyalty_tx_member_idx" ON "loyalty_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "repair_jobs_status_idx" ON "repair_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_client_uuid_idx" ON "orders" USING btree ("client_uuid");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "supplier_entries_supplier_id_idx" ON "supplier_entries" USING btree ("supplier_id");