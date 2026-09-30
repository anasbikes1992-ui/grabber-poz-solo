# GRABBER BUSINESS OS — CLIENT ONBOARDING & DEPLOYMENT PLAYBOOK
**Turnkey Standalone Deployment in < 15 Minutes**

---

## 1. Prerequisites Checklist

Before provisioning a new client installation, collect the following:
* **Business Name & Brand Identity**: Legal name, display name, logo URL, currency (`LKR`), tax ID.
* **Target Domain**: e.g., `https://shoppingstation.lk` (for Storefront & POS access).
* **Physical Topology**: List of retail branches and distribution warehouses.
* **Database Target**: Dedicated PostgreSQL instance (Supabase project or self-hosted PostgreSQL).
* **Payment Credentials** (Optional): PayHere Merchant ID & Secret, WebXPay keys.
* **WhatsApp API** (Optional): Meta Cloud API Access Token & Phone Number ID.

---

## 2. Step-by-Step Provisioning Guide

### Step 1: Database Initialization & Migration Bootstrap

1. Create a dedicated PostgreSQL database in Supabase (or on your VPS).
2. Configure your local `.env.local` with the target connection string:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
   ```
3. Run the automated database bootstrap script:
   ```bash
   npm run db:bootstrap
   ```
   *Applies the numbered `drizzle/` migration chain and creates the current 107-table schema with RLS policies, double-entry General Ledger structures, company onboarding tables, and vertical module tables.*

---

### Step 2: Catalog Data Ingestion (CSV / Excel)

Import the client's inventory catalog:
```bash
node scripts/import-catalog-csv.mjs --file ./client_data/products.csv --branch "Main Flagship"
```
* The importer automatically validates SKU uniqueness, barcodes, positive prices, and assigns default tax profiles.
* Any formatting anomalies are logged to `reports/rejected_rows.csv` without aborting valid rows.

---

### Step 3: Production Environment Configuration

Configure production environment variables on Vercel or VPS:

```env
# Production Core Configuration
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_APP_URL="https://shoppingstation.lk"
AUTH_SECRET="[secure-64-character-random-secret]"
MASTER_ENCRYPTION_KEY="[32-byte-hex-secret-for-vault]"
NEXT_PUBLIC_STORE_NAME="Shopping Station"

# Security Gates (Strict)
NODE_ENV="production"
AUTH_OPTIONAL="false"
CRON_SECRET="[secure-cron-bearer-token]"

# Optional Integrations
PAYHERE_MERCHANT_ID="1234567"
PAYHERE_SECRET="[payhere-merchant-secret]"
WHATSAPP_PHONE_NUMBER_ID="[meta-phone-id]"
WHATSAPP_ACCESS_TOKEN="[meta-access-token]"
```

---

### Step 4: Level 4 SQL Certification & Health Gate

Run the automated certification suite against the client's live database:

```bash
# Dry run verification
npm run client:certify -- --dry-run --client "Shopping Station" --slug "shoppingstation"

# Full certification run with report generation
npm run client:certify -- --client "Shopping Station" --slug "shoppingstation"
```

The certification suite verifies 12 automated checks:
1. `SCHEMA_MIGRATIONS`: All current schema tables and foreign keys exist.
2. `RLS_POLICIES`: Row-level security active on all customer-sensitive tables.
3. `COMMERCE_ATOMICITY`: Test transaction creates order, line items, and stock movement in a single atomic commit.
4. `GENERAL_LEDGER_BALANCE`: Sum of all Debits strictly equals sum of Credits.
5. `POLIM_POTHA_LEDGER`: Customer credit balances match repayment history.
6. `TAX_PROFILE_INTEGRITY`: Active tax profiles resolve correctly for retail lines.
7. `REPAIR_PARTS_INVENTORY`: Parts issued on repair tickets decrement physical stock.
8. `APPROVAL_CENTER_GATE`: High-risk agent actions route to `APPROVAL_WAITING`.
9. `WEBHOOK_SECURITY`: Forged payment webhooks fail with 401/403.
10. `RATE_LIMIT_GATE`: API limits reject excessive burst requests.
11. `PRE_FLIGHT_ENV`: All mandatory production secrets verified.
12. `REPORT_DELIVERY`: Generates official PDF/Markdown certificate in `reports/`.

---

## 3. Handover Checklist to Business Owner

- [ ] Owner admin portal access verified (`/adminpoz` with initial secure PIN).
- [ ] Thermal receipt printer tested via WebUSB / Browser Print (`/pos`).
- [ ] Storefront domain SSL certificate active and verified.
- [ ] Cashier staff accounts configured with restricted PINs.
- [ ] Initial register shift opened with starting cash float.
- [ ] Level 4 Certification Report provided to owner.

---

## 4. First-Sale And Ops Survival Gate

Do not call a client live until this gate is complete:

- [ ] Real supervised sale completed: order -> payment/COD record -> stock movement -> shift close -> GL journal.
- [ ] First return/refund path tested on a non-critical sale.
- [ ] Encrypted backup exported from `/api/backup/export?encrypt=true`.
- [ ] Backup restore rehearsal completed against a separate test database, never the client production DB.
- [ ] `backup_records` contains the latest backup export and `/api/ops/health` reports backup status `OK`.
- [ ] Coolify scheduled task runs `npm run ops:heartbeat` every 15 minutes with `CRON_SECRET`.
- [ ] Owner/admin cookie is rotated into the monitor only if protected `/api/ops/health` checks are required.

Recommended Coolify command:

```bash
CERTIFY_HTTP_BASE_URL=https://client-domain.example CRON_SECRET=$CRON_SECRET npm run ops:heartbeat
```

Use `CERTIFY_STAFF_COOKIE` only in a private monitor environment when you need protected DB/ops checks. Never paste staff cookies into public uptime tools.
