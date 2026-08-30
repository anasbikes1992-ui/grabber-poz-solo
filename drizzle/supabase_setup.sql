-- ====================================================================
-- GRABBER BUSINESS OS (SOLO EDITION) — SUPABASE INITIALIZATION SCRIPT
-- ====================================================================
-- This script resets and provisions all 41 tables, custom enum types,
-- foreign keys, performance indexes, and initial seed configuration.
-- Run this directly in the Supabase SQL Editor.
-- ====================================================================

-- 1. Reset Public Schema (Clean Slate for Solo Business)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant permissions to Supabase roles
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. Create Enums
CREATE TYPE public.account_type_enum AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE public.action_risk_enum AS ENUM('READ', 'DRAFT', 'LOW_RISK_WRITE', 'HIGH_RISK_WRITE', 'DESTRUCTIVE');
CREATE TYPE public.creative_format_enum AS ENUM('SHORT_FORM_15S', 'SHORT_FORM_30S', 'SHORT_FORM_60S', 'SHORT_FORM_90S', 'LONG_FORM_2M', 'LONG_FORM_5M', 'LONG_FORM_10M', 'LONG_FORM_20M');
CREATE TYPE public.creative_job_status_enum AS ENUM('QUEUED', 'GENERATING_MEDIA', 'GENERATING_AUDIO', 'RENDERING_FFMPEG', 'COMPLETED', 'FAILED');
CREATE TYPE public.fulfillment_status_enum AS ENUM('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED');
CREATE TYPE public.location_type_enum AS ENUM('BRANCH', 'WAREHOUSE');
CREATE TYPE public.media_asset_type_enum AS ENUM('PRODUCT_IMAGE', 'PRODUCT_VIDEO', 'STOCK_FOOTAGE', 'AI_GENERATED', 'LOGO', 'BRAND_ASSET', 'MUSIC', 'SFX', 'VOICE', 'FINISHED_VIDEO');
CREATE TYPE public.order_channel_enum AS ENUM('POS', 'STOREFRONT', 'WHATSAPP', 'JARVIS', 'MANUAL', 'IMPORT', 'API');
CREATE TYPE public.order_status_enum AS ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');
CREATE TYPE public.payment_method_enum AS ENUM('CASH', 'CARD', 'WEBXPAY', 'PAYHERE', 'STRIPE', 'CREDIT', 'COD');
CREATE TYPE public.payment_status_enum AS ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE public.polim_potha_entry_type_enum AS ENUM('INVOICE', 'REPAYMENT', 'ADJUSTMENT', 'WRITE_OFF');
CREATE TYPE public.role_enum AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'ACCOUNTANT', 'MARKETING');
CREATE TYPE public.stock_movement_type_enum AS ENUM('PURCHASE_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'RETURN', 'ADJUSTMENT', 'COUNT', 'DAMAGE', 'RESERVATION', 'RELEASE');
CREATE TYPE public.supplier_entry_type_enum AS ENUM('BILL', 'PAYMENT', 'DEBIT_NOTE', 'ADJUSTMENT');

-- 3. Core Tables
CREATE TABLE public.business_profile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    legal_name text,
    tax_number text,
    logo_url text,
    currency text DEFAULT 'LKR' NOT NULL,
    timezone text DEFAULT 'Asia/Colombo' NOT NULL,
    primary_domain text,
    receipt_header text,
    receipt_footer text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.business_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical text DEFAULT 'fashion' NOT NULL,
    enable_variants boolean DEFAULT true NOT NULL,
    enable_serial_numbers boolean DEFAULT false NOT NULL,
    enable_table_service boolean DEFAULT false NOT NULL,
    enable_kitchen_orders boolean DEFAULT false NOT NULL,
    enable_credit_sales boolean DEFAULT true NOT NULL,
    enable_delivery boolean DEFAULT true NOT NULL,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    address text,
    phone text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.warehouses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    address text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.registers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role public.role_enum DEFAULT 'CASHIER' NOT NULL,
    pin_hash text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    register_id uuid NOT NULL REFERENCES public.registers(id) ON DELETE CASCADE,
    opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    opening_float numeric(12, 2) DEFAULT '0.00' NOT NULL,
    closing_cash numeric(12, 2),
    expected_cash numeric(12, 2),
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone
);

CREATE TABLE public.tax_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    is_compound boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.tax_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_profile_id uuid NOT NULL REFERENCES public.tax_profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    rate numeric(5, 2) NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    tax_profile_id uuid REFERENCES public.tax_profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    sku text NOT NULL UNIQUE,
    barcode text,
    description text,
    base_price numeric(12, 2) NOT NULL,
    base_cost numeric(12, 2) DEFAULT '0.00' NOT NULL,
    track_inventory boolean DEFAULT true NOT NULL,
    has_variants boolean DEFAULT false NOT NULL,
    attributes_schema jsonb DEFAULT '[]'::jsonb NOT NULL,
    image_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name text NOT NULL,
    sku text NOT NULL UNIQUE,
    barcode text,
    cost_price numeric(12, 2),
    sale_price numeric(12, 2),
    attributes_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Ledgers (Dual-Ledger Core)
