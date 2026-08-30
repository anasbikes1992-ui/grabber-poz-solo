# GRABBER BUSINESS OS — MYPOZ COMMERCE CORE EXTRACTION AUDIT (PHASE 0)
**Single-Business Edition Audit & Inventory**
*Audited Repositories: `D:\GRABBER MYPOZ`, `D:\MyPoz & Store\grabber-pos`, Supabase Migrations 0001–0042*

---

## 1. Executive Summary & Audit Scope

This audit reviews the complete MyPoz / Grabber Commerce codebase across its database schema (42 migrations, 49 tables, 42 functions/RPCs, 117 RLS policies), backend server actions, API routes, state machines, offline POS mechanisms, storefront, WhatsApp bot, Jarvis AI subsystem, and automated tests.

The primary objective is to extract the **canonical, durable commerce and operational logic** into a clean, unified **Single-Business Operating System (`GRABBER BUSINESS OS`)**, while removing all multi-tenant SaaS baggage (HQ, cross-tenant isolation layers, tenant-switching, tenant registration, `org_id` contamination), fixing architectural vulnerabilities (e.g. non-atomic cart checkout, JSON document persistence fallbacks, hardcoded org IDs, ungrounded AI prompts), and introducing the integrated **Creative Factory** (direct Python inference with Wan 2.1 / LTX / FFmpeg) and **Jarvis Grounded Business Copilot**.

---

## 2. Feature Classification Summary

| Classification | Count | Description |
| :--- | :---: | :--- |
| **KEEP** | 18 | Durable, battle-tested commerce models, tax calculations, receipt printer abstractions, barcode formats, and UI workflows. |
| **IMPROVE** | 22 | Solid concepts with implementation gaps (e.g. shift management, Polim Potha credit ledger, stock transfers, purchase orders, WhatsApp webhook validation). |
| **REWRITE** | 14 | Fragile, duplicated, or non-atomic implementations (e.g. POS checkout API, Storefront order RPC, Jarvis ungrounded chat, customer JSON storage). |
| **REMOVE** | 16 | Multi-tenant SaaS & HQ overhead (e.g. `organizations`, `hq_action_requests`, tenant slug resolvers, tenant provisioning, cross-org RLS). |
| **MISSING** | 19 | Critical production features required for single-business operations (e.g. direct Python video engine, stock reservation state machine, split payments, warehouse bin tracking). |

---

## 3. Comprehensive Feature Parity & Extraction Matrix

### 3.1 Authentication, RBAC & Core Hierarchy

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Business Profile** | **REWRITE** | `organizations`, `app_settings` (`0001_schema.sql`, `0015_platform_settings.sql`) | `organizations`, `platform_settings` | `current_org_id()`, RLS `org_self` | Assumed multi-tenant SaaS where each tenant registers an organization. | Replace with a singleton `business_profile` table storing business name, tax registration, address, logo, currency (`LKR`), timezone, and receipt details. |
| **User Roles & Staff** | **IMPROVE** | `profiles`, `user_roles`, `branch_members` (`0001_schema.sql`, `0031_enterprise_robustness.sql`) | `profiles`, `public.user_roles`, `branch_members` | `current_user_role()`, RLS `profile_read` | Role checks split across multiple tables (`profiles.role` vs `user_roles` vs metadata claims). | Unify into `users`, `roles`, `permissions`, and `user_assignments` (explicit branch & warehouse scope per staff member). |
| **HQ Admin & God's View** | **REMOVE** | `src/app/hq/*`, `src/lib/auth/hq.ts`, `0038_hq_governance_and_domain_resolve.sql` | `hq_action_requests`, `hq_audit_log` | `/api/hq/*`, `requireHqAdmin` | Contaminates single-business product with SaaS control plane. | **Deliberately exclude**. Single business has local `OWNER` and `ADMIN` roles only. |
| **Manager PIN Authorization** | **KEEP** | `src/components/pos/manager-pin-modal.tsx`, `src/lib/server/manager-pin.ts` | bcrypt / SHA256 hashed PIN | `/api/pos/authorize-override` | Works well for cashier discount/void overrides. | Keep and integrate directly into the server authorization middleware with full audit trail. |

---

### 3.2 Physical Infrastructure: Branches & Warehouses

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Branches & Registers** | **IMPROVE** | `branches`, `registers` (`0001_schema.sql`) | `branches`, `registers` | RLS `branch_read`, `registers_read` | Lacks distinct branch delivery configuration, operating hours, and cash floating rules. | Elevate to full entity with assigned POS registers, default warehouses, and staff assignments. |
| **Warehouses & Stock Locations** | **REWRITE** | `0031_enterprise_robustness.sql` (mixed branch-as-warehouse) | `branch_stock`, `variant_branch_stock` | `adjust_stock()` RPC | Warehouses were not modeled as distinct physical inventory hubs separate from retail counters. | Model `warehouses` as first-class physical entities with bins/zones, supporting Warehouse ↔ Branch and Warehouse ↔ Warehouse transfers. |
| **Stock Transfers & Dispatch** | **IMPROVE** | `stock_transfers`, `transfer_orders` (`0024_p0_auth_and_ops_hardening.sql`, `0031_enterprise_robustness.sql`) | `transfer_orders`, `transfer_order_lines` | RLS `tenant_transfer_orders_all` | Dual table schemas created in separate migrations; lacked atomic transit state machine. | Single canonical `transfers` and `transfer_lines` table with state machine: `REQUESTED` → `APPROVED` → `DISPATCHED` → `IN_TRANSIT` → `RECEIVED` / `REJECTED`. |

---

### 3.3 Catalog & Products Engine

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Products & Variants** | **IMPROVE** | `products`, `product_variants`, `product_barcodes` (`0001_schema.sql`, `0011_product_variants.sql`) | `products`, `product_variants`, `product_barcodes` | `product_json()`, `product_by_barcode()` | Spread across multiple migrations; variant stock was duplicated across two tables (`branch_stock` & `variant_branch_stock`). | Unify into clean normalized `products`, `product_variants`, and unified `stock_balances` referencing `product_id` + optional `variant_id` + `warehouse_id`. |
| **Smart Collections** | **KEEP** | `categories`, `store_collections`, `0012_smart_collections.sql` | `store_collections`, `store_collection_products` | `collection_matches_rules()` RPC | Good dynamic filtering rules based on category/price. | Reuse rule matching engine for promotional collections and catalog navigation. |
| **Barcode Generation & Scanning** | **KEEP** | `jsbarcode` in `src/app/(app)/inventory/barcodes/page.tsx` | EAN-13, CODE128 | Client-side SVG/Canvas rendering | Fast and reliable. | Keep client-side generator; add server-side barcode collision detection and batch printable PDF sticker sheets. |
| **Product Import (Excel/CSV)** | **IMPROVE** | `src/app/actions/import-products.ts`, `0040_product_images_and_import_jobs.sql` | `xlsx`, `import_jobs` | Server action with multi-step chunks | Vulnerable to partial failures without transactional rollback. | Upgrade with 3-stage validation pipeline: Preview & Collision Check → Validation Error Report → Transactional Commit. |

---

### 3.4 Inventory Management & Valuation

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Stock Balances & Ledger** | **REWRITE** | `branch_stock`, `stock_movements` (`0001_schema.sql`, `0030_adjust_stock_reason_cast.sql`) | `stock_movements`, `branch_stock` | `adjust_stock()` RPC | `branch_stock` only tracked branch quantity; no distinction between available, reserved, damaged, and incoming quantities. | Implement double-entry inventory ledger with `stock_balances` (quantity, reserved, damaged) and `stock_movements` (SALE, PURCHASE, TRANSFER_IN, TRANSFER_OUT, RETURN, ADJUSTMENT, COUNT, DAMAGE, RESERVATION). |
| **Stocktake / Physical Count** | **IMPROVE** | `stocktakes`, `stocktake_lines` (`0024_p0_auth_and_ops_hardening.sql`) | `stocktakes`, `stocktake_lines` | RLS `stocktakes_rw` | Did not freeze expected inventory snapshot at start of count. | Add count freeze snapshot, blind count mode, discrepancy variance review, approval workflow, and automatic adjustment movement generation. |
| **Low-Stock Alerts & Reordering** | **IMPROVE** | `src/app/api/notifications/low-stock/route.ts`, `src/lib/ai/demand.ts` | `products.reorder_level` | Ad-hoc threshold query (< 15 units) | Static hardcoded threshold of 15 in some files; no lead time or supplier minimum order quantity calculations. | Dynamic reorder points per location with automated PO draft generation. |

---

