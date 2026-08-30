# Grabber Business OS (Solo Edition)

> The all-in-one Single-Business Operating System for retail, fashion, supermarkets, restaurants, and wholesalers.

[![Production Deployment](https://img.shields.io/badge/Vercel-Live_Production-black?logo=vercel)](https://grabber-business-os.vercel.app)
[![Tests](https://img.shields.io/badge/Vitest-13%2F13_Passing-brightgreen)](https://github.com/anasbikes1992-ui/grabber-business-os)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_0_Errors-blue)](https://github.com/anasbikes1992-ui/grabber-business-os)

---

## 🚀 Key Modules & Production Surfaces

* **Counter POS:** High-speed barcode scanning, split payments (Cash, Card, Credit, Online, COD), shift float tracking, and thermal receipt printing.
* **Register Shifts & Z-Report:** Server-enforced shift opening/closing, petty cash expense recording, drawer variance audit, and daily settlement slips.
* **Polim Potha (Customer Credit AR):** 0–30, 31–60, 61–90, 90+ day aging buckets, credit limits, and cash repayment journal postings.
* **Web Storefront & Visual Builder:** Live public catalog, Schema.org JSON-LD SEO tags, shopping bag drawer, theme customizer, and 1-click WhatsApp checkout.
* **Physical Stock & Dual Ledgers:** Multi-location on-hand/reserved/available balances, immutable movement ledger, and inter-branch transfers.
* **Purchasing & Supplier AP:** Purchase order lifecycle, landed cost calculation, and Goods Receipt Note (GRN) receiving.
* **General Ledger & Financials:** Chart of Accounts hierarchy, Profit & Loss Income Statement, and double-entry balance validation ($\sum \text{Dr} = \sum \text{Cr}$).
* **Customer Loyalty & Coupons:** Tiered rewards (Silver, Gold, Platinum) with 1 pt = LKR 1 redemption, plus percentage and fixed promo codes.
* **Logistics & Delivery Board:** Courier tracking (Koombiyo, Prompt Express, Domex), dispatch board, and Cash on Delivery (COD) reconciliation.
* **Creative Studio:** AI video campaign generator (Wan 2.1 / LTX / FFmpeg), script director, and central brand Media Library.
* **Super Admin Login:** Role-based access control (`OWNER`, `MANAGER`, `CASHIER`, `WAREHOUSE`, `ACCOUNTANT`, `MARKETING`) with staff security PINs.

---

## 🛠️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Run test suite
npm test

# 4. Generate SQL migrations
npm run db:generate
```

---

## 📜 Documentation

* [Client Onboarding & Credentials Checklist](docs/CLIENT_ONBOARDING_CREDENTIALS.md)
* [Go-To-Market & Marketing Plan](docs/GTM_MARKETING_PLAN.md)
* [Technical Deployment & Handover Guide](docs/TECHNICAL_HANDOVER_GUIDE.md)
* [Supabase Clean SQL Setup Script](drizzle/supabase_setup.sql)
