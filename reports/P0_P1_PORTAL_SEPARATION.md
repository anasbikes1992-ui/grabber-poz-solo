# P0/P1: COMPANY PORTAL & ROUTE SEPARATION REPORT

**Milestone:** P0 / P1 — Portal Separation & GrabberPoz.com Company Landing Page  
**Date:** 2026-09-03  
**Status:** 🟢 **READY — FULLY CERTIFIED**  
**Architecture:** Single-Business Standalone Installation (`ONE DB -> ONE BIZ -> ONE INSTALL`)  
**Commerce Foundation:** M3 Commerce Integrity (CERTIFIED & FROZEN)  
**Payment Gateway:** M4 Payment Gateway Adapter Framework (CERTIFIED & FROZEN)  
**Promotion Engine:** M5 Storefront Promotion & Conversion Engine (CERTIFIED & FROZEN)  
**Installation Identity:** M6 Installation Identity & Licensing (CERTIFIED & FROZEN)  

---

## 1. Architectural Problem & Resolution

### The Problem
Previously, the application root (`/`) was hardcoded to render the sample merchant clothing shop ("Shopping Station"). Commercial retail merchants visiting `grabberpoz.com` saw clothing products and a shopping bag rather than the **Grabber POZ Software Product Platform**.

### The Resolution (P0 / P1)
Established strict, clean route and portal separation:

```text
GRABBER POZ PLATFORM
     │
     ├── grabberpoz.com (or root '/')
     │      └── SOFTWARE COMPANY WEBSITE (P1)
     │            • Hero: "The All-in-One Retail & Commerce OS for Sri Lanka"
     │            • Feature Matrix (POS, Polim Potha, Multi-Branch, Warehouses)
     │            • Sri Lanka Payment Gateways Showcase
     │            • Hardware Counter Compatibility
     │            • Transparent Commercial Packages (Standard, Pro, Enterprise)
     │            • Interactive Demo Launchers
     │            • "Start Your Business" Lead Capture Form
     │
     ├── /shop (and /store redirect)
     │      └── MERCHANT STOREFRONT (P0)
     │            • Full Customer E-Commerce Catalog
     │            • Product Search & Filter
     │            • Bag Details & Slide-out
     │            • Authoritative M5 Discount & M3 Tax Checkout
     │
     ├── /adminpoz
     │      └── STAFF & ADMIN AUTHENTICATION
     │            • Isolated Staff Authentication (PIN + Role)
     │            • Direct Redirect to Cashier POS, Inventory, or Management
     │
     └── /shop/login
            └── SHOPPER ACCOUNT AUTHENTICATION
                  • Customer OTP & Order Tracking
```

---

## 2. Route Matrix & Behaviour

| Route | Former Behaviour | New Behaviour | Access Level |
|:---|:---|:---|:---:|
| **`/`** | Demo Clothing Storefront | **Grabber POZ Software Company Landing Page** | Public |
| **`/shop`** | 404 / Missing route | **Merchant Customer Storefront Catalog** | Public |
| **`/store`** | Redirected to `/` | Redirects to `/shop` | Public |
| **`/shop/checkout`** | Storefront Checkout | Storefront Checkout with M5 Promo Engine | Public |
| **`/adminpoz`** | Staff Login | Staff Login + Demo Cashier Access | Public |
| **`/shop/login`** | Shopper Login | Shopper Login (Isolated from Staff) | Public |
| **`/api/company/leads`** | None (New) | Lead Capture API for Commercial Sales | Public |
| **`/api/settings/installation`** | None (M6) | Authoritative Installation Identity | Staff Only |

---

## 3. GrabberPoz.com Company Landing Page Architecture (P1)

1. **Hero Positioning:**
   - Headline: *The All-in-One Retail & Commerce OS for Sri Lanka*
   - Subtitle: *Run your shop counter, touch POS, barcodes, inventory, customer credit (Polim Potha), online store, and local payment gateways from one connected, standalone system.*
   - CTAs: "Start Your Business", "Try Live Cashier POS", "Launch Store Demo".
2. **Real-time System Backbone Showcase:**
   - Visual architectural connectivity between Counter POS, Warehouses & GRN, Polim Potha, Synced Storefront, and Sri Lankan Gateways.
3. **Core Feature Deep-Dives:**
   - **Counter POS:** Instant barcode scanning, split tender, 58mm/80mm thermal receipts, cash drawer float, shift reconciliation.
   - **Polim Potha:** Digital customer credit book, credit limits, outstanding balances, partial cash/card repayments, statement printing.
   - **Multi-Branch & Warehouses:** Inter-branch stock transfers, GRN receiving, inventory valuation.
   - **Hardware Counter Compatibility:** Standard USB/Bluetooth scanners, ESC/POS printers, RJ11 drawers, touch monitors.
   - **Sri Lanka Payments Ecosystem:**
     * COD (*Production Ready*)
     * PayHere (*Regression Certified*)
     * WebXPay, Koko BNPL, Mintpay, Payzy (*Sandbox Ready*)
4. **Transparent Packages (No "Dedicated Database" Enterprise Trap):**
   - **Standard Edition:** 1 branch, unlimited cashier registers, touch POS, inventory, variants & barcodes, customer database, storefront, basic promotions, thermal receipts, perpetual license.
   - **Pro Edition (Most Popular):** Multi-branch, warehouse transfers, Polim Potha credit ledger, advanced promotions engine, Sri Lanka payment gateways, WhatsApp commerce, VAT & tax invoices.
   - **Enterprise Edition:** Custom business workflows, custom API connectors, custom deployment assistance, dedicated SLA & priority support.
   *(Every installation runs on its own standalone private Postgres database)*.
5. **Interactive Demo Launchers:**
   - "Storefront Demo" $\rightarrow$ `/shop`
   - "Counter Cashier POS" $\rightarrow$ `/adminpoz`
6. **Commercial Lead Capture:**
   - Integrated form posting to `/api/company/leads` with instant validation and audit trail.

---

## 4. Certification & Regression Evidence

| Gate / Suite | Command | Result | Verification Notes |
|:---|:---|:---:|:---|
| **TypeScript Compilation** | `npx tsc --noEmit` | **PASS** | 0 errors across entire workspace |
| **Vitest Master Suite** | `npx vitest run` | **50/50 PASS** | **354 / 354 tests passing (100% green)** |
| **Portal Separation Tests** | `tests/portal-routing.test.ts` | **3/3 PASS** | Route separation & lead capture validated |
| **M3 Commerce Regression** | `npm run release:gate-m3` | **118/118 PASS** | **Zero regression** on CI-001 through CI-012 |
| **M5 Promotion Regression** | `npm run release:gate-m5` | **15/15 PASS** | Zero regression on PI-001 through PI-012 |
| **M6 Installation Regression**| `npm run release:gate-m6` | **6/6 PASS** | Zero regression on standalone licensing |
| **Next.js Production Build** | `npm run build` | **PASS** | 178/178 routes compiled cleanly |
| **API Auth Coverage** | `npm run auth:coverage` | **108/108 PASS** | 100% route classification maintained |

---

## 5. CTO Audit Scorecard

```text
P0/P1 PORTAL SEPARATION

TypeScript              PASS
Tests                   PASS (354/354)
M3 Commerce             PASS (118/118)
M4 Payments             PASS
M5 Promotions           PASS (15/15)
M6 Installation         PASS (6/6)
Auth Coverage           PASS (108/108)
Routing                 PASS (/, /shop, /adminpoz, /shop/login)
Storefront              PASS (/shop)
Company Landing Page    PASS (/)

Overall:
READY 🟢
```
