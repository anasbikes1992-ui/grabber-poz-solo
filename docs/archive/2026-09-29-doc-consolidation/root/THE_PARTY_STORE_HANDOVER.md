# The Party Store Handover

## CTO Decision
Do not rebuild GrabberPoz from zero. The correct path is a controlled refactor that preserves the working POS, ERP, stock, checkout, payment, WhatsApp, Jarvis, and storefront foundations while replacing the risky catalog migration and storefront catalog layers phase by phase. The Party Store is the reference client for this migration, not a hardcoded product assumption.

## Current Code-Path Map
| Concern | Current owner files | CTO reading |
|---|---|---|
| Core schema | `src/db/schema.ts` | Products, variants, categories, stock balances, stock movements, orders, payments, and media assets already exist. Add only missing migration structures. |
| Simple catalog import | `src/lib/catalog/product-import.ts`, `src/app/api/products/import/route.ts` | Useful for simple CSV, but too direct for Party Store. It can update by SKU, flatten categories, infer stock from flags, and commit without persistent staging decisions. |
| CSV schema helpers | `src/lib/catalog/catalog-csv.ts`, `tests/catalog-csv.test.ts` | v2 headers exist as groundwork. Needs staging semantics and WooCommerce-specific contracts. |
| Storefront catalog read | `src/lib/storefront/catalog-server.ts`, `src/lib/storefront/catalog-service.ts` | Product detail has variant awareness, but the public catalog still needs a family-level projection with accurate counts and filters. |
| Storefront pages | `src/app/shop/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/components/storefront/*` | Current direction is good. Needs one-family-card catalog behavior, stronger facets, gallery ownership, and theme-controlled sections. |
| Checkout boundary | `src/app/api/pos/checkout/route.ts` and commerce services | Keep centralized. Storefront/cart must pass exact variant IDs; server must recompute price, tax, and stock. |
| Stock authority | `stock_balances`, `stock_movements`, stock tests | Catalog import must not write stock. Physical stock arrives through stock count or approved adjustment only. |

## Phase Gates
| Phase | Build slice | Required gate |
|---|---|---|
| 0. Discovery and control | Schema diff, import risk map, source files, handover, baseline tests | Written code-path map and no production writes. |
| 1. Import safety foundation | External source mapping, import runs, row staging, dry-run parser | Woo/Shopify/CSV counts are reproducible; dry-run creates no catalog or stock writes. |
| 2. Source-specific staging | Woo parent-child grouping, Shopify/sample CSV row staging, categories/tags, price rules, media queue, warnings | Source families/variants match expected counts; negative/unknown stock quarantined. |
| 3. Approval/apply | Operator decisions, category map, merge decisions, transactional apply | Same file plus decisions is idempotent; no stock ledger movements. |
| 4. Storefront projection | One public family card, variant-aware detail, filters | Gold Baubles-style variant families show one card and exact variant checkout. |
| 5. Theme and design system | Party/event theme controls, mobile filters, builder toggles | 375, 768, 1024, and 1440px smoke checks pass. |
| 6. Launch hardening | Sitemaps, redirects, dashboards, rollback drill | No broken public images, no draft leakage, monitored order/search funnel. |

## Phase 0 Findings
- The platform already has a strong normalized inventory core; rebuilding it would risk regressions in POS, accounting, payments, and stock.
- The current importer is the main danger zone for The Party Store because it is designed for fast simple imports, not audit-safe migration.
- The current importer must not be used as the final WooCommerce migration path for The Party Store.
- Existing v2 CSV headers are a good compatibility base, but they are not yet a full approval workflow.
- Storefront product detail has started moving toward variant-aware UX, but catalog listing still needs a family projection and stable filter model.
- Storefront listing now has a family-level projection helper, but full faceted filters and visual mobile smoke remain open.

## Immediate Risk Register
| Risk | Severity | Control |
|---|---:|---|
| Importer writes stock from external CSV values or flags | High | Add staging-only Woo path; stock count gate required. |
| Duplicate products from repeated imports | High | Add `(source_system, source_namespace, source_id)` identity and import-run hashes. |
| Variant families display as repeated public cards | High | Build family-level storefront projection. |
| External image URLs break or are not licensed | Medium | Owned media copy and approval before publish. |
| Manual curated prices get overwritten | Medium | Diff/approval before update; ownership rules for source fields. |
| Feature work breaks current POS/ERP flows | High | Focused tests plus typecheck after each slice. |

## Verification Baseline
Run before and after each implementation slice:

```bash
npm run typecheck
npm test -- tests/catalog-csv.test.ts tests/stock-service.test.ts tests/commerce-integrity.test.ts
```

Add focused tests per phase. Do not advance a phase with failing focused tests unless the failure is documented as unrelated and already present.

## Next Implementation Slice
Phase 1 started with import staging contracts without changing live import behavior.

Completed:

- Added `src/lib/catalog/woocommerce-staging.ts` as a pure parser/stager.
- Added `tests/woocommerce-staging.test.ts`.
- Hardened Woo CSV tokenization for multiline descriptions and quoted commas.
- Preserves source IDs, raw SKUs, parent references, regular/sale prices, category paths, tags, image URLs, row hashes, and warnings.
- Marks stock as `unknown`, `provided`, `invalid`, or `flagOnly`; this code produces no ledger writes.
- Covers source ID 45/child 46, missing child SKU fallback, blank sale price fallback, and negative stock quarantine.
- Added additive schema contracts in `src/db/schema.ts` and `drizzle/migrations/0021_party_catalog_import_staging.sql` for import runs, staged rows, and external source mappings.
- Added generic dry-run API route `POST /api/products/import/staging` for `woocommerce`, `shopify`, and `standard_csv`.
- Kept compatibility route `POST /api/products/import/woocommerce` for Woo-only callers.
- Added generic adapter tests in `tests/catalog-import-staging.test.ts`.
- Added Shopify `Variant Price` alias support in the shared CSV parser.

Real Woo file staged:

- File: `C:/Users/pc/Desktop/PC/wc-product-export-21-5-2026-1779362406402.csv`
- Rows: 460
- Variable parents: 53
- Child variations: 359
- Simple products: 48
- Orphan children: 0
- Source file hash: `7a09e36eb720ed56d50c617bfc44ded0ae81fd519a55adeb78b6f52721176f81`
- Stock statuses: 456 `flagOnly`, 3 `provided`, 1 `invalid`
- Rows without valid image URL: 178
- First family: Woo ID 45, `Metalllic Balloons 10inch 10pcs`, 18 children

Next Phase 1 slice:

- Add import rollback batch metadata before any apply path reaches production.
- Add review UI for staged rows, warning resolution, category decisions, and approved source IDs.
- Add media references after the owned-media pipeline is implemented.
- Keep existing `/api/products/import` behavior unchanged until the staging UI is ready.

Latest verification:

```bash
npm run typecheck
npm test -- tests/catalog-import-apply-plan.test.ts tests/catalog-import-staging.test.ts tests/woocommerce-staging.test.ts tests/storefront-family-catalog.test.ts tests/catalog-csv.test.ts tests/stock-service.test.ts tests/commerce-integrity.test.ts
```

Result: pass, 108 focused tests.

## Phase 3 Apply Progress
Completed:

- Added `src/lib/catalog/catalog-import-apply-plan.ts`, a pure planner for idempotent apply decisions.
- Added `src/lib/catalog/catalog-import-apply-service.ts`, which applies approved staged rows into draft products/variants.
- Added `POST /api/products/import/staging/[runId]/apply`.
- Added `tests/catalog-import-apply-plan.test.ts`.
- Existing external mappings are skipped for safe re-apply.
- SKU conflicts without a source mapping block the batch.
- Variant rows require an approved or already-mapped parent.
- Applied products and variants are created inactive/draft by default.
- Catalog apply creates source mappings but does not create stock balances or stock movements.

Still open before production apply:

- Review UI to explicitly approve staged rows and category mappings.
- Rollback batch metadata and operator-facing rollback flow.
- Owned media copy before publishing imported records.
- Full E2E with one Woo family, one Shopify/simple CSV item, and checkout variant selection.

## Grabber Poz Solo Core Next Phases
1. Generic import review UI: one admin surface for WooCommerce, Shopify, and standard CSV dry-runs, using `sourceSystem` and `sourceNamespace`.
2. Idempotent approved apply: create/update only approved staged rows, write `external_product_mappings`, and never touch stock ledger from catalog import.
3. Media ownership pipeline: fetch/validate/copy remote images into owned storage, attach approved lead/gallery images, keep failures in review.
4. Category and facet mapper: reusable mapper for category tree, tags, color, theme, number/age, pack size, and event facets.
5. Storefront family catalog finish: server-side family search/facets, one-card-per-family counts, variant-aware product detail, exact variant checkout E2E.
6. Theme/design builder: reusable storefront section toggles, product-card behavior controls, mobile preview, and reference themes per vertical.
7. Launch hardening: rollback drill, dashboard counts, no draft leakage, no broken images, post-deploy smoke, and source import audit trail.

## Phase 4 Storefront Projection Progress
Completed:

- `src/lib/storefront/catalog-service.ts` now builds one storefront catalog item per product family.
- Variant families aggregate stock and expose `unitPrice` / `unitPriceMax` for public price range display.
- Variant families no longer expose a `variantId` at card level; exact variant selection stays on product detail.
- `src/components/storefront/storefront-home.tsx` now shows `From ...` or price ranges and sends variable products to `Choose options`.
- Added `tests/storefront-family-catalog.test.ts` to prove a multi-variant product becomes one public card.
- Product detail polish: wider usable page canvas, shorter image frame, compact purchase panel, bounded variant chooser, lighter reviews, and less dominant empty-bag panel on home.
- Featured home cards now show product images and send family products to option selection instead of direct add-to-bag.

Still open:

- Server-side family-level search counts and richer facets for occasion, theme, color, number/age, pack size, and in-stock.
- Product detail gallery backed by owned media assets rather than only `products.imageUrl`.
- Checkout E2E proving exact variant ID, server-side price recomputation, and no oversell.

## Open Operator Decisions
- Confirm which WooCommerce image URLs The Party Store owns or is licensed to reuse.
- Confirm the first five pilot product families.
- Confirm category/facet mapping names for Birthday, Baby Shower, Bridal Shower, Seasonal, Graduation, color, age/number, pack size, and theme.
- Confirm whether current online payment installment blocks are enabled for this merchant before showing them publicly.
