# ThePartyStore Product Proposal

**Prepared for:** ThePartyStore
**Prepared by:** Grabber MyPoz Business OS
**Deployment model:** Dedicated single-business app + dedicated database
**Status:** Ready for Coolify deployment after credentials and runtime env are provided

## Executive Summary

ThePartyStore should launch on **Grabber MyPoz Business OS — Solo Edition** as a dedicated party-supplies POS and online storefront. The system uses one isolated application and one isolated database for this client, with the same reusable product codebase that can later be sold to other merchants through client-specific manifests and setup scripts.

This is the best win-win approach:

- ThePartyStore gets a branded shop, POS receipt flow, catalog import, inventory foundation, and sales operations in one system.
- Grabber keeps one maintainable product codebase, avoiding one-off custom forks for every client.
- Future clients can be onboarded faster by repeating the same manifest, asset, storefront, and certification workflow.

## Proposed Product

**Product name:** Grabber MyPoz Business OS — Solo Edition
**Client instance:** ThePartyStore
**Storefront domain target:** `https://thepartystore.grabberpoz.com` unless a custom client domain is supplied
**Primary vertical:** General retail / party supplies
**Main sales modes:** Counter POS, COD storefront, WhatsApp-assisted sales

## Included Scope

### 1. Storefront

- White-label ThePartyStore branding.
- Party-themed `party-pop` design preset.
- Product catalog at `/shop`.
- Search by product name, SKU, and category.
- Category filters for party segments.
- Product cards with image, price, stock, SKU, and add-to-bag.
- Cart drawer and storefront checkout foundation.
- Hero/banner sections using matched product images.
- WhatsApp CTA support once the WhatsApp number/token is provided.

### 2. POS

- Counter sale screen.
- Barcode/SKU product lookup.
- Cash/card/credit tender handling.
- Discount handling.
- Shift and offline queue support from the base system.
- Thermal receipt output for 80mm and 58mm printers.
- Receipt layout aligned to the supplied sample: order number, counter, operator, product table, net amount, payments, cash/change.

### 3. Catalog & Images

- Import from `D:\AAA GRABBER\ThePartyStore\wc_import_ready.csv`.
- Image matching from `D:\AAA GRABBER\ThePartyStore\TPSproduct_images`.
- Public image path under `/uploads/clients/thepartystore/products`.
- Automatic party category inference.
- Duplicate WooCommerce SKU protection by generating unique SKU suffixes.
- Default stock fallback for missing stock values.
- Missing-image report for manual correction.

### 4. Business Profile

- Business name: `ThePartyStore`.
- Legal name placeholder: `The Party Store Sri Lanka`.
- Currency: `LKR`.
- Timezone: `Asia/Colombo`.
- Receipt header and footer configured through business profile.
- General-retail vertical flags enabled, unrelated verticals disabled by default.

### 5. Deployment & Operations

- Coolify deployment playbook.
- Environment validation.
- Database migration sequence.
- Catalog import sequence.
- Client certification and smoke-test sequence.
- Persistent image storage plan.

## Current Implementation Status

| Area | Status | Notes |
|---|---:|---|
| Client manifest | Done | `clients/client-002.json` |
| Product CSV parsing | Done | 4,061 rows parsed |
| Image matching | Done | 4,049 exact, 6 fuzzy, 6 missing |
| Image copy | Done locally | 4,025 files copied to public upload path |
| Category inference | Done | Party-specific category rules |
| SKU dedupe | Done | Duplicate SKUs handled during import |
| Storefront preset | Done | `party-pop` |
| White-label storefront name | Done | ThePartyStore supported in theme |
| POS receipt correction | Done | Sample-style thermal receipt |
| TypeScript validation | Passed | `npm run typecheck` |
| Targeted tests | Passed | `a11y-smoke` and `pos-hardware` |
| Production build | Passed | Requires larger Node heap on this repo |

## Catalog Readiness

- Total CSV rows: `4,061`
- Copied product images: `4,025`
- Source image folder size: about `264 MB`
- Missing-image items:
  - Hollywood Film Festival Photo Props
  - Daisy Flower Candy Color Foil Balloon (Purple)
  - Monkey Shape Foil Balloon
  - Standing Leopard Foil Balloon
  - Standing Lion Foil Balloon
  - Silver Star Design Napkins

These six products can still be sold; they will simply need replacement images or will show the product placeholder until corrected.

## Suggested Store Categories

1. Balloons
2. Birthday
3. Baby Shower
4. Tableware
5. Cake & Candles
6. Banners & Backdrops
7. Costumes & Wearables
8. Theme Party Kits
9. Seasonal & Halloween
10. Gift Bags & Wrapping
11. Decorations
12. Party Essentials

## Deployment Plan

### Phase 1 — Coolify Provisioning

