# GRABBER BUSINESS OS — DATABASE DESIGN SPECIFICATION
**Single-Business Edition Normalized Relational Schema**

---

## 1. Schema Overview

The single-business database is designed with strong relational integrity, strict foreign key constraints, indexes on high-frequency query paths, decimal precision for financial numbers, two independent ledgers (physical goods and double-entry accounting), and an immutable audit log.

```
BUSINESS PROFILE & CONFIGURATION (1 singleton row)
       │
       ├── USERS ────── USER_ASSIGNMENTS ───┬── BRANCHES ─── REGISTERS ─── SHIFTS
       │                                     │
       │                                     └── WAREHOUSES ─── BINS
       │
       ├── TAX_PROFILES ── TAX_RATES (Effective-dated configuration)
       │
       ├── CATEGORIES ── PRODUCTS ── PRODUCT_VARIANTS ── BARCODES
       │                    │
       │                    ├── STOCK_BALANCES (on_hand, reserved, damaged)
       │                    └── STOCK_MOVEMENTS (Immutable physical stock ledger)
       │
       ├── CUSTOMERS ────── POLIM_POTHA_ACCOUNTS ─── POLIM_POTHA_ENTRIES (AR Credit Ledger)
       │       │
       │       ├── LOYALTY_ACCOUNTS & TRANSACTIONS
       │       └── ORDERS ─── ORDER_ITEMS
       │              │
       │              ├── PAYMENTS (Tenders, gateways, card details)
       │              ├── DELIVERIES & FULFILLMENT TRACKING
       │              └── ORDER_RETURNS & REFUNDS
       │
       ├── SUPPLIERS ────── PURCHASE_ORDERS ─── PO_LINES ─── GOODS_RECEIPTS (GRN)
       │       │
       │       └── SUPPLIER_ACCOUNTS ─── SUPPLIER_ENTRIES (AP Payable Ledger)
       │
       ├── TRANSFERS ────── TRANSFER_LINES (Branch/Warehouse stock movements)
       │
       ├── ACCOUNTING_LEDGER (General Ledger)
       │       │
       │       ├── CHART_OF_ACCOUNTS
       │       └── JOURNAL_ENTRIES ─── JOURNAL_LINES (Debits & Credits)
       │
       ├── MEDIA_LIBRARY (Product media, audio, brand assets, licenses, finished videos)
       │
       ├── CREATIVE_PROJECTS ── CHAPTERS ── SCENES ── SHOTS ── CREATIVE_JOBS
       │
       ├── WHATSAPP_CONVERSATIONS & MESSAGES
       │
       └── AUDIT_LOGS & BACKUP_SNAPSHOTS
```

---

## 2. Table Definitions & Key Relational Schemas

### 2.1 Core Identity, Configuration & Location Scoping
* `business_profile`: Singleton configuration (`id`, `name`, `legal_name`, `tax_number`, `logo_url`, `currency`, `timezone`, `primary_domain`, `receipt_header`, `receipt_footer`, `created_at`).
* `business_config`: Dynamic vertical feature flags (`id`, `vertical` [FASHION, GROCERY, ELECTRONICS, RESTAURANT, SERVICES, WHOLESALE, OTHER], `enable_variants`, `enable_serial_numbers`, `enable_table_service`, `enable_kitchen_orders`, `enable_credit_sales`, `enable_delivery`, `config_json`).
* `users`: Staff identity (`id`, `email`, `name`, `role` [OWNER, ADMIN, MANAGER, CASHIER, WAREHOUSE, ACCOUNTANT, MARKETING], `active`, `hashed_pin`, `created_at`).
* `branches`: Retail counters & physical storefronts (`id`, `name`, `code`, `address`, `phone`, `active`).
* `registers`: POS terminals per branch (`id`, `branch_id`, `name`, `code`, `active`).
* `warehouses`: Storage distribution centers & stock rooms (`id`, `branch_id` [optional], `name`, `code`, `address`, `active`).
* `user_assignments`: Staff location permissions (`id`, `user_id`, `branch_id`, `warehouse_id`, `created_at`).

