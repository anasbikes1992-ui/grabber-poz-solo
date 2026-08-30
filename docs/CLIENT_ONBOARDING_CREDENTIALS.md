# GRABBER BUSINESS OS — CLIENT ONBOARDING & CREDENTIALS CHECKLIST

Use this checklist when onboarding a new business client to deploy and configure their dedicated Single-Business OS instance.

---

## 1. Business Identity & Operational Profile

| Required Item | Description | Example / Notes |
| :--- | :--- | :--- |
| **Business Trading Name** | Customer-facing store name. | `Urban Trendz Flagship Store` |
| **Legal Entity Name** | Formal company registration name for invoices. | `Urban Trendz Retail Pvt Ltd` |
| **Business Registration / Tax Number** | Tax ID for receipts (VAT / SVAT). | `VAT-123456789-7000` |
| **Store Physical Addresses** | Primary flagship branch and central warehouses. | `123 Galle Road, Colombo 03` |
| **Contact Phone & Email** | Official support line & billing email. | `+94 11 234 5678`, `info@store.lk` |
| **Receipt Header & Footer** | Custom text printed on thermal 80mm/58mm slips. | Header: *Welcome to Urban Trendz*<br/>Footer: *Returns within 7 days with bill* |
| **Brand Assets** | High-resolution logo (PNG vector) & favicon. | Transparent PNG (min 512x512px) |

---

## 2. Infrastructure & Hosting Credentials

| Provider | Purpose | Required Credentials |
| :--- | :--- | :--- |
| **Domain Registrar** | Custom domain for Web Storefront (`mystore.lk`). | DNS Access (Cloudflare, GoDaddy, LK Domain Registry) to point CNAME / A records to Vercel. |
| **Supabase / PostgreSQL** | Dedicated private PostgreSQL database instance. | `DATABASE_URL` connection string with password, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| **Vercel Account** | Global edge serverless hosting. | Client Vercel Team access or managed under your master deployment agency account. |

---

## 3. Payment Gateway Credentials (Optional per Client)

| Gateway | Supported Region | Required Keys from Client |
| :--- | :--- | :--- |
| **PayHere** | Sri Lanka (Visa, Master, Frimi, Genie, EzCash) | `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, `PAYHERE_MODE` (`sandbox` or `live`). |
| **WebXPay** | Sri Lanka (Multi-bank direct debit & cards) | `WEBXPAY_SECRET_KEY`, `WEBXPAY_PUBLIC_KEY`. |
| **Stripe** | Global / USD / EUR transactions | `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |
| **Cash on Delivery (COD)** | Islandwide courier cash collections | Enabled by default (No API credentials required). |

---

## 4. Logistics & Delivery Partner Credentials

| Courier Partner | Coverage | Required Integration Keys |
| :--- | :--- | :--- |
| **Koombiyo Delivery** | Islandwide Sri Lanka | `KOOMBIYO_API_KEY`, `KOOMBIYO_MERCHANT_ID` |
| **Prompt Express** | Islandwide Sri Lanka | `PROMPT_CLIENT_CODE`, `PROMPT_API_TOKEN` |
| **Domex Courier** | Islandwide Sri Lanka | `DOMEX_API_KEY`, `DOMEX_USER_CODE` |
| **In-House Fleet** | Local radius / Same-day dispatch | Staff rider phone numbers & delivery zones. |

---

## 5. WhatsApp Hotline & Messaging

| Channel | Setup Options | Required Information |
| :--- | :--- | :--- |
| **Direct WhatsApp Link** | Instant 1-click (Zero monthly fee) | Official WhatsApp Business phone number (e.g. `+94771234567`). |
| **WhatsApp Cloud API** | Fully automated bot via Meta Graph API | `META_APP_ID`, `META_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. |

---

## 6. Initial Data Migration Template (Excel / CSV)

Request the following data in spreadsheet format for 1-click onboarding import:
1. **Product Catalog:** Product Name, Category, SKU, Barcode (if existing), Cost Price, Selling Price, Initial Stock Quantity per Branch.
2. **Customer Directory:** Full Name, Phone Number, Email, Address, Initial Polim Potha Credit Balance (if migrating existing credit accounts).
3. **Supplier Directory:** Supplier Name, Contact Person, Phone, Payment Terms (Net 15/30/60), Opening Payable Balance.
