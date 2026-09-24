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
- **Status:** Completed first staff workflow pass.
- Keep checkout, stock, payments, GL, loyalty, and automation anchored to the existing authoritative checkout repository.
- Added staff-accessible invoice viewing from Order Management.
- Added inline order breakdowns with item lines, quantities, unit price, VAT, and line total.
- Added order channel + status filtering so staff can separate POS, online, WhatsApp, pending, delivered, and cancelled orders.
- Keep customer-facing invoice access protected by phone/token verification.

## Phase 2 - Catalog Workspace
- **Status:** In progress.
- Backend decision: keep the current normalized inventory model because it is strong for POS, barcode, branches, variants, stock, and accounting; simplify the staff UX with guided workspaces instead of flattening the backend.
- Customer-facing decision: product pages must hide ERP complexity and show clean variant choices, product media, live stock, customization notes, delivery/pickup, FAQ, reviews, and upsells.
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

## Phase 3 — CSV v2
- **Status:** In progress.
- Preserve the current simple CSV for compatibility.
- Treat v2 and WooCommerce migrations as staging inputs first, not direct database writes.
- Add a richer optional CSV schema:
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
- Import preview must show duplicates, variant grouping, missing images, invalid prices, and category suggestions before commit.
- Source-specific imports must preserve source ID, raw SKU, regular/sale prices, categories, tags, image URLs, and row warnings. WooCommerce parent-child relations must be preserved. No source import may infer numeric stock from a status flag like `In stock?`.
- Completed first groundwork: v2 headers and version detection exist in the shared CSV module without changing v1 import/export behavior.

## Phase 4 — Storefront Theme Controls
- **Status:** In progress.
- Completed first branding step: store logo URL/upload is available in Store Builder and rendered on the public storefront header.
- Completed first product-page consistency step: product detail pages now use storefront theme tokens, public storefront shell, richer variant display, image area, details, FAQ, reviews, and related-product upsells.
- Storefront catalog pages should render one public card per product family, with variants selected on the detail page and exact variant IDs passed into cart/checkout.
- Add toggles per storefront section:
  - Hero
  - Category tiles
  - Featured products
  - Bundles/packages
  - Related products
  - FAQ
  - Reviews
  - WhatsApp CTA
  - Delivery/pickup rules
- Add product-card controls:
  - Show price
  - Show stock badge
  - Show variant chips
  - Add to cart
  - WhatsApp enquiry
  - Enquiry-only mode

## Phase 5 — Dead Code and Docs Cleanup
- Do not delete large areas blindly.
- Archive stale strategy docs under `docs/archive/` only after confirming the current replacement doc.
- Remove or redirect duplicate pages only when route audit, RBAC audit, and tests prove they are unused.
- Keep vertical modules that are behind flags; they are not dead code if they are part of the Pro platform pack system.

## Phase 6 — Big-Company ERP Hardening
- Add catalog audit log for product, price, stock, category, and variant changes.
- Add approval gates for bulk price changes, destructive deletes, and stock adjustments.
- Add saved views for owner, cashier, warehouse, accountant, and marketing roles.
- Add import rollback batches.
- Add per-client onboarding checklist: company profile, staff, catalog, payment, receipt, storefront, one sale, one return, one report.

## Phase 7 — Mobile and Tablet Finish
- **Status:** In progress.
- Add a mobile card view to Product Manager and Order Management.
- Add sticky mobile filter bars for Products, Orders, Customers, Returns, and Reports.
- Add tablet POS layout presets: 10-inch landscape, 8-inch portrait, and phone emergency checkout.
- Add a mobile store-builder preview toggle for 375px / 768px / desktop.
- Add Playwright/mobile smoke screenshots for `/shop`, `/products/[slug]`, `/pos`, `/products`, `/orders`, and `/store/builder`.
- Completed first mobile hardening: global mobile tap behavior and horizontal overscroll protection are enabled.

## Archive/Delete Policy
- Archive first, delete later.
- A file enters the archive/delete register only when a replacement owner doc or replacement route exists.
- Code is deleted only after route audit, RBAC audit, typecheck, relevant tests, and one manual smoke pass.
- Vertical modules behind feature flags are not dead code.
- Generated reports and superseded planning docs may be archived before deletion.

## Validation Gate
- Typecheck must pass.
- API auth coverage must pass.
- Route-link audit must show no missing staff routes.
- Focused tests for the touched phase must pass before moving to the next phase.
- Import work must prove idempotence: same file and same decisions produce no duplicate products, variants, media links, or stock movements.
- Storefront work must prove variant accuracy: cart and checkout hold exact variant IDs and server-side price/stock are recomputed.
- Manual smoke must cover:
  - POS sale
  - Order invoice
  - Return/refund
  - Product import
  - Variant product sale
  - Storefront order
  - Staff role access

## Current Validation Notes
- `npm run typecheck` passes.
- Focused Vitest coverage passes for catalog CSV, release gate checks, and HTTP auth security tests.
- `node scripts/api-auth-coverage.mjs` passes.
- `npm run build` timed out locally without emitting an actionable compile error; rerun in CI/Coolify build logs after pushing.
- `npm run release:gate-r1` stops at `db:test-rls` because 37 optional/vertical tables still need production RLS enablement or an explicit deferral policy.
