CREATE TYPE "public"."account_type_enum" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."action_risk_enum" AS ENUM('READ', 'DRAFT', 'LOW_RISK_WRITE', 'HIGH_RISK_WRITE', 'DESTRUCTIVE');--> statement-breakpoint
CREATE TYPE "public"."creative_format_enum" AS ENUM('SHORT_FORM_15S', 'SHORT_FORM_30S', 'SHORT_FORM_60S', 'SHORT_FORM_90S', 'LONG_FORM_2M', 'LONG_FORM_5M', 'LONG_FORM_10M', 'LONG_FORM_20M');--> statement-breakpoint
CREATE TYPE "public"."creative_job_status_enum" AS ENUM('QUEUED', 'GENERATING_MEDIA', 'GENERATING_AUDIO', 'RENDERING_FFMPEG', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status_enum" AS ENUM('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."location_type_enum" AS ENUM('BRANCH', 'WAREHOUSE');--> statement-breakpoint
CREATE TYPE "public"."media_asset_type_enum" AS ENUM('PRODUCT_IMAGE', 'PRODUCT_VIDEO', 'STOCK_FOOTAGE', 'AI_GENERATED', 'LOGO', 'BRAND_ASSET', 'MUSIC', 'SFX', 'VOICE', 'FINISHED_VIDEO');--> statement-breakpoint
CREATE TYPE "public"."order_channel_enum" AS ENUM('POS', 'STOREFRONT', 'WHATSAPP', 'JARVIS', 'MANUAL', 'IMPORT', 'API');--> statement-breakpoint
CREATE TYPE "public"."order_status_enum" AS ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."payment_method_enum" AS ENUM('CASH', 'CARD', 'WEBXPAY', 'PAYHERE', 'STRIPE', 'CREDIT', 'COD');--> statement-breakpoint
CREATE TYPE "public"."payment_status_enum" AS ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."polim_potha_entry_type_enum" AS ENUM('INVOICE', 'REPAYMENT', 'ADJUSTMENT', 'WRITE_OFF');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT', 'MARKETING');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type_enum" AS ENUM('PURCHASE_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'RETURN', 'ADJUSTMENT', 'COUNT', 'DAMAGE', 'RESERVATION', 'RELEASE');--> statement-breakpoint
CREATE TYPE "public"."supplier_entry_type_enum" AS ENUM('BILL', 'PAYMENT', 'DEBIT_NOTE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"risk_level" "action_risk_enum" DEFAULT 'READ' NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_type" text DEFAULT 'FULL' NOT NULL,
	"file_url" text NOT NULL,
	"size_bytes" integer,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "business_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vertical" text DEFAULT 'fashion' NOT NULL,
	"enable_variants" boolean DEFAULT true NOT NULL,
	"enable_serial_numbers" boolean DEFAULT false NOT NULL,
	"enable_table_service" boolean DEFAULT false NOT NULL,
	"enable_kitchen_orders" boolean DEFAULT false NOT NULL,
	"enable_credit_sales" boolean DEFAULT true NOT NULL,
	"enable_delivery" boolean DEFAULT true NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_number" text,
	"logo_url" text,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Colombo' NOT NULL,
	"primary_domain" text,
	"receipt_header" text,
	"receipt_footer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type_enum" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chart_of_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "creative_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "creative_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"video_provider" text DEFAULT 'WAN21' NOT NULL,
	"tts_voice" text DEFAULT 'en_US-lessac-medium' NOT NULL,
	"status" "creative_job_status_enum" DEFAULT 'QUEUED' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"output_url" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creative_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"product_id" uuid,
	"format" "creative_format_enum" DEFAULT 'SHORT_FORM_30S' NOT NULL,
	"aspect_ratio" text DEFAULT '9:16' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid,
	"project_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"narration_text" text NOT NULL,
	"visual_prompt" text,
	"assigned_media_asset_id" uuid,
	"duration_seconds" numeric(5, 2) DEFAULT '5.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"segment" text DEFAULT 'NEW' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"courier_partner" text,
	"tracking_number" text,
	"status" "fulfillment_status_enum" DEFAULT 'PENDING' NOT NULL,
	"recipient_name" text,
	"recipient_phone" text,
	"delivery_address" text,
	"cod_amount" numeric(12, 2),
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" timestamp with time zone DEFAULT now() NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"credit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"memo" text
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"asset_type" "media_asset_type_enum" NOT NULL,
	"source" text DEFAULT 'LOCAL_UPLOAD' NOT NULL,
	"license" text DEFAULT 'COMMERCIAL_USE',
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"duration_seconds" numeric(6, 2),
	"resolution" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_profile_id" uuid,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_order_id" uuid NOT NULL,
	"return_number" text NOT NULL,
	"refund_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"restock_approved" boolean DEFAULT true NOT NULL,
	"reason" text,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"channel" "order_channel_enum" DEFAULT 'POS' NOT NULL,
	"fulfillment_location_id" uuid,
	"branch_id" uuid,
	"register_id" uuid,
	"shift_id" uuid,
	"customer_id" uuid,
	"order_status" "order_status_enum" DEFAULT 'DRAFT' NOT NULL,
	"payment_status" "payment_status_enum" DEFAULT 'PENDING' NOT NULL,
	"fulfillment_status" "fulfillment_status_enum" DEFAULT 'PENDING' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"client_uuid" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method_enum" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'LKR' NOT NULL,
	"provider_ref" text,
	"status" text DEFAULT 'SUCCESS' NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "polim_potha_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"current_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polim_potha_accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "polim_potha_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"type" "polim_potha_entry_type_enum" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"due_date" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);