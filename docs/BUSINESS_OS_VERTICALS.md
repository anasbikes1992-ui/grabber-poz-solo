# GRABBER BUSINESS OS — VERTICAL CONFIGURATION & ONBOARDING
**Setup Wizard, Dynamic JSON Configuration & Multi-Industry Headroom**

---

## 1. First-Run Business Setup Wizard

When a fresh instance is launched, the administrator is guided through a self-serve setup wizard at `/setup`:

```
┌──────────────────────────────────────────────────────────┐
│              WELCOME TO GRABBER BUSINESS OS              │
├──────────────────────────────────────────────────────────┤
│ 1. Select Business Vertical:                             │
│    [ Fashion ]  [ Grocery ]  [ Electronics ]             │
│    [ Restaurant ]  [ Services ]  [ Wholesale ]  [ Other ]│
│                                                          │
│ 2. Business Details:                                     │
│    Name: [ My Retail Store ]   Currency: [ LKR ]         │
│                                                          │
│ 3. Physical Locations:                                   │
│    Branches:   [+ Add Branch] (e.g. Main Street Branch)  │
│    Warehouses: [+ Add Warehouse] (e.g. Central Depot)    │
│                                                          │
│ 4. Product Catalog:                                      │
│    [ Import Excel / CSV ] or [ Start Fresh ]             │
│                                                          │
│ 5. Connect Channels & Tenders:                           │
│    ☑ Cash  ☑ Card  ☐ WebXPay  ☐ PayHere  ☑ COD          │
│    [ Connect WhatsApp QR / Cloud API ]                   │
│                                                          │
│                    [ LAUNCH BUSINESS ]                   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic Business Configuration Schema

Instead of maintaining separate codebase forks for different industries, all vertical behavior is controlled via `business_config`:

```json
{
  "vertical": "fashion",
  "features": {
    "variants": { "enabled": true, "dimensions": ["Size", "Color"] },
    "serialNumbers": { "enabled": false },
    "tableService": { "enabled": false },
    "kitchenOrders": { "enabled": false },
    "creditSalesPolimPotha": { "enabled": true, "defaultCreditLimit": 50000 },
    "deliveryTracking": { "enabled": true },
    "barcodes": { "autoGenerate": true, "format": "EAN13" }
  }
}
```

### Architectural Headroom for Restaurant & Services
* **Restaurant & Food Service:**
  * Tables & floor map layout.
  * Kitchen Order Tickets (KOT) & Kitchen Display System (KDS).
  * Product modifiers (e.g. Extra Cheese, Sugar Level, Spice Level).
  * Recipe & raw ingredient inventory depletion.
* **Services & Salons:**
  * Appointment scheduling & staff allocation.
  * Service duration tracking.
