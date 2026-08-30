# GRABBER BUSINESS OS — SYSTEM ARCHITECTURE SPECIFICATION
**Single-Business Edition: Commerce Core + Physical Operations + Jarvis Copilot + Creative Factory**

---

## 1. High-Level Architecture Diagram

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                 GRABBER BUSINESS OS                     │
                              │           Single Business / Single Database             │
                              └────────────────────────────┬────────────────────────────┘
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      │                                                                         │
        ┌─────────────▼─────────────┐                                             ┌─────────────▼─────────────┐
        │      BUSINESS ENGINE      │                                             │      CREATIVE ENGINE      │
        │  (Next.js / tRPC / Node)  │                                             │   (FastAPI / Python / GPU)│
        └─────────────┬─────────────┘                                             └─────────────┬─────────────┘
                      │                                                                         │
        ┌─────────────┼─────────────┬─────────────┬─────────────┐                         ┌─────┴─────┬─────────────┐
        │             │             │             │             │                         │           │             │
  ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐             ┌─────▼─────┐ ┌───▼───┐   ┌───▼───┐
  │Counter POS│ │ Storefront│ │ WhatsApp  │ │ Purchasing│ │  Finance  │             │Short Ads  │ │UGC    │   │Long   │
  │ (Barcode/ │ │  (Online  │ │(Commerce/ │ │& Suppliers│ │ & Polim  │             │(TikTok /  │ │Video  │   │Video  │
  │ Receipts) │ │  Checkout)│ │ Hotlines) │ │ (GRN / PO)│ │   Potha)  │             │Reels / 916│ │Story  │   │Factory│
  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘             └─────┬─────┘ └───┬───┘   └───┬───┘
        │             │             │             │             │                         │           │             │
        └─────────────┴─────────────┼─────────────┴─────────────┘                         └───────────┼─────────────┘
                                    │                                                                 │
                      ┌─────────────▼─────────────┐                                                   │
                      │  CANONICAL COMMERCE CORE  │◄──────────────────────────────────────────────────┘
                      │ (Order, Inventory, Price) │  Product / Inventory / Promotion Data
                      └─────────────┬─────────────┘
                                    │
                                    │  Authorized Typed Tools
                      ┌─────────────▼─────────────┐
                      │     JARVIS AI COPILOT     │
                      │ (Business Intel & Actions)│
                      └─────────────┬─────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │    POSTGRESQL / SQLITE    │
                      │ (Double-Entry / Auth / RLS│
                      └───────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Single Deployment, Single Database Principle
- **Zero Tenant Confusion:** One database instance represents one business.
- **Physical Hierarchy:** The single business owns unlimited **Branches** (customer-facing counters & local stocks) and **Warehouses** (bulk storage & distribution centers).
- **Zero Cross-Tenant Overhead:** No `tenant_id` or `org_id` columns cluttering the relational model. Authorization is strictly based on staff **Roles** and assigned **Location Scopes** (Branch / Warehouse).

### 2.2 Canonical Commerce Service Boundary
- All sales channels (Counter POS, Web Storefront, WhatsApp Bot, and Jarvis actions) execute the **exact same** business service layer:
  - `OrderService.createOrder()`
  - `InventoryService.reserveStock()` / `decrementStock()` / `restoreStock()`
  - `PricingEngine.calculateTotals()` (item prices, taxes, line & cart discounts)
  - `PaymentService.processPayment()` (Cash, Card, WebXPay, PayHere, Stripe, COD)
- The UI never computes trusted totals; clients submit line items and quantities, and the server validates pricing and availability.

### 2.3 Strict Separation: Business Truth vs. AI
- **Jarvis** and **WhatsApp AI** never execute raw SQL and never modify database rows directly.
- AI models interact with the system strictly through **strongly-typed tool contracts** (e.g. `get_low_stock()`, `propose_stock_transfer()`, `draft_purchase_order()`).
- Mutating and destructive operations require explicit user review and confirmation before execution.

### 2.4 Creative Factory Pipeline (Direct Python + FFmpeg)
- Zero dependency on external node graph servers (No ComfyUI).
- Direct Python inference adapter interface (`VideoProvider`) supporting:
  - **Wan 2.1 Direct Python Inference** (1.3B model for consumer GPUs ~8GB VRAM; larger models for production hardware)
  - **LTX-Video / HunyuanVideo** adapters
  - **Piper TTS** for local, offline voiceover generation
  - **FFmpeg Engine** for deterministic video assembly, timing, audio ducking, typography overlays, and multi-format rendering (9:16, 1:1, 16:9).

---

## 3. Technology Stack & Component Map

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend Web App** | React 19 / Next.js 15 / Tailwind CSS / Radix UI / Lucide | Admin Dashboard, POS Counter, Web Storefront, Creative Studio, Reporting. |
| **Backend API & RPC** | Next.js API Routes / tRPC / Node.js Server Actions | Server-side validation, business logic, payment webhooks, POS sync. |
| **Data Persistence** | PostgreSQL / Drizzle ORM (or Supabase Postgres) | ACID relational data, double-entry inventory ledger, audit logs, RLS. |
| **Creative Service** | Python 3.11 / FastAPI / PyTorch / Diffusers | Wan 2.1 inference, LTX-Video, Piper TTS, Whisper STT, FFmpeg rendering. |
| **Asynchronous Queue** | Database Job Queue / BullMQ / Redis / Server Tasks | Video rendering jobs, WhatsApp campaigns, scheduled inventory snapshots. |

---

## 4. Operational Roles & Least-Privilege Access

1. **Owner:** Unrestricted access to financials, margins, staff management, settings, and high-risk actions.
2. **Admin:** Full operational configuration, catalog management, branch/warehouse creation, and integration setups.
3. **Manager:** Supervise assigned branches/warehouses, approve staff discounts, conduct stock transfers, and view branch reports.
4. **Cashier:** Fast POS checkout, assigned register shift management, customer lookups, and basic receipt printing.
5. **Warehouse Staff:** Goods receiving (GRN), put-away, stock counts, picking, packing, and transfer fulfillment.
6. **Accountant:** Financial reports, Polim Potha credit ledger reconciliation, supplier payment tracking, and tax filing summaries.
7. **Marketing:** Creative Factory campaigns, WhatsApp broadcasts, promotional discounts, and social content generation.
