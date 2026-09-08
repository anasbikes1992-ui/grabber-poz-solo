# GRABBER BUSINESS OS — MASTER SYSTEM ARCHITECTURE & TECH STACK SPECIFICATION
**Single-Business Edition: Commerce Core + Physical Operations + Jarvis Autonomous OS**

---

## 1. Executive Overview & Core Philosophy

**Grabber Business OS** is a single-business, standalone commercial operating system. Unlike multi-tenant SaaS platforms where data from thousands of companies is intermingled in a single database with `tenant_id` filters, Grabber OS follows a **Single-Business / Single-Database** deployment model:

* **One Business = One Dedicated Database Instance**: Eliminates multi-tenant query overhead and cross-tenant data leak vulnerabilities.
* **Physical Multi-Location Hierarchy**: A single business owns unlimited customer-facing **Branches** (counter POS registers & local store inventory) and **Warehouses** (bulk storage & regional distribution hubs).
* **Canonical Commerce Service Boundary**: All customer and staff touchpoints (Counter POS, Storefront Checkout, WhatsApp Bot, and Jarvis Autonomous Actions) execute the identical backend commerce engine (`PricingEngine`, `InventoryEngine`, `PaymentService`, `CheckoutRepo`).
* **Authoritative Server Pricing**: The frontend client never computes trusted totals. Pricing, volume discounts, taxes, and cart promotions are computed and committed deterministically on the server.

---

## 2. High-Level System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             GRABBER BUSINESS OS                             │
│                      Single Business / Single Database                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         │                                                           │
┌────────▼───────────────────────────┐             ┌─────────────────▼───────────────────┐
│          BUSINESS ENGINE           │             │           CREATIVE ENGINE           │
│ (Next.js 15 / App Router / Node.js)│             │      (FastAPI / Python / GPU)       │
└────────┬───────────────────────────┘             └─────────────────┬───────────────────┘
         │                                                           │
   ┌─────┼───────────┬───────────┬───────────┐                 ┌─────┴─────┬───────────┐
   │     │           │           │           │                 │           │           │
┌──▼──┐┌─▼───┐    ┌──▼──┐     ┌──▼──┐     ┌──▼──┐           ┌──▼──┐     ┌──▼──┐     ┌──▼──┐
│POS  ││Store│    │WA   │     │GRN  │     │Fin  │           │Short│     │UGC  │     │Voice│
│Desk ││Front│    │Bot  │     │Purch│     │Ledg │           │Video│     │Story│     │Audio│
└──┬──┘└──┬──┘    └──┬──┘     └──┬──┘     └──┬──┘           └──┬──┘     └──┬──┘     └──┬──┘
   │      │          │           │           │                 │           │           │
   └──────┴──────────┼───────────┴───────────┘                 └───────────┼───────────┘
                     │                                                     │
       ┌─────────────▼─────────────┐                                       │
       │  CANONICAL COMMERCE CORE  │◄──────────────────────────────────────┘
       │ (Order, Inventory, Price) │  Product / Inventory / Promotion Data
       └─────────────┬─────────────┘
                     │
                     │ Typed Tool Execution / Action Policy Matrix
       ┌─────────────▼─────────────┐
       │   JARVIS AUTONOMOUS OS    │
       │ (Brain / Closed-Loop Loop)│
       └─────────────┬─────────────┘
                     │
       ┌─────────────▼─────────────┐
       │   POSTGRESQL RELATIONAL   │
       │ (49 Drizzle Schema Tables)│
       └───────────────────────────┘