### 2.2 Tax Configuration Engine (Effective-Dated)
* `tax_profiles`: Tax groupings (`id`, `code` [STANDARD_VAT, ZERO_RATED, EXEMPT, NON_TAXABLE, CUSTOM], `name`, `is_active`).
* `tax_rates`: Effective-dated percentage rates (`id`, `tax_profile_id`, `name`, `rate_percentage`, `effective_from`, `effective_to`, `created_at`).

### 2.3 Catalog, Pricing & Inventory Ledger (Physical Goods)
* `categories`: Hierarchy (`id`, `name`, `slug`, `parent_id`, `image_url`, `active`).
* `products`: Base catalog items (`id`, `category_id`, `tax_profile_id`, `name`, `slug`, `sku`, `barcode`, `cost_price`, `sale_price`, `wholesale_price`, `reorder_level`, `image_url`, `is_active`).
* `product_variants`: Attributes & variants (`id`, `product_id`, `name`, `sku`, `barcode`, `cost_price`, `sale_price`, `attributes_json`, `active`).
* `stock_balances`: Materialized location stock counters (`id`, `location_type` [BRANCH, WAREHOUSE], `location_id`, `product_id`, `variant_id`, `on_hand`, `reserved`, `damaged`, `updated_at`).
  * *Invariant:* $\text{Available} = \text{on\_hand} - \text{reserved}$.
* `stock_movements`: **Immutable Stock Ledger** (`id`, `location_type`, `location_id`, `product_id`, `variant_id`, `type` [PURCHASE_RECEIPT, TRANSFER_IN, TRANSFER_OUT, SALE, RETURN, ADJUSTMENT, COUNT, DAMAGE, RESERVATION, RELEASE], `delta`, `unit_cost`, `reference_type` [ORDER, PO, TRANSFER, AUDIT], `reference_id`, `actor_id`, `notes`, `created_at`).

### 2.4 Sales, Orders & Multi-State Execution
* `shifts`: Cashier register sessions (`id`, `register_id`, `cashier_id`, `opening_float`, `closing_cash`, `actual_card`, `variance`, `status` [OPEN, CLOSED], `opened_at`, `closed_at`).
* `orders`: Unified commerce orders (`id`, `order_number`, `channel` [POS, STOREFRONT, WHATSAPP, JARVIS, MANUAL, IMPORT, API], `fulfillment_location_id`, `branch_id`, `register_id`, `shift_id`, `customer_id`, `order_status` [DRAFT, CONFIRMED, PROCESSING, PACKED, READY_FOR_PICKUP, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED], `payment_status` [PENDING, AUTHORIZED, PAID, FAILED, PARTIALLY_REFUNDED, REFUNDED], `fulfillment_status` [PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED], `subtotal`, `discount_total`, `tax_total`, `grand_total`, `client_uuid`, `created_by`, `created_at`).
* `order_items`: Order line items (`id`, `order_id`, `product_id`, `variant_id`, `quantity`, `unit_price`, `unit_cost`, `tax_profile_id`, `tax_amount`, `discount_amount`, `line_total`).
* `payments`: Tender transactions (`id`, `order_id`, `method` [CASH, CARD, WEBXPAY, PAYHERE, STRIPE, CREDIT, COD], `amount`, `currency`, `provider_ref`, `status` [PENDING, SUCCESS, FAILED, REFUNDED], `idempotency_key`, `created_at`).
* `deliveries`: Courier dispatch tracking (`id`, `order_id`, `courier_partner`, `tracking_number`, `status`, `estimated_delivery`, `dispatched_at`, `delivered_at`).
* `order_returns`: Return handling (`id`, `original_order_id`, `return_number`, `refund_amount`, `restock_approved`, `reason`, `approved_by`, `created_at`).