### 3.5 POS (Point of Sale) & Counter Checkout

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **POS UI & Zustand Store** | **KEEP** | `src/components/pos/counter-checkout.tsx`, `src/lib/pos/store.ts` | Zustand, Lucide icons, Tailwind | React 19 client components | Highly responsive, supports fast barcode scanning, item discounts, and held carts. | Retain UI responsiveness and shortcuts while connecting directly to canonical commerce service. |
| **POS Sale Completion** | **REWRITE** | `src/app/api/pos/sale/route.ts`, `0007_storefront.sql` `create_sale()` | `sales`, `sale_lines`, `payments` | Non-blocking catch blocks in API route | Handled stock decrement outside atomic transaction; swallowed DB errors; used client-calculated totals. | Implement server-side authoritative `createOrder()` and `processPayment()` with deterministic decimal math, stock reservation, and atomic decrement. |
| **Register Shifts & Cashier Close** | **IMPROVE** | `shifts`, `shift_summaries` (`0001_schema.sql`, `0026_register_shift_summaries.sql`) | `shifts`, `shift_summaries` | Client Zustand store `shift` | Cash sales accumulated on client without server verification against payment table. | Server-enforced shift lifecycle: `OPEN` (opening float) → `CASH_IN`/`CASH_OUT` → `CLOSE` (closing cash count, system expected vs actual variance calculation, Z-Report PDF/print). |
| **Receipt Generation & Thermal Printing** | **KEEP** | `src/lib/pos/printer.ts`, `src/components/pos/receipt-modal.tsx` | `node-thermal-printer`, ESC/POS | Web Bluetooth, USB, Network ESC/POS | Excellent thermal printer protocol support. | Keep ESC/POS and 80mm/58mm browser printable thermal receipt layout. |

---

### 3.6 Public Storefront & Ecommerce

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Storefront Catalog & Themes** | **IMPROVE** | `src/app/store/[slug]/*`, `src/lib/commerce/themes.ts` | `storefronts`, `app_documents` | `storefront_catalog()` RPC | Tied to `/store/[slug]` multi-tenant route structure. | Move to root canonical storefront (`/store` or `/`), powered by real-time inventory from default branch/warehouse. |
| **Checkout & Order Capture** | **REWRITE** | `src/app/api/store/[slug]/order/route.ts`, `storefront_create_order()` RPC | `sales`, `storefront_customers` | `storefront_create_order` | Separate order engine from POS; differed in customer address and fulfillment storage. | Unify into canonical `OrderService` supporting both POS in-person sales and online delivery/pickup orders with unified statuses. |

---