1. Create a new Coolify project/app for ThePartyStore.
2. Attach the Git repository or deploy from the approved source.
3. Add a dedicated PostgreSQL resource or provide a dedicated external `DATABASE_URL`.
4. Add runtime-only environment variables.
5. Add persistent storage for `/app/public/uploads`.
6. Configure domain and SSL.

### Phase 2 — App Setup

```powershell
npm run env:validate -- --production
npm run db:migrate
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json
```

### Phase 3 — Assets & Catalog

1. Sync local image folder to the Coolify persistent volume:
   - source: `D:\GRABBER POZ SOLO\public\uploads\clients\thepartystore\products`
   - target: `/app/public/uploads/clients/thepartystore/products`
2. Import catalog:

```powershell
node scripts/import-client-catalog.mjs --manifest clients/client-002.json
```

### Phase 4 — Certification

```powershell
npm run client:certify
npm run ops:smoke
```

### Phase 5 — Client Acceptance

- Test storefront product browsing.
- Test add-to-bag and checkout flow.
- Test POS sale.
- Print sample 80mm receipt.
- Print sample 58mm receipt if required.
- Confirm product/category/image correctness.
- Confirm domain and SSL.
- Confirm backup/export plan.

## Coolify Credentials & Access Needed

Please do **not** paste passwords or tokens directly in normal chat. Share them through a password manager, secure note, or temporary credential method.

### Required

| Item | Why Needed |
|---|---|
| Coolify URL | To access the deployment dashboard |
| Coolify account access or temporary invite | To create/update app, env, volume, domain, and logs |
| Target project/team name | To place ThePartyStore in the correct Coolify project |
| Git repository access | To deploy the correct code version |
| Production domain | Example: `thepartystore.grabberpoz.com` or client-owned domain |
| DNS provider access or DNS change permission | To point domain to Coolify |
| Dedicated PostgreSQL details | `DATABASE_URL`, or permission to create a Coolify Postgres resource |
| Runtime environment values | Auth, encryption, app URL, cron, payment/WhatsApp if enabled |
| Persistent storage permission | Needed for product images under `/app/public/uploads` |

### Runtime Environment Values

Minimum:

```env
NODE_ENV=production
LANDING_MODE=storefront
NEXT_PUBLIC_APP_URL=https://thepartystore.grabberpoz.com
DATABASE_URL=
AUTH_SECRET=
MASTER_ENCRYPTION_KEY=
CRON_SECRET=
```

Recommended:

```env
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=thepartystore-production
NEXT_PUBLIC_STORE_NAME=ThePartyStore
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

Optional integrations:

```env
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
WEBXPAY_MERCHANT_ID=
WEBXPAY_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

### Optional But Useful

| Item | Why Useful |
|---|---|
| VPS SSH access | Faster image sync, disk checks, and emergency troubleshooting |
| Coolify server resource limits | To size memory/build settings correctly |
| Backup storage details | To configure off-box backups later |
| Sentry project access | To verify production errors |
| Client logo/contact details | To finalize store and receipt branding |
| WhatsApp Business details | To activate customer chat/order notifications |
| Payment gateway merchant approval | Needed before enabling online card payments |

## Build Requirement

This repository builds successfully, but on this machine it required a larger Node heap during static generation:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
npm run build
```

For Coolify, set build memory high enough or add:

```env
NODE_OPTIONS=--max-old-space-size=8192
NEXT_TELEMETRY_DISABLED=1
```

## Commercial Packaging

### Pilot Package

Includes:

- POS
- Product catalog import
- Branded storefront
- COD/cart flow
- Receipt setup
- Basic categories and image matching
- Deployment on dedicated instance
- Initial handover and smoke test

Excludes unless separately enabled:

- Online card payments
- Full WhatsApp automation
- Courier API automation
- Advanced accounting/payroll
- Custom mobile app
- Unlimited manual product cleanup

### Suggested Pricing Structure

Use separate line items:

1. Software license / setup fee
2. Catalog migration and image cleanup
3. Deployment and domain setup
4. Training and go-live support
5. Monthly hosting, monitoring, backup, and maintenance
6. Optional add-ons: WhatsApp, payment gateway, creative/social, advanced reports

## Acceptance Criteria

ThePartyStore is ready for handover when:

- `/shop` loads on the production domain.
- Storefront shows ThePartyStore branding.
- Product images load from `/uploads/clients/thepartystore/products`.
- Catalog import count is close to 4,061 products.
- Missing-image report is reviewed.
- POS can complete a cash sale.
- Receipt prints with order number, operator, counter, payments, and change.
- `/api/health` is healthy.
- `client:certify` passes with no P0 blockers.
- Client confirms the first real sale and receipt output.

## Final Recommendation

Proceed with Coolify deployment after receiving secure access and runtime configuration. Keep this ThePartyStore setup as the first reusable client onboarding template for future merchants.
