# GRABBER BUSINESS OS — VERTICAL INTELLIGENCE PACKS SPECIFICATION

---

## 1. Vertical Pack Framework

Instead of building 10 disconnected software applications for different industries, Grabber Business OS implements a **Vertical Intelligence Pack** architecture (`src/lib/verticals/`). The canonical commerce core remains unified, while domain-specific parameters, KPIs, inventory rules, SEO templates, and Jarvis prompts are configured via the active pack.

```
                         GRABBER BUSINESS OS
                                  │
                   ┌──────────────┴──────────────┐
                   │  CANONICAL COMMERCE ENGINE  │
                   │ (POS, Orders, Inventory, GL)│
                   └──────────────┬──────────────┘
                                  │
                    ACTIVE VERTICAL PACK RESOLVER
                                  │
      ┌───────────┬───────────┬───┴───────┬───────────┬───────────┐
      │           │           │           │           │           │
 ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
 │ Grocery │ │ Fashion │ │Electronics│Restaurant││ Hardware│ │ General │
 └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

---

## 2. Pack Specifications

### 2.1 Grocery & Supermarkets (`GROCERY`)
* **Primary Focus**: High turnover velocity, shelf-life expiry tracking, and basket size maximization.
* **Inventory Rules**: 2-day lead time, 4-day safety stock, 14-day dead stock threshold, batch expiry date tracking enabled.
* **Domain KPIs**:
  * `EXPIRY_RISK_VALUATION`: Stock expiring within 7 days (Target: < LKR 5,000).
  * `DAILY_INVENTORY_TURNOVER`: Average units sold per active grocery SKU (Target: > 4.5 units/day).
  * `AVERAGE_BASKET_SIZE`: Items per counter checkout (Target: > 4.0 items).
* **SEO & Schema**: `Store` schema with same-day grocery delivery keywords.

---

### 2.2 Fashion & Apparel (`FASHION`)
* **Primary Focus**: Size/color variant sell-through, seasonal collection aging, and markdown depth control.
* **Inventory Rules**: 14-day lead time, 20-day safety stock, 60-day dead stock threshold.
* **Domain KPIs**:
  * `VARIANT_SELLTHROUGH_RATE`: Percentage of collection units sold within 30 days (Target: > 60%).
  * `SEASONAL_MARKDOWN_RATE`: Average discount given on end-of-season styles (Target: < 20%).
  * `REPEAT_FASHION_BUYER`: Customers buying across consecutive seasonal collections (Target: > 30%).
* **SEO & Schema**: `Product` schema with color/size variant attributes.

---

### 2.3 Electronics & Mobile Repair (`ELECTRONICS`)
* **Primary Focus**: Serialized IMEI tracking, warranty claim rates, accessory attachments, and repair ticket throughput.
* **Inventory Rules**: 7-day lead time, 14-day safety stock, 45-day dead stock threshold, serialized tracking enabled.
* **Domain KPIs**:
  * `ACCESSORY_ATTACH_RATE`: Cases/chargers sold per device checkout (Target: > 1.8 units).
  * `REPAIR_TURNAROUND_HOURS`: Hours from device check-in to ready-for-pickup (Target: < 24 hours).
  * `WARRANTY_CLAIM_RATE`: Percentage of devices returned under defect warranty (Target: < 1.5%).
* **SEO & Schema**: `Product` schema with genuine brand warranty and repair service keywords.

---

### 2.4 Restaurant, Café & KOT (`RESTAURANT`)
* **Primary Focus**: Kitchen order ticket (KOT) prep speed, table turnover velocity, raw food cost %, and peak dining hours.
* **Inventory Rules**: 1-day lead time, 2-day safety stock, 5-day dead stock threshold.
* **Domain KPIs**:
  * `TABLE_TURNOVER_MINUTES`: Minutes from seating to bill settlement (Target: < 45 mins).
  * `FOOD_COST_PERCENTAGE`: Raw ingredient cost vs menu price (Target: < 30%).
  * `KOT_PREP_TIME_MINUTES`: Minutes from KOT generation to serving (Target: < 15 mins).
* **SEO & Schema**: `Restaurant` schema with menu items, table reservation, and delivery keywords.

---

### 2.5 Hardware & Building Supplies (`HARDWARE`)
* **Primary Focus**: Contractor credit ledger aging, bulk purchasing, weight/dimension stock, and supplier price consistency.
* **Inventory Rules**: 7-day lead time, 14-day safety stock, 90-day dead stock threshold.
* **Domain KPIs**:
  * `CONTRACTOR_CREDIT_AGING`: Total outstanding contractor balance > 30 days (Target: < LKR 100,000).
  * `BULK_DISCOUNT_MARGIN`: Net margin realized on high-volume contractor orders (Target: > 18%).
  * `SUPPLIER_PRICE_VARIANCE`: Raw material cost inflation from steel/cement suppliers (Target: < 5%).
* **SEO & Schema**: `Store` schema with wholesale construction materials and site delivery keywords.

---

### 2.6 General Retail (`GENERAL_RETAIL`)
* **Primary Focus**: Omnichannel balance, customer loyalty, standard margins, and cross-sell promotions.
* **Inventory Rules**: 5-day lead time, 10-day safety stock, 45-day dead stock threshold.
* **Domain KPIs**: Omnichannel order velocity, blended gross margin (> 32%), and low stock SKU percentage (< 5%).