### 2.5 Polim Potha (Customer AR) & Supplier AP Ledgers
* `customers`: Customer profiles (`id`, `name`, `phone`, `email`, `address`, `credit_limit`, `segment`, `active`, `created_at`).
* `polim_potha_accounts`: Customer credit account overview (`id`, `customer_id`, `credit_limit`, `current_balance`, `available_credit`, `status` [ACTIVE, SUSPENDED, BLOCKED]).
* `polim_potha_entries`: Immutable credit journal (`id`, `customer_id`, `order_id`, `type` [INVOICE, REPAYMENT, ADJUSTMENT, WRITE_OFF], `amount`, `balance_after`, `due_date`, `notes`, `created_by`, `created_at`).
* `suppliers`: Supplier directory (`id`, `name`, `contact_name`, `phone`, `email`, `address`, `tax_number`, `active`).
* `supplier_accounts`: Supplier payable summary (`id`, `supplier_id`, `current_balance`, `credit_terms_days`).
* `supplier_entries`: Immutable AP journal (`id`, `supplier_id`, `po_id`, `type` [BILL, PAYMENT, DEBIT_NOTE, ADJUSTMENT], `amount`, `balance_after`, `due_date`, `created_by`, `created_at`).

### 2.6 Financial Accounting Ledger (Double-Entry)
* `chart_of_accounts`: Account definitions (`id`, `code`, `name`, `type` [ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE], `active`).
* `journal_entries`: Financial transaction headers (`id`, `entry_number`, `entry_date`, `reference_type` [SALE, PAYMENT, PURCHASE, EXPENSE, POLIM_POTHA], `reference_id`, `description`, `created_by`, `created_at`).
* `journal_lines`: Debits and credits (`id`, `journal_entry_id`, `account_id`, `debit`, `credit`, `memo`).
  * *Invariant:* $\sum \text{Debits} = \sum \text{Credits}$ for every `journal_entry_id`.

### 2.7 Media Library & Creative Factory
* `media_assets`: Central media storage (`id`, `title`, `asset_type` [PRODUCT_IMAGE, PRODUCT_VIDEO, STOCK_FOOTAGE, AI_GENERATED, LOGO, BRAND_ASSET, MUSIC, SFX, VOICE, FINISHED_VIDEO], `source`, `license`, `file_url`, `mime_type`, `size_bytes`, `duration_seconds`, `resolution`, `tags`, `created_by`, `created_at`).
* `creative_projects`: Video project definitions (`id`, `title`, `product_id`, `format` [SHORT_FORM_15S, SHORT_FORM_30S, SHORT_FORM_60S, SHORT_FORM_90S, LONG_FORM_2M, LONG_FORM_5M, LONG_FORM_10M, LONG_FORM_20M], `aspect_ratio` [9:16, 1:1, 16:9], `status`, `created_by`, `created_at`).
* `creative_chapters`: Long-form chapter divisions (`id`, `project_id`, `sequence`, `title`, `description`).
* `creative_scenes`: Scene-by-scene script & media allocation (`id`, `chapter_id`, `sequence`, `narration_text`, `visual_prompt`, `assigned_media_asset_id`, `duration_seconds`).
* `creative_jobs`: Render worker queue (`id`, `project_id`, `video_provider` [WAN21, LTX, HUNYUAN, CLOUD], `tts_voice`, `status` [QUEUED, GENERATING_MEDIA, GENERATING_AUDIO, RENDERING_FFMPEG, COMPLETED, FAILED], `progress_percent`, `output_url`, `error_message`, `created_at`, `completed_at`).

### 2.8 System Auditing, Backups & Webhooks
* `audit_logs`: Immutable action trail (`id`, `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `risk_level` [READ, DRAFT, LOW_RISK_WRITE, HIGH_RISK_WRITE, DESTRUCTIVE], `before_state`, `after_state`, `ip_address`, `timestamp`).
* `backup_records`: Snapshot history (`id`, `backup_type` [FULL, DATABASE_ONLY, MEDIA_ONLY], `file_url`, `size_bytes`, `checksum`, `created_at`).
* `webhook_events`: Idempotent webhook tracking (`id`, `provider`, `provider_event_id`, `payload`, `status` [PENDING, PROCESSED, FAILED], `processed_at`, `created_at`).
