-- MobileRepair repair catalog + appointments
CREATE TABLE IF NOT EXISTS "repair_service_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text NOT NULL,
	"device_model" text NOT NULL,
	"repair_category" text NOT NULL,
	"part_quality" text NOT NULL,
	"estimated_cost_lkr" numeric(12, 2) NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"warranty_days" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repair_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"visit_type" text NOT NULL,
	"appointment_date" text NOT NULL,
	"time_slot" text NOT NULL,
	"pickup_address" text,
	"courier_tracking_no" text,
	"device_model" text NOT NULL,
	"issue_description" text NOT NULL,
	"part_quality" text,
	"estimated_cost_lkr" numeric(12, 2),
	"inspection_checklist" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "repair_appointments" ADD CONSTRAINT "repair_appointments_ticket_id_repair_jobs_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."repair_jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repair_catalog_model_cat_idx" ON "repair_service_catalog" USING btree ("brand","device_model","repair_category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repair_appt_date_slot_idx" ON "repair_appointments" USING btree ("appointment_date","time_slot");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repair_appt_phone_idx" ON "repair_appointments" USING btree ("customer_phone");