```

---

## 3. Technology Stack & Component Map

| Layer | Technology | Key Responsibility |
|:---|:---|:---|
| **Web App Framework** | Next.js 15 (React 19, App Router, Server Actions) | Unified back-office portal, touch POS, and SEO storefront. |
| **Styling & UI Craft** | Vanilla Tailwind CSS, Radix UI, Lucide Icons | Dark-first Zinc-950 / Emerald design system, accessible focus rings. |
| **Data Persistence** | PostgreSQL (Supabase or Self-Hosted), Drizzle ORM | 49 ACID relational tables, double-entry general ledger, audit trails. |
| **Authentication** | Dual-Session (HMAC Staff PIN Cookie + Shopper Session) | Verified edge session validation via Next.js Middleware. |
| **Autonomous Intelligence** | Jarvis Business Brain + 10 Vertical Intelligence Packs | Closed-loop anomaly detection, KPI tracking, and opportunity discovery. |
| **SEO & Growth Engine** | Dynamic JSON-LD Schema, Semantic Keyword Intent Analyzer | Automated metadata audits, FAQ schema, and LocalBusiness branch pages. |
| **Creative Factory** | Python 3.11, FastAPI, PyTorch, Wan 2.1, Piper TTS, FFmpeg | Video generation, neural voiceovers, and marketing asset assembly. |
| **Payment Gateways** | Multi-Gateway Adapter Architecture | COD, PayHere, WebXPay, Koko, Mintpay, Payzy with signature verification. |

---

## 4. Relational Database Design & Schema Highlights

The database schema (defined in `src/db/schema.ts`) contains 49 core tables structured around double-entry accounting and strict inventory control:

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     products     │◄──────┤   stock_balances │──────►│    warehouses    │
│ (SKU, Price, Tax)│       │(OnHand, Reserved)│       │  & retail_stores │
└────────┬─────────┘       └────────┬─────────┘       └──────────────────┘
         │                          │
         │                          ▼
         │                 ┌──────────────────┐
         │                 │  stock_movements │ (Audit Log of all physical
         │                 │ (SALE, GRN, TRF) │  inventory adjustments)
         │                 └──────────────────┘
         ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      orders      │──────►│   order_items    │       │  journal_entries │
│ (Totals, Channel)│       │(Price, Cost, Tax)│       │(Double-Entry GL) │
└────────┬─────────┘       └──────────────────┘       └────────┬─────────┘
         │                                                     │
         ▼                                                     ▼
┌──────────────────┐                                  ┌──────────────────┐
│  polim_potha_acc │                                  │  journal_lines   │
│ (Credit Ledger)  │                                  │ (Debit / Credit) │
└──────────────────┘                                  └──────────────────┘
```

### Key Relational Entities:
1. **Catalog & Variants**: `products`, `product_variants`, `categories`, `tax_profiles`, `barcode_labels`.
2. **Double-Entry Stock Control**: `stock_balances`, `stock_movements`, `warehouses`, `branches`, `stock_takes`, `damages`.
3. **Purchasing & Logistics**: `purchase_orders`, `purchase_order_items`, `grn_receipts`, `grn_items`, `suppliers`, `supplier_ledger`.
4. **Sales & Payments**: `orders`, `order_items`, `payments`, `payment_reconciliations`, `pos_shifts`, `pos_drawers`.
5. **Credit (Polim Potha)**: `polim_potha_accounts`, `polim_potha_ledger`, `polim_potha_repayments`.
6. **Accounting & Ledgers**: `chart_of_accounts`, `journal_entries`, `journal_lines`, `expenses`.
7. **Vertical Modules**: `repair_jobs`, `dining_tables`, `kitchen_tickets`, `hire_purchase_contracts`, `appointments`, `loyalty_members`.
8. **Jarvis & Automation**: `audit_logs`, `approval_drafts`, `automation_rules`, `marketing_campaigns`, `creative_projects`.

---

## 5. Security Posture & Authentication Matrix

* **Staff Back-Office**: Enforces verified HMAC-signed session tokens in `grabber_session`. Plaintext passwords are never stored. Staff PINs are securely verified against PBKDF2/bcrypt hashes.
* **Edge Route Protection**: [middleware.ts](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts) validates permissions before routing to any `/api/*` or back-office surface.
* **Webhook Defense**: PayHere MD5 checksum and WhatsApp SHA-256 HMAC verification fail-closed on tampered or replayed requests.
* **Rate Limiting**: Sliding-window IP rate limiting blocks brute-force authentication and catalog scraping.