CREATE TABLE public.stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type public.stock_movement_type_enum NOT NULL,
    location_type public.location_type_enum NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity_delta integer NOT NULL,
    unit_cost numeric(12, 2) DEFAULT '0.00' NOT NULL,
    reference_type text NOT NULL,
    reference_id text NOT NULL,
    memo text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.stock_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_type public.location_type_enum NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    on_hand integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    available integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    type public.account_type_enum NOT NULL,
    active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number text NOT NULL UNIQUE,
    entry_date timestamp with time zone NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    memo text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_code text NOT NULL REFERENCES public.chart_of_accounts(code) ON DELETE RESTRICT,
    debit numeric(12, 2) DEFAULT '0.00' NOT NULL,
    credit numeric(12, 2) DEFAULT '0.00' NOT NULL,
    memo text
);

-- 5. Commerce, AR & AP
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text NOT NULL UNIQUE,
    email text,
    address text,
    credit_allowed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.polim_potha_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
    credit_limit numeric(12, 2) DEFAULT '0.00' NOT NULL,
    current_balance numeric(12, 2) DEFAULT '0.00' NOT NULL,
    status text DEFAULT 'ACTIVE' NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.polim_potha_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    order_id uuid,
    type public.polim_potha_entry_type_enum NOT NULL,
    amount numeric(12, 2) NOT NULL,
    balance_after numeric(12, 2) NOT NULL,
    due_date timestamp with time zone,
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    address text,
    payment_terms text DEFAULT 'NET_30' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.supplier_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL UNIQUE REFERENCES public.suppliers(id) ON DELETE CASCADE,
    current_balance numeric(12, 2) DEFAULT '0.00' NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.supplier_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    type public.supplier_entry_type_enum NOT NULL,
    amount numeric(12, 2) NOT NULL,
    balance_after numeric(12, 2) NOT NULL,
    reference_no text NOT NULL,
    due_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number text NOT NULL UNIQUE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    destination_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    total_cost numeric(12, 2) DEFAULT '0.00' NOT NULL,
    status text DEFAULT 'DRAFT' NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.purchase_order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    ordered_quantity integer NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    unit_cost numeric(12, 2) NOT NULL,
    line_cost numeric(12, 2) NOT NULL
);

CREATE TABLE public.transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number text NOT NULL UNIQUE,
    source_location_type public.location_type_enum NOT NULL,
    source_location_id uuid NOT NULL,
    dest_location_type public.location_type_enum NOT NULL,
    dest_location_id uuid NOT NULL,
    status text DEFAULT 'PENDING' NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.transfer_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity integer NOT NULL
);

CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number text NOT NULL UNIQUE,
    channel public.order_channel_enum DEFAULT 'POS' NOT NULL,
    fulfillment_location_id uuid,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    register_id uuid REFERENCES public.registers(id) ON DELETE SET NULL,
    shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    order_status public.order_status_enum DEFAULT 'DRAFT' NOT NULL,
    payment_status public.payment_status_enum DEFAULT 'PENDING' NOT NULL,
    fulfillment_status public.fulfillment_status_enum DEFAULT 'PENDING' NOT NULL,
    subtotal numeric(12, 2) DEFAULT '0.00' NOT NULL,
    discount_total numeric(12, 2) DEFAULT '0.00' NOT NULL,
    tax_total numeric(12, 2) DEFAULT '0.00' NOT NULL,
    grand_total numeric(12, 2) DEFAULT '0.00' NOT NULL,
    client_uuid text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(12, 2) NOT NULL,
    unit_cost numeric(12, 2) DEFAULT '0.00' NOT NULL,
    tax_profile_id uuid REFERENCES public.tax_profiles(id) ON DELETE SET NULL,
    tax_amount numeric(12, 2) DEFAULT '0.00' NOT NULL,
    discount_amount numeric(12, 2) DEFAULT '0.00' NOT NULL,
    line_total numeric(12, 2) NOT NULL
);

CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    method public.payment_method_enum NOT NULL,
    amount numeric(12, 2) NOT NULL,
    currency text DEFAULT 'LKR' NOT NULL,
    provider_ref text,
    status text DEFAULT 'SUCCESS' NOT NULL,
    idempotency_key text UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    courier_name text DEFAULT 'Koombiyo' NOT NULL,
    tracking_number text,
    dispatch_location_type public.location_type_enum NOT NULL,
    dispatch_location_id uuid NOT NULL,
    shipping_address text NOT NULL,
    status text DEFAULT 'PENDING' NOT NULL,
    cash_on_delivery boolean DEFAULT false NOT NULL,
    cod_amount numeric(12, 2) DEFAULT '0.00' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.order_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    return_number text NOT NULL UNIQUE,
    refund_amount numeric(12, 2) DEFAULT '0.00' NOT NULL,
    restock_approved boolean DEFAULT true NOT NULL,
    reason text,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Creative Studio & Media
