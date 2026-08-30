# GRABBER BUSINESS OS — TECHNICAL DEPLOYMENT & CLIENT HANDOVER GUIDE

This technical guide outlines the exact 10-minute deployment procedure for launching a new client instance of Grabber Business OS Solo Edition.

---

## 1. 10-Minute Rapid Deployment Workflow

```mermaid
flowchart LR
    A["1. Provision Supabase DB"] --> B["2. Run SQL Setup Script"]
    B --> C["3. Deploy App on Vercel"]
    C --> D["4. Connect Client Domain"]
    D --> E["5. Complete Setup Wizard"]
```

### Step 1: Provision Supabase Database
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Name the project `[client-name]-business-os` (e.g. `urban-trendz-db`).
3. Select region `ap-southeast-1` (Singapore) for lowest latency to Sri Lanka (~30ms).
4. Save your database password securely.
5. In **Project Settings > Database > Connection String**, copy the `URI` (Transaction Pooler port `6543`).

### Step 2: Provision Database Schema
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard).
2. Open the file **`drizzle/supabase_setup.sql`** from your repository.
3. Paste the entire SQL script and click **Run**.
4. All 41 tables, enums, performance indexes, and initial chart of accounts will be provisioned in < 5 seconds.

### Step 3: Deploy on Vercel
1. Import your GitHub repository into [Vercel](https://vercel.com/new).
2. In the **Environment Variables** section, add:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
   NEXT_PUBLIC_APP_URL="https://[client-domain].com"
   ```
3. Click **Deploy**. Vercel will build the production bundle in ~45 seconds.

### Step 4: Connect Custom Domain
1. In Vercel Project Settings > **Domains**, add `store.[clientname].lk` or `[clientname].lk`.
2. In the client's DNS manager (Cloudflare, LK Domain Registry, GoDaddy):
   - Add `CNAME` record pointing to `cname.vercel-dns.com`
   - SSL certificates are automatically issued by Let's Encrypt within 60 seconds.

### Step 5: First-Run Onboarding Wizard
1. Open `https://[client-domain]/setup`.
2. Select the client's industry vertical (Fashion, Grocery, Electronics, Restaurant, Services, Wholesale).
3. Set store trading name, tax registration number, and receipt header/footer.
4. Click **Launch Business OS**.

---

## 2. Hardware Compatibility & Peripheral Setup

| Hardware Device | Supported Protocols | Recommended Models / Brands | Setup Instructions |
| :--- | :--- | :--- | :--- |
| **Receipt Printer (80mm / 58mm)** | USB, Bluetooth, Ethernet ESC/POS | Xprinter XP-N160II, Epson TM-T88VI, Sunmi Cloud Printer | Connect via USB or Bluetooth. Chrome / Edge will directly route print dialog to thermal paper size without margin distortion. |
| **Barcode Scanner** | USB HID (Keyboard emulation), Bluetooth 2.4G | Netum 2D Wireless Scanner, Honeywell Voyager 1200g, Zebra DS2208 | Plug & play USB receiver. Barcode scanner acts as keyboard input directly into the POS search input. |
| **Cash Drawer** | RJ11 / RJ12 (Printer kick) | Maken MK-410, Posiflex CR-4000 | Plug RJ11 cable from Cash Drawer into the thermal receipt printer's DK port. Drawer pops open automatically upon completing a cash sale. |
| **Tablet / Touch Terminal** | Web Browser (Chromium based) | iPad 10th Gen, Samsung Galaxy Tab S6/S9 Lite, Sunmi D2s Desktop POS | Open Chrome in Full-Screen Kiosk Mode. |

---

## 3. Backup, Disaster Recovery & Open Data Export

* **Automated Daily Backups:** Handled natively by Supabase PostgreSQL PITR (Point-in-Time Recovery).
* **1-Click Open Data Export:** At any time, the client can navigate to [`/settings`](https://grabber-business-os.vercel.app/settings) and click **Export All Business Data**.
  - Generates downloadable CSV / JSON packages of all Products, Customers, Orders, Stock Movements, Polim Potha Credit Ledger, and Suppliers.
  - Zero vendor lock-in.

---

## 4. Client Handover Checklist

- [ ] Super Admin owner account credentials provided (`owner@[client-name].lk` with initial PIN `1234`).
- [ ] Thermal printer test page printed successfully.
- [ ] Barcode scanner tested on 3 sample SKUs.
- [ ] Cash drawer kick trigger verified on cash sale.
- [ ] Test order placed on public storefront and verified in POS queue.
- [ ] WhatsApp notification test message verified.
- [ ] Owner trained on Polim Potha credit repayment workflow and daily Z-Report settlement.
