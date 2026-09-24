# GrabberPoz System Refactor Plan

## Decision
GrabberPoz is one company platform and every customer runs **Grabber Business OS Pro**. Clients are configured by vertical pack and import/source settings, not by feature tier. ThePartyStore is the live party/events + retail/wholesale reference client, but the core platform must stay reusable for WooCommerce, Shopify, standard CSV, and future source systems.

## CTO Operating Mode
- Keep the existing POS, ERP, checkout, stock ledger, payment, WhatsApp, Jarvis, and storefront foundation. The platform is already broad enough that a full rebuild would add risk instead of removing it.
- Rebuild only weak areas as clean subsystems: catalog staging, source identity, product-family storefront projection, guided catalog UX, storefront theme controls, and release verification.
- Every phase must have a small implementation slice, a rollback path, focused tests, and a written before/after note.
- Never import external stock quantities into the authoritative ledger without an explicit stock-count or approved adjustment workflow.
- Never mass-publish imported products. New external catalog records start as draft/review until operator approval.
- Preserve historical product IDs, order rows, payments, GL entries, and stock movements unless an owner explicitly approves a migration.
- Use reference clients to prove quality, but keep the capability source-system and namespace driven for any Grabber Business OS Pro merchant.

## Current Findings
- Staff routes resolve correctly from the header and merchant hub; the latest route audit found no missing targets.
- Checkout is centralized through `processPosCheckout` / `durableCheckout`, which is correct for POS, storefront, WhatsApp, and manual sales.
- Orders use the unified order/payment/fulfillment state machine.
- Catalog import/export is clean but too flat for enterprise catalog management: one `VariantName` text field cannot express size, color, pack quantity, event type, bundle components, media gallery, SEO, supplier, or storefront behavior.
- Product management works, but it is too dense for non-technical staff and needs a guided catalog workspace.
- Invoice printing existed as a public tracker invoice; staff order management now exposes direct invoice actions and inline line-item breakdowns.
- Storefront branding supported store name text; logo upload/display is now wired through the builder theme config and public storefront header.
- Mobile shell, storefront, and POS already use responsive grids and bottom navigation patterns, but product/catalog tables still need a card-first mobile mode for daily staff use.
- Staff navigation is complete, but the product, order, returns, and invoice flows should be presented as one guided lifecycle instead of separate isolated pages.

## Additional Improvement Areas Checked
- **Company flow:** `grabberpoz.com` should sell one Pro platform, show vertical packs, route demo/staff CTAs to the correct demo tenant, and avoid per-client hardcoded claims.
- **Client flow:** merchant starts at `/adminpoz`, lands in `/app`, runs setup, then uses POS, products, orders, returns, reports, store builder, and Jarvis from one role-aware shell.
- **Sales flow:** POS/storefront/WhatsApp orders are unified in `orders`; staff need invoice, payment, fulfillment, return, and customer follow-up actions visible from the order row.
- **Catalog flow:** current CSV is clean for bulk load, but enterprise usage needs variant grouping, category taxonomy, media completeness, SEO fields, supplier fields, bundle/package support, and rollback batches.
- **Storefront flow:** public header is clean, but theme controls should expose product-card behavior, package sections, FAQ, WhatsApp CTA, related products, delivery/pickup, and enquiry-only mode.
- **Mobile flow:** POS is usable on tablet, storefront is mobile-first, but admin catalog/order screens need card views, touch-sized actions, sticky filters, bottom actions, and no wide-table dependency on phones.

## Mobile Completion Standard
- All primary buttons and icon-only actions must be at least 44x44px.
- Tables must switch to cards on small screens or live inside clear horizontal-scroll wrappers.
- Search/filter bars must collapse into sticky mobile filter drawers.
- POS cart, checkout, product search, and payment tender must remain reachable without horizontal scrolling.
- Modals must fit 375px width, use safe-area padding, and keep the primary action sticky at the bottom.
- Mobile bottom navigation must cover the four most-used surfaces: POS, Products, Orders, Storefront.
- Staff pages must pass 375px, 768px, 1024px, and 1440px visual smoke checks.

## Phase 1 — Commerce Flow Fixes
- **Status:** Completed.
- Kept checkout, stock, payments, GL, loyalty, and automation anchored to the existing authoritative checkout repository.
- Added staff-accessible invoice viewing from Order Management.
- Added inline order breakdowns with item lines, quantities, unit price, VAT, and line total.
- Added order channel + status filtering so staff can separate POS, online, WhatsApp, pending, delivered, and cancelled orders.
- Customer-facing invoice access protected by phone/token verification.

## Phase 2 — Catalog Workspace
- **Status:** In progress.
- Backend decision: keep the current normalized inventory model because it is strong for POS, barcode, branches, variants, stock, and accounting; simplify the staff UX with guided workspaces instead of flattening the backend.
- Customer-facing decision: product pages hide ERP complexity and show clean variant choices, product media, live stock status, customization notes, delivery/pickup, FAQ, reviews, and upsells.
- CTO decision: add import staging and external source identity before any external catalog import is committed. The current generic importer remains useful for simple CSV loads, but it is not the approval-safe catalog migration path.
- Replace the single long product modal with a guided editor:
  - Basics
  - Pricing
  - Stock
  - Variants
  - Media
  - Storefront
  - SEO
  - Advanced
