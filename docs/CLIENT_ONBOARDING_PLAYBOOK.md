# GRABBER BUSINESS OS — CLIENT ONBOARDING & DEPLOYMENT PLAYBOOK

Complete operational launch manual for deploying **Wowthings.lk**, **Shoppingstation.lk**, and future clients in < 5 minutes.

---

## 1. Active Client Deployment Profiles

### Client Profile 1: Wowthings.lk
* **Store Name:** `Wowthings`
* **Custom Domain:** `wowthings.lk` (or `store.wowthings.lk`)
* **Admin Login:** `wowthigs.lk@gmail.com`
* **Initial Password:** `Aa123456`
* **WhatsApp Hotline:** `+94750411011`
* **Catalog Dataset:** `excel/wow_products_with_images.xlsx` (1,112 Products with barcodes & categories)
* **Industry Vertical:** Apparel, Accessories & Gifts

### Client Profile 2: Shoppingstation.lk
* **Store Name:** `Shopping Station`
* **Custom Domain:** `shoppingstation.lk` (or `store.shoppingstation.lk`)
* **Admin Login:** `anasazeez1992@gmail.com`
* **Initial Password:** `Aa123456`
* **WhatsApp Hotline:** `+94779592288`
* **Catalog Dataset:** `excel/Shopping Station Products data.csv` (1,613 Products with WooCommerce image links)
* **Industry Vertical:** Supermarket, Grocery, Imported Goods & Lifestyle

---

## 2. 5-Minute 4-Step Client Launch Workflow

```mermaid
flowchart TD
    A["1. Create Supabase Project (Singapore)"] --> B["2. Run supabase_setup.sql & Seed Catalog"]
    B --> C["3. Deploy Vercel with Environment Variables"]
    C --> D["4. Connect Domain & Handover Credentials"]
```

### Step 1: Provision Supabase Database (1 minute)
1. Open [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Name: `grabber-wowthings-prod` (or `grabber-shoppingstation-prod`).
3. Region: `ap-southeast-1` (Singapore &bull; ~30ms latency to Sri Lanka).
4. Set database password: `Aa123456` (or secure custom password).

### Step 2: Provision Schema & Migrate Products (1 minute)
1. In Supabase **SQL Editor**, paste and run:
   - **`drizzle/supabase_setup.sql`** (Creates all 41 tables, indexes, Chart of Accounts, VAT 18%, and Storage buckets).
2. To import the client's catalog:
   - Run the migration generator:
     ```bash
     node scripts/migrate-client-catalog.mjs --client "Shopping Station" --file "excel/Shopping Station Products data.csv"
     ```
   - Paste the generated **`drizzle/seed_shopping_station_catalog.sql`** into the Supabase SQL Editor and click **Run**.
3. All 1,600+ products, prices, and CDN image references are live instantly.

### Step 3: Deploy on Vercel (2 minutes)
1. In Vercel, click **Add New > Project** and select `anasbikes1992-ui/grabber-business-os`.
2. Under **Environment Variables**, add:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
   NEXT_PUBLIC_APP_URL="https://shoppingstation.lk"
   ```
3. Click **Deploy**. Vercel will complete the build and assign the global CDN edge URL in ~40 seconds.

### Step 4: Bind Custom Domain & Test POS (1 minute)
1. In Vercel Project Settings > **Domains**, add `shoppingstation.lk` (or `wowthings.lk`).
2. Add the `CNAME` record in the client's DNS (Cloudflare / LK Domain Registry / GoDaddy).
3. Open `https://shoppingstation.lk/login` and test authentication with `anasazeez1992@gmail.com` / PIN `1234`.
4. Scan a barcode at `/pos`, complete a test cash sale, and verify receipt printing.

---

## 3. Remote Image Auto-Ingestion & CDN Self-Hosting

When a client provides a product catalog with image URLs from an existing WordPress/WooCommerce site:
* **The Problem:** If their old site goes offline or changes hosting, external image links break.
* **Our Built-In Solution:**
  1. The migration script parses remote URLs (`https://shoppingstation.lk/wp-content/uploads/...`).
  2. Converts paths into standardized Supabase Storage CDN URLs (`/storage/v1/object/public/products/[sku].jpg`).
  3. Product images load in < 50ms worldwide via Supabase global edge CDN without external dependency.

---

## 4. How to Onboard Future Clients (Standardized Template)

For any new client in the future:
1. **Send Questionnaire:** Provide [`docs/CLIENT_ONBOARDING_CREDENTIALS.md`](file:///d:/GRABBER%20POZ%20SOLO/docs/CLIENT_ONBOARDING_CREDENTIALS.md) to collect Store Name, WhatsApp #, and Catalog Excel/CSV.
2. **Execute Provisioning Command:**
   ```bash
   node scripts/provision-client.mjs --client "New Store Name" --slug "newstore" --domain "newstore.lk"
   ```
3. **Migrate Catalog:**
   ```bash
   node scripts/migrate-client-catalog.mjs --client "New Store" --file "path/to/catalog.xlsx"
   ```
4. **Collect Setup Fee:** Hand over the login credentials and collect the license payment.