### 3.7 Order State Machine & Fulfillment

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Order Lifecycle** | **REWRITE** | `fulfillment_status` enum (`0013_variant_sales_and_fulfillment.sql`) | `sales.fulfillment_status` | `update_sale_fulfillment()` | Arbitrary status updates without guard transitions or event timestamps. | Implement strict finite state machine: `DRAFT` → `PENDING_PAYMENT` → `PAID` → `CONFIRMED` → `PROCESSING` → `PACKED` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED` / `CANCELLED` / `REFUNDED`. |
| **Delivery & Couriers** | **IMPROVE** | `src/lib/logistics/couriers.ts`, `src/lib/commerce/delivery.ts` | Courier rates (Prompt, Koombiyo, Domex, Fardar, Pronto) | `/api/logistics/dispatch` | Hardcoded mock rates and static status updates. | Configurable delivery zones (Colombo vs Outstation), delivery partner assignment, driver tracking, COD collection tracking. |

---

### 3.8 Payments & Financial Domains

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Payment Provider Abstraction** | **IMPROVE** | `0028_payment_domain.sql`, `0032_durable_webhook_events.sql` | `payment_intents`, `payment_events`, `webhook_events` | `claim_payment_event()`, `mark_payment_event_processed()` | Webhook events table existed but individual adapters (WebXPay, PayHere, Stripe, COD) were tightly coupled to specific endpoints. | Create unified `PaymentProvider` interface with modular adapters (Cash, Card, WebXPay, PayHere, OnePay, LankaPay, Stripe, COD) and idempotent webhook replay defense. |
| **Tax Engine** | **KEEP** | `src/lib/commerce/tax-engine.ts` | VAT 18%, NBT 2%, SVAT, Exempt, Custom % | Pure TypeScript calculation | Clean, accurate Sri Lankan tax matrix calculations. | Keep and integrate into canonical `PricingEngine` across all channels. |

---

### 3.9 CRM & Polim Potha Credit Ledger

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Customer Profiles & Segments** | **IMPROVE** | `src/app/(app)/customers/*`, `src/app/api/customers/route.ts` | `app_collections` (JSON document store fallback) | Direct CRUD | Saved customer data into unstructured `app_collections` JSON blobs. | Migrate to normalized `customers` table with computed RFM segments: `NEW`, `ACTIVE`, `VIP`, `INACTIVE`, `AT_RISK`, `HIGH_VALUE`. |
| **Polim Potha (Credit Ledger)** | **IMPROVE** | `src/app/(app)/polim-potha/*`, `0034_polim_potha_and_warranties.sql` | `debt_ledgers`, `debt_payments` | `/api/polim-potha` | Lacks formal credit limit enforcement, aging buckets (0-30, 31-60, 61-90, 90+ days), and write-off approval controls. | Upgrade to full double-entry credit ledger with credit limit enforcement, aging reports, repayment allocation, and automated WhatsApp balance reminders. |
| **Loyalty Engine** | **KEEP** | `0031_enterprise_robustness.sql` | `loyalty_accounts`, `loyalty_transactions` | RLS `tenant_loyalty_accounts_all` | Solid points ledger structure. | Re-enable loyalty earning/redemption at POS and online checkout. |

---

### 3.10 Purchasing & Suppliers

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Suppliers & Purchase Orders** | **IMPROVE** | `suppliers`, `purchases`, `purchase_lines` (`0001_schema.sql`) | `suppliers`, `purchases`, `purchase_lines` | `receive_purchase()` RPC | `receive_purchase()` was all-or-nothing without partial receiving, damaged goods recording, or landed cost adjustments. | Build complete PO lifecycle with partial receiving, over/short discrepancy recording, supplier invoices, and automatic stock movement generation. |

---

### 3.11 WhatsApp Automation & Commerce

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **WhatsApp Inbound/Outbound Engine** | **REWRITE** | `src/app/api/whatsapp/bot/route.ts`, `src/lib/whatsapp/*` | `app_documents`, Graph API | In-memory deduplication `Set<string>` | In-memory deduplication set lost on server restart; hardcoded fallback reply texts; lacked canonical order placement. | Implement durable database-backed webhook queue, canonical catalog lookup, real stock availability validation, conversational order capture, and human handoff routing. |

---

### 3.12 Jarvis AI Operating Copilot

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Jarvis Business Copilot** | **REWRITE** | `src/app/api/ai/chat/route.ts`, `src/lib/ai/rag.ts` | `org_ai_chunks`, OpenAI API | Basic vector search + keyword matching | Jarvis used keyword matching fallback with mock hardcoded data ("Kirkland Almond Flour") when DB queries returned empty. | Rebuild as an **Authorized Tool-Calling Copilot**. Jarvis NEVER writes raw SQL and NEVER uses mock data. Executes strictly typed tools: `get_sales()`, `get_inventory()`, `get_low_stock()`, `propose_stock_transfer()`, `draft_purchase_order()`, `draft_marketing_campaign()`. High-risk mutations require explicit UI confirmation. |

---

### 3.13 Creative Factory & Video Engine

| Feature / Area | Status | Current Location & Implementation | Dependencies & Tables | API / RPC & RLS | Current Weakness | Recommended Single-Business Action |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Creative Content Factory** | **MISSING (NEW)** | None in original MyPoz | FastAPI / Direct Python inference / FFmpeg | Async job queue | Video creation was not present in MyPoz. | Build complete campaign & video creation pipeline: Product → Target Audience → Hook & Script → AI Director Plan → Voice (Piper TTS) → Media (Stock/Direct Wan 2.1 Python inference) → FFmpeg Render Engine → Captions (STT) → Multi-Platform Packaging (TikTok, Reels, Shorts, WhatsApp). |

---

## 4. Summary of Multi-Tenant HQ Artifacts to Exclude

The following components from the audit will be **deliberately excluded**:
1. `src/app/hq/*` (God's view, tenant management, tenant switching).
2. `src/lib/auth/hq.ts`, `src/lib/auth/require-hq.ts`.
3. `organizations` table, `org_id` column across all tables.
4. `hq_action_requests`, `hq_audit_log`, `hq_provision_tenant()`, `resolve_storefront_slug()`.
5. Multi-tenant subdomain / slug routing (`/store/[slug]`) replaced by direct domain storefront.
6. Tenant registration flow (`/register` shop onboarding) replaced by single-business profile initialization.

---

## 5. Definition of Done for Single-Business Architecture

1. **One Database, One Business:** Zero `org_id` columns; implicit business ownership protected by role- and location-based authorization.
2. **Canonical Service Layer:** Single source of truth for Products, Inventory, Orders, Payments, and Customers shared by POS, Storefront, WhatsApp, and Jarvis.
3. **Double-Entry Inventory:** Auditable movements for every stock mutation across branches and warehouses; zero silent stock changes.
4. **Reliable POS & Shifts:** Deterministic tax, discounts, tenders, shift opening/closing, cash variance tracking, and thermal printing.
5. **Polim Potha Credit Ledger:** Real double-entry ledger with credit limits, aging buckets, and repayment tracking.
6. **WhatsApp Channel:** Durable webhook processing, real inventory verification, and transactional receipt delivery.
7. **Typed Jarvis Tools:** Permission-scoped tool calling with confirmation gates for mutating operations.
8. **Creative Factory:** Direct Python model adapter (Wan 2.1 / LTX) + Piper TTS + FFmpeg deterministic rendering pipeline.