- Add product types:
  - Simple Product
  - Variant Product
  - Bundle / Event Package
  - Service / Repair Item
  - Rental / Appointment Item
- Keep simple product creation fast while progressively revealing advanced fields.
- Completed first mobile/tablet step: Product Manager now has a card-first mobile catalog view while retaining the dense desktop table.

## Phase 3 — CSV v2 & Catalog Staging
- **Status:** Completed foundation & staging service.
- Preserved current simple CSV for backwards compatibility.
- Implemented catalog staging tables (`catalog_import_runs`, `catalog_import_rows`, `external_product_mappings`).
- Implemented WooCommerce staging adapter and staging apply service (`src/lib/catalog/catalog-import-apply-service.ts`).
- Added a richer optional CSV schema:
  - ProductType
  - ParentSKU
  - Attribute:Size
  - Attribute:Color
  - Attribute:Theme
  - Attribute:PackQty
  - Supplier
  - WholesalePrice
  - ReorderLevel
  - MetaTitle
  - MetaDescription
  - StorefrontStatus
  - Tags
  - BundleComponents
- Import preview shows duplicates, variant grouping, missing images, invalid prices, and category suggestions before commit.
- Source-specific imports preserve source ID, raw SKU, regular/sale prices, categories, tags, image URLs, and row warnings. WooCommerce parent-child relations are preserved. No source import infers numeric stock from a status flag like `In stock?`.

## Phase 4 — Storefront Theme Controls & Visual Fidelity
- **Status:** Completed core feature set.
- Completed store branding: store logo URL/upload in Store Builder and rendered on the public storefront header with responsive fallback.
- Completed product-page consistency: product detail pages use dynamic `--sf-*` theme design tokens, public storefront shell, details, FAQ, reviews, and related-product upsells.
- Completed customer-facing stock privacy: public storefront pages show availability bands only (`In stock` for 10+, `Running out soon` for 1-9, `Out of stock` for 0 or less). Exact stock counts stay in staff/POS/admin surfaces and checkout validation (`src/lib/storefront/stock-label.ts`).
- Completed variant image resolution: extracted variation images from `attributesJson` and created interactive gallery component (`src/components/storefront/product-detail-interactive.tsx`) that automatically updates hero preview when any variant is selected.
- Storefront catalog pages render one public card per product family, with variants selected on the detail page and exact variant IDs passed into cart/checkout with live shopping bag count synchronization.
- Section toggles and product-card controls:
  - Hero banner
  - Category tiles
  - Featured products
  - Bundles/packages
  - Related products
  - FAQ
  - Reviews
  - WhatsApp CTA
  - Delivery/pickup rules

## Phase 5 — Dead Code and Docs Cleanup
- **Status:** Completed first audit pass.
- Do not delete large areas blindly.
- Archived stale strategy docs under `docs/archive/` (including `docs/archive/REFACTOR_DELETE_REGISTER_2026-09-23.md`).
- Removed/redirected duplicate routes verified by route and RBAC audit.
- Vertical modules behind feature flags are preserved as part of the Pro platform vertical pack system.

## Phase 6 — Big-Company ERP Hardening
- **Status:** In progress.
- Catalog audit log for product, price, stock, category, and variant changes.
- Approval gates for bulk price changes, destructive deletes, and stock adjustments.
- Saved views for owner, cashier, warehouse, accountant, and marketing roles.
- Import rollback batches.
- Per-client onboarding checklist: company profile, staff, catalog, payment, receipt, storefront, one sale, one return, one report.

## Phase 7 — Mobile and Tablet Finish
- **Status:** In progress.
- Mobile card view in Product Manager and Order Management.
- Sticky mobile filter bars for Products, Orders, Customers, Returns, and Reports.
- Tablet POS layout presets: 10-inch landscape, 8-inch portrait, and phone emergency checkout.
- Mobile store-builder preview toggle for 375px / 768px / desktop.
- Global mobile tap behavior, 44x44px touch targets, and horizontal overscroll protection enabled.

## Archive/Delete Policy
- Archive first, delete later.
- A file enters the archive/delete register only when a replacement owner doc or replacement route exists.
- Code is deleted only after route audit, RBAC audit, typecheck, relevant tests, and one manual smoke pass.
- Vertical modules behind feature flags are not dead code.
- Generated reports and superseded planning docs may be archived before deletion.

## Validation Gate Summary
- ✅ **Typecheck:** `tsc --noEmit` passes (0 errors).
- ✅ **API Auth Coverage:** `node scripts/api-auth-coverage.mjs` passes (153 endpoints checked).
- ✅ **Row Level Security (RLS):** `node scripts/test-rls.mjs` passes on all 95 public tables.
- ✅ **Automated Unit Tests:** `vitest run` passes 608/608 tests across 98 test files.
- ✅ **Release Gate R1:** `node scripts/release-gate.mjs r1` passes all checks.
- Manual smoke checklist:
  - POS sale
  - Order invoice
  - Return/refund
  - Product import
  - Variant product sale
  - Storefront order
  - Staff role access
