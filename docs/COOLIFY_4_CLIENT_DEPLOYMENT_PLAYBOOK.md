# GRABBER SOLO — 4-CLIENT COOLIFY DEPLOYMENT PLAYBOOK
## Step-by-Step Operator Guide for Contabo VPS (`109.123.246.84`)

---

## 1. Overview of the 4 Client Installations

On your Contabo VPS, **Coolify** manages 4 isolated client stacks. Each client has their own Application container and their own private PostgreSQL database.

```
                    CONTABO VPS (109.123.246.84)
                                 │
                            ┌────┴────┐
                            │ Coolify │ (Web UI on :8000)
                            └────┬────┘
                                 │
     ┌───────────────────┬───────┴───────────┬───────────────────┐
     │                   │                   │                   │
┌────▼──────────┐ ┌──────▼──────────┐ ┌──────▼──────────┐ ┌──────▼──────────┐
│ CLIENT 01     │ │ CLIENT 02       │ │ CLIENT 03       │ │ CLIENT 04       │
│ShoppingStation│ │ ThePartyStore   │ │ A&S Mobiles     │ │ WowThings       │
│App + DB 01    │ │ App + DB 02     │ │ App + DB 03     │ │ App + DB 04     │
└───────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. Step 1: Create the 4 PostgreSQL Databases in Coolify

In Coolify UI (`http://109.123.246.84:8000`):

1. Click **Projects** $\to$ **POZ** $\to$ **Production**.
2. Click **+ New** $\to$ **Database** $\to$ **PostgreSQL**.
3. Create the 4 databases using the following names:

| Client ID | Database Name | Internal DB User | Internal DB Name | Docker Network |
| :--- | :--- | :--- | :--- | :--- |
| **GRB-001** | `grabber-db-01` | `postgres` | `shoppingstation_db` | Coolify internal |
| **GRB-002** | `grabber-db-02` | `postgres` | `thepartystore_db` | Coolify internal |
| **GRB-003** | `grabber-db-03` | `postgres` | `asmobiles_db` | Coolify internal |
| **GRB-004** | `grabber-db-04` | `postgres` | `wowthings_db` | Coolify internal |

> [!IMPORTANT]
> **Do not check "Publicly Accessible"**. Keep all PostgreSQL databases internal to the Docker network for total data security.

Coolify will generate internal connection strings like:
`postgres://postgres:<password>@grabber-db-01:5432/shoppingstation_db`

---

## 3. Step 2: Create the 4 Application Instances in Coolify

In Coolify UI:

1. Click **+ New** $\to$ **Application** $\to$ **Public Repository** (or **GitHub App**).
2. Repository URL: `https://github.com/anasbikes1992-ui/grabber-poz-solo.git`
3. Branch: `main`
4. Build Pack: **Dockerfile** (Coolify automatically detects the root `Dockerfile`).
5. Create 4 applications:

### Application 1: `grabber-client-01-shoppingstation`
- **Domain:** `shoppingstation.yourdomain.com` (or `http://109.123.246.84:3001`)
- **Environment Variables:**
  ```env
  NODE_ENV=production
  DATABASE_URL=postgres://postgres:<password>@grabber-db-01:5432/shoppingstation_db
  AUTH_SECRET=generate_random_32_chars_secret_here
  CRON_SECRET=generate_random_cron_secret_here
  NEXT_PUBLIC_APP_URL=https://shoppingstation.yourdomain.com
  ```

### Application 2: `grabber-client-02-thepartystore`
- **Domain:** `thepartystore.yourdomain.com` (or `http://109.123.246.84:3002`)
- **Environment Variables:**
  ```env
  NODE_ENV=production
  DATABASE_URL=postgres://postgres:<password>@grabber-db-02:5432/thepartystore_db
  AUTH_SECRET=generate_random_32_chars_secret_here
  CRON_SECRET=generate_random_cron_secret_here
  NEXT_PUBLIC_APP_URL=https://thepartystore.yourdomain.com
  ```

### Application 3: `grabber-client-03-asmobiles`
- **Domain:** `asmobiles.yourdomain.com` (or `http://109.123.246.84:3003`)
- **Environment Variables:**
  ```env
  NODE_ENV=production
  DATABASE_URL=postgres://postgres:<password>@grabber-db-03:5432/asmobiles_db
  AUTH_SECRET=generate_random_32_chars_secret_here
  CRON_SECRET=generate_random_cron_secret_here
  NEXT_PUBLIC_APP_URL=https://asmobiles.yourdomain.com
  ```

### Application 4: `grabber-client-04-wowthings`
- **Domain:** `wowthings.yourdomain.com` (or `http://109.123.246.84:3004`)
- **Environment Variables:**
  ```env
  NODE_ENV=production
  DATABASE_URL=postgres://postgres:<password>@grabber-db-04:5432/wowthings_db
  AUTH_SECRET=generate_random_32_chars_secret_here
  CRON_SECRET=generate_random_cron_secret_here
  NEXT_PUBLIC_APP_URL=https://wowthings.yourdomain.com
  ```

---

## 4. Step 3: Bootstrap Database & Import Product Catalogs

Once a client container is deployed, run the turnkey provisioning command:

```bash
# 1. Bootstrap database migrations + Row Level Security + Chart of Accounts
npm run db:bootstrap -- --rls --certify

# 2. Import products, variants, prices, and images from D:\AAA GRABBER
node scripts/import-client-catalog.mjs --manifest clients/client-001.json
node scripts/import-client-catalog.mjs --manifest clients/client-002.json
node scripts/import-client-catalog.mjs --manifest clients/client-003.json
node scripts/import-client-catalog.mjs --manifest clients/client-004.json
```

---

## 5. Step 4: Configure Automated Nightly Backups

In Coolify UI for each database (`grabber-db-01` to `04`):
1. Click the database resource $\to$ **Backups**.
2. Set Schedule: `0 2 * * *` (Runs every night at 2:00 AM UTC).
3. Set Retention: **7 days daily**, **4 weeks weekly**.
4. Test on-demand backup with **Backup Now**.

---

## 6. Step 5: Smoke Testing & Client Handover

For each deployed client URL:
1. Log in to the POS with the owner PIN (`/login` or `/pos`).
2. Scan a barcode or search a product from the imported catalog.
3. Complete a cash test sale and print/preview the receipt.
4. Verify the sale appears in `/dashboard` and double-entry General Ledger `/reports`.
