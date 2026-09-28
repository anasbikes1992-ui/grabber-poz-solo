# Grabber Business OS

## Plain-English Summary

Grabber Business OS is a complete retail and commerce operating system for a single business at a time.

It helps a shop owner run:

- Counter POS sales
- Online storefront orders
- Products, barcodes, stock, warehouses, and transfers
- Customer credit books, called Polim Potha
- Returns, refunds, shifts, and daily reports
- Suppliers, purchase orders, GRN stock receiving, and accounts payable
- Staff users, roles, PINs, settings, backups, and audit logs
- Business-specific modules like fashion, grocery, restaurant, mobile repair, pharmacy, jewelry and watches, rentals, appointments, and warranties

The product model is simple:

One client gets one app and one isolated database.

There is no shared client database. The company app at `grabberpoz.com` is for Grabber POZ sales, demos, leads, client provisioning, and deployment tracking. Each customer business gets its own separate app/database when onboarded.

## Who It Supports

Grabber Business OS is built for small and medium Sri Lankan retail businesses that need one connected system instead of separate POS, Excel sheets, WhatsApp order tracking, stock books, and credit ledgers.

Primary customer types:

- Fashion and apparel shops
- Party and event stores
- Jewelry and watch shops
- Electronics and mobile repair shops
- Grocery, supermarket, and FMCG shops
- Restaurant and cafe businesses
- Wholesale and hardware businesses
- Pharmacy and healthcare retailers
- Service businesses that need bookings, repairs, warranties, or rentals

## What The Company Site Does

`grabberpoz.com` is the company and sales site. It supports:

- Landing page for prospects
- Lead capture form
- Company lead CRM at `/company/leads`
- Company settings and logo/profile setup
- Client provisioning register at `/company/clients`
- Deployment register at `/company/deployments`
- Demand planning and replenishment review
- SuperAdmin command center at `/company/admin`
- Roadmap and SOP view at `/company/roadmap`

The screenshot showing “Client provisioning schema is pending” means the live database still needs `npm run db:bootstrap`. The code has the migration files in the correct order.

## What The Staff App Does

The staff app is the operating screen for a client business.

Core workflows:

1. Add products and categories.
2. Sell through POS or storefront.
3. Track stock by warehouse or branch.
4. Receive stock through purchase orders and GRN.
5. Close shifts and reconcile cash.
6. Manage customers and credit.
7. Handle returns and refunds.
8. View reports and tax summaries.
9. Configure vertical modules based on business type.

## Client Catalog Onboarding

Grabber POZ can onboard a client's existing catalog through one universal import flow.

It supports:

- WooCommerce product exports.
- Existing POS CSV exports like WowThings.
- General product CSVs.
- Products, variants, and service-style catalog rows.
- Cost, selling price, wholesale price, supplier, category, barcode, images, and stock review.

The importer does not blindly trust old data. It stages the catalog first, shows warnings, and only applies risky stock or generated SKUs after staff approval. This is important for client handover because opening stock, duplicate barcodes, missing SKUs, and bad expiry dates must be reviewed before the system becomes the client's live source of truth.

## Current Business Logic Position

The core business idea is aligned:

- Full package Pro is the product.
- Business type is selected through settings and vertical modules.
- Storefront themes and layout templates support business-specific presentation.
- Party Store remains isolated and should not be changed by POZ company work.
- Each future client gets a fresh Coolify app and fresh Postgres database.
- Demand planning is advisory first. It can create draft purchase orders only by explicit staff action.
- Stock changes only through canonical stock flows like checkout, GRN, transfer, return, or stock take.

## Monetization Plan

Grabber POZ should be sold as a full business operating system, not as small separate modules.

Recommended offer:

- One-time setup fee for onboarding, data import, branding, and training.
- Monthly subscription for hosting, updates, support, backups, and maintenance.
- Quoted implementation extras for hardware, barcode printers, payment gateway setup, WhatsApp automation, custom storefront polish, data cleanup, extra training, and additional branches. These do not create lower or higher software packages.

Suggested pricing shape:

- One software product: Grabber Business OS Pro.
- One commercial base: license/setup plus monthly hosting, updates, support, backups, and maintenance.
- Variable implementation scope: migration size, custom domain, payment gateway, advanced storefront, hardware, training, branch count, and vertical depth are quoted as services around the same Pro platform.

The strongest sales message:

Grabber POZ replaces the shop counter system, stock book, credit book, basic online store, purchase notebook, and daily report sheet with one connected business OS.

## Remaining Product Milestones

1. Run live database bootstrap on POZ production.
   - Fixes pending company tables like `company_clients`.
   - Applies demand planning and replenishment review migrations.

2. Full purchase approval workflow.
   - Add approval states before GRN/payment.
   - Keep stock receiving inside GRN only.

3. Forecast accuracy reporting.
   - Track forecast versus actual sales.
   - Add WMAPE and bias metrics.

4. Supplier intelligence.
   - Supplier scorecards.
   - Cost variance alerts.
   - Lead time defaults.

5. Security and production polish.
   - Endpoint rate limits.
   - Input validation coverage.
   - Secret scan.
   - Dependency audit.
   - Upload safety audit.

6. Documentation cleanup.
   - Keep a small set of current SSOT docs.
   - Move old planning docs into `docs/archive`.
   - Keep this file as the plain business overview.

7. Catalog import workspace polish.
   - Better review UI for generated SKUs, duplicate barcodes, negative stock, and media galleries.
   - Import rollback batches.
   - Client-specific dry-run reports before go-live.

## Current Verdict

The codebase is now aligned with the Grabber Business OS idea.

The biggest immediate operational issue is not code structure. It is that the live POZ database shown in the browser has not yet run all pending migrations. Run `npm run db:bootstrap` on the live POZ app database after deploy.
