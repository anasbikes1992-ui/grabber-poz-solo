# GRABBER SOLO — VERTICAL COMMERCE ENGINE ARCHITECTURE

This document outlines the design and integration architecture for vertical retail packs extending the canonical Grabber Commerce Engine.

---

## 1. Architectural Philosophy: Canonical Core with Modular Vertical Adaptors

Vertical business domains (Grocery, Fashion, Electronics, Restaurant, Repair, Hire Purchase, Pharmacy, Rental, Auto Parts) do not fork or duplicate the core commerce engines. Instead, each vertical configures specific capability packs, metadata models, and workflow hooks on top of the canonical tables and services.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CANONICAL COMMERCE ENGINE                         │
│  • Products & Variants      • Orders & Payments     • Stock Movements  │
│  • Double-Entry GL Ledger   • Polim Potha AR        • Pricing Engine   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  GROCERY / PERISHABLE│ │  ELECTRONICS/REPAIR  │ │  RESTAURANT / CAFE   │
├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
│ • Weighted PLUs      │ │ • IMEI / Serial Track│ │ • Dining Tables      │
│ • Batch & Expiry     │ │ • Warranty Claims    │ │ • Live KDS Screens   │
│ • FEFO Wastage       │ │ • Repair Work Orders │ │ • BOM Ingredient Dedu│
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
           ▲                        ▲                        ▲
           └────────────────────────┼────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                    VERTICAL PACK REGISTRATION MATRIX                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Vertical Packs Specification

### 1. Grocery & Supermarket (`GROCERY`)
- **Weighted PLU Items:** Decimals in quantity for scale-weighed produce.
- **Batches & FEFO Expiry:** Tracking batch numbers and prioritizing stock rotation by earliest expiry.
- **Wastage & Spoilage Write-Off:** Direct routing into `damages` and shrinkage expense GL.

### 2. Fashion & Textile (`FASHION`)
- **Matrix Attributes:** Standardized dimension schemas (Size $\times$ Color $\times$ Fabric).
- **Barcode-per-Variant:** Direct single-scan resolution to the exact matrix variant ID.

### 3. Electronics & Mobile Repair (`ELECTRONICS`, `REPAIR`)
- **Serial & IMEI Tracking:** Hardware identity linked via `serialNumbers`.
- **Repair Work Orders:** Tracking intake diagnosis, technician assignments, internal parts issue, and customer collection SMS/WhatsApp.

### 4. Restaurant & Hospitality (`RESTAURANT`)
- **Interactive KDS (`/restaurant/kds`):** Real-time station filtering (`GRILL`, `BAR`, `DESSERT`, `KITCHEN`, `PACKING`), ticket bump/reopen lifecycle, prep timers.
- **Recipe BOMs:** Automatic deduction of raw ingredients (`stockMovements`) upon menu item ordering.

### 5. Hire Purchase & Installments (`HIRE_PURCHASE`)
- **Contract & Installment Schedules:** Auto-calculation of payment terms, due dates, penalty interest, and customer ledger entries.

### 6. Pharmacy, Rental & Auto Parts (`PHARMACY`, `RENTAL`, `AUTO_PARTS`)
- **Pharmacy:** Prescription capture notes and batch/lot expiration restrictions.
- **Rental:** Equipment availability calendars, security deposits, condition grading upon check-in.
- **Auto Parts:** Make/Model/Generation compatibility indexing and OEM cross-reference lookup.