CREATE TABLE public.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    asset_type public.media_asset_type_enum NOT NULL,
    source text DEFAULT 'LOCAL_UPLOAD' NOT NULL,
    license text DEFAULT 'COMMERCIAL_USE',
    file_url text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer,
    duration_seconds numeric(6, 2),
    resolution text,
    tags jsonb DEFAULT '[]'::jsonb,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.creative_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    format public.creative_format_enum DEFAULT 'SHORT_FORM_30S' NOT NULL,
    target_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    aspect_ratio text DEFAULT '9:16' NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.creative_chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
    chapter_index integer NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.creative_scenes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
    chapter_id uuid REFERENCES public.creative_chapters(id) ON DELETE CASCADE,
    scene_index integer NOT NULL,
    visual_prompt text NOT NULL,
    dialogue_script text,
    duration_seconds numeric(4, 1) DEFAULT 4.0 NOT NULL
);

CREATE TABLE public.creative_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.creative_projects(id) ON DELETE CASCADE,
    provider text DEFAULT 'WanProvider' NOT NULL,
    status public.creative_job_status_enum DEFAULT 'QUEUED' NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    output_video_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Audit Logs, Webhooks & Backups
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    actor_role text,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    risk_level public.action_risk_enum DEFAULT 'READ' NOT NULL,
    before_state jsonb,
    after_state jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    provider_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.backup_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text DEFAULT 'FULL' NOT NULL,
    file_url text NOT NULL,
    size_bytes integer,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Performance Indexes
CREATE INDEX idx_orders_channel_status ON public.orders(channel, order_status);
CREATE INDEX idx_orders_created ON public.orders(created_at);
CREATE INDEX idx_stock_movements_loc ON public.stock_movements(location_id, product_id);
CREATE UNIQUE INDEX idx_stock_balances_unique ON public.stock_balances(location_type, location_id, product_id, variant_id);
CREATE INDEX idx_polim_potha_cust ON public.polim_potha_entries(customer_id, created_at);
CREATE UNIQUE INDEX idx_webhook_events_unique ON public.webhook_events(provider, provider_event_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action, created_at);

-- 9. Initial Seed Data (Single-Business Solo Essentials)
INSERT INTO public.business_profile (name, legal_name, tax_number, currency, timezone, receipt_header, receipt_footer)
VALUES ('Grabber Flagship Store', 'Grabber Retail Private Limited', 'VAT-987654321-7000', 'LKR', 'Asia/Colombo', 'Welcome to Grabber Flagship Store • Colombo 03', 'Thank you for shopping with us! Returns accepted within 7 days.');

INSERT INTO public.business_config (vertical, enable_variants, enable_credit_sales, enable_delivery)
VALUES ('fashion', true, true, true);

INSERT INTO public.tax_profiles (code, name) VALUES ('STANDARD_VAT', 'Sri Lankan Standard VAT');
INSERT INTO public.tax_rates (tax_profile_id, name, rate, effective_from)
SELECT id, 'VAT 18%', 18.00, '2026-01-01 00:00:00+00' FROM public.tax_profiles WHERE code = 'STANDARD_VAT';

INSERT INTO public.chart_of_accounts (code, name, type) VALUES
('1010', 'Cash on Hand', 'ASSET'),
('1020', 'Bank Account', 'ASSET'),
('1090', 'Sales Clearing Account', 'ASSET'),
('1100', 'Accounts Receivable (Polim Potha)', 'ASSET'),
('1200', 'Merchandise Inventory', 'ASSET'),
('2000', 'Accounts Payable (Suppliers)', 'LIABILITY'),
('2100', 'VAT Payable', 'LIABILITY'),
('4000', 'Sales Revenue', 'REVENUE'),
('5000', 'Cost of Goods Sold (COGS)', 'EXPENSE');

INSERT INTO public.branches (name, code, address, phone)
VALUES ('Colombo Main Branch', 'BR-01', '123 Galle Road, Colombo 03', '+94 11 234 5678');

INSERT INTO public.warehouses (name, code, address)
VALUES ('Central Colombo Warehouse', 'WH-01', '45 Depot Road, Colombo 10');

INSERT INTO public.registers (branch_id, name, code)
SELECT id, 'Main Counter Register 01', 'REG-01' FROM public.branches WHERE code = 'BR-01';

INSERT INTO public.users (name, email, role)
VALUES ('Business Owner', 'owner@grabber.lk', 'OWNER');
