# GRABBER BUSINESS OS — CLIENT ONBOARDING & CREDENTIALS CHECKLIST

Collect these items before provisioning a dedicated instance.  
**Ops:** [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) · **Deliverables:** [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md)

---

## 1. Business identity & operations

| Required item | Description | Example |
| :--- | :--- | :--- |
| Trading name | Storefront / receipt name | `Urban Trendz` |
| Legal name | Invoices / tax | `Urban Trendz Retail Pvt Ltd` |
| Tax / VAT number | Receipts | `VAT-…` |
| Branch + warehouse addresses | Locations | Colombo 03 + warehouse |
| Phone & email | Support / billing | `+94…`, `info@…` |
| Receipt header & footer | Thermal slip text | Returns policy |
| Brand assets | Logo PNG ≥512px, favicon | Transparent PNG |
| Currency / timezone | Defaults LKR / Asia/Colombo | |
| Vertical modules sold | Flags to enable | repairs, restaurant, HP, … |
| Package | CORE / +COMMS / +SOCIAL C0–C2 | See deliverables |

---

## 2. Infrastructure

| Provider | Purpose | Credentials |
| :--- | :--- | :--- |
| Domain | Storefront URL | DNS access for Vercel |
| Supabase | Dedicated Postgres | New project; pooler `DATABASE_URL`; anon + service_role |
| Vercel | Edge host | Project or team access |

---

## 3. Payments (optional)

| Gateway | Region | Keys |
| :--- | :--- | :--- |
| **COD** | Default storefront | None |
| PayHere | LK cards / wallets | `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, `PAYHERE_MODE` — only if contracted |
| WebXPay | LK | Public/secret keys — only if contracted |
| Stripe | Global | **Not wired** for storefront unless future SOW |

---

## 4. Logistics (optional)

| Partner | Keys |
| :--- | :--- |
| Koombiyo | `KOOMBIYO_API_KEY` (+ merchant id if required by API) |
| Other couriers | Only if integration exists in app for that client |

---

## 5. WhatsApp & messaging

| Mode | Required |
| :--- | :--- |
| Storefront wa.me only | E.164 → `NEXT_PUBLIC_WHATSAPP_NUMBER` |
| Cloud API (COMMS) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (or `WHATSAPP_PHONE_NUMBER_ID`), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (if Meta requires), webhook URL `/api/whatsapp/webhook` |

---

## 6. Marketing / social (optional — `/social`)

| Item | Notes |
| :--- | :--- |
| Facebook / Instagram / TikTok / YouTube handles | Stored in Social Channel Manager |
| WhatsApp business number | Same as messaging |
| Meta Pixel + CAPI token | Pixel ID + `META_CONVERSIONS_API_TOKEN` |
| TikTok / GA4 / GTM | Pixel / measurement IDs |
| Meta Page ID / Ad Account ID | For future ads; not auto-publish today |

---

## 7. Creative (optional)

| Tier | Client / Grabber provides |
| :--- | :--- |
| C0 PDF + UGC scripts | Staff access only |
| C1 Cloud image | `FAL_KEY` or `REPLICATE_API_TOKEN` |
| C2 GPU video | Grabber/ops GPU host + `CREATIVE_WORKER_URL` |

---

## 8. Data migration files

1. **Products:** Name, Category, SKU, Barcode, Cost, Sell, Opening qty / location  
2. **Customers:** Name, Phone, Email, Address, Opening Polim balance  
3. **Suppliers:** Name, Contact, Terms, Opening AP  

Import: `npm run client:migrate -- --client "Name" --file "…csv"`

---

## 9. Staff users to create

OWNER (required), plus MANAGER / CASHIER / WAREHOUSE / ACCOUNTANT / MARKETING as needed.  
**Production PIN must not be demo `1234` after handover.**
