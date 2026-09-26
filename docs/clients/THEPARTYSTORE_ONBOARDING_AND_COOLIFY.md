# ThePartyStore Onboarding & Coolify Playbook

## Recommendation

The best win-win path is to keep Grabber as one reusable **Grabber Business OS Pro** product, then onboard each merchant with a small manifest, a repeatable catalog import, a storefront preset, and client-specific assets. For ThePartyStore, use the Party/Event + Retail pack with party-specific categories, product images matched by product name, and a white-label `party-pop` storefront theme.

## Live Handover Status

Updated 2026-09-26:

- `https://thepartystore.grabberpoz.com`, `/shop`, `/adminpoz`, and `/api/health` return HTTP 200.
- `/api/health` reports the database connected.
- The storefront renders ThePartyStore branding, `party-pop` visual preset, party categories, product links, and WhatsApp.
- Coolify still reports `running:unknown` because the health check path is `/`; set it to `/api/health` during the next maintenance pass.

## What Is Configured

- Client manifest: `clients/client-002.json`
- Source catalog: `D:\AAA GRABBER\ThePartyStore\wc_import_ready.csv`
- Source images: `D:\AAA GRABBER\ThePartyStore\TPSproduct_images`
- Public image base: `/uploads/clients/thepartystore/products`
- Storefront preset: `party-pop`
- Vertical pack: `party_events` + `retail_wholesale`
- Receipt model: 80mm thermal by default, compatible with 58mm preset

## Catalog Findings

- CSV rows: 4,061
- Images copied: 4,025
- Asset size: about 264 MB
- Strong categories: Balloons, Party Essentials, Birthday, Tableware, Costumes & Wearables, Theme Party Kits, Cake & Candles, Banners & Backdrops, Decorations, Baby Shower, Seasonal & Halloween, Gift Bags & Wrapping
- Duplicate SKUs are expected in the WooCommerce export and are made unique during import
- Missing-image products are listed in `reports/client_assets/thepartystore_asset_report.json`

## Storefront Design

- Look: playful party retail, rose/pink/blue palette, elevated product cards
- Hero images: balloon bouquet, birthday package, baby shower package
- Main catalog: category chips, name/SKU/category search, price and stock sorting, load-more paging
- White-label header/footer: uses ThePartyStore when the setup script is applied

## POS Receipt Rules

- Header comes from business profile receipt header
- Bill label uses `Order No`
- Counter and operator are printed like the sample bill
- 80mm receipt prints item, qty, unit price, and amount
- 58mm receipt hides the price column and prints unit price under item for multi-qty lines
- Custom receipt footer overrides the generic exchange text to avoid conflicts

## Local Onboarding Commands

```powershell
node scripts/prepare-client-assets.mjs --manifest clients/client-002.json
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json --dry-run
node scripts/import-client-catalog.mjs --manifest clients/client-002.json --dry-run
```

When the production environment is ready:

```powershell
npm run env:validate -- --production
npm run db:migrate
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json
node scripts/import-client-catalog.mjs --manifest clients/client-002.json
npm run client:certify
npm run ops:smoke
```

## Coolify Deployment

1. Create a new Coolify app from this repository.
2. Set environment variables from the production env rotation: `DATABASE_URL`, `AUTH_SECRET` / `NEXTAUTH_SECRET`, `APP_URL`, `STORE_NAME`, payment keys, WhatsApp keys, and any delivery keys.
3. Build with `npm ci && npm run build`.
4. Start with `npm start`.
5. Add a persistent volume or object-storage/CDN strategy for images, because `public/uploads` is gitignored and should not carry 264 MB in Git.
6. Preferred volume mount: `/app/public/uploads`.
7. Sync `public/uploads/clients/thepartystore/products` to the Coolify volume before importing catalog.
8. Run database setup and import commands from Coolify terminal after env is active.
9. Point the domain to Coolify and set `APP_URL=https://thepartystore.grabberpoz.com` plus `STORE_NAME=ThePartyStore`.

## Final Acceptance Checklist

- [x] Storefront loads `/shop` with ThePartyStore branding
- [x] Storefront uses `party-pop` preset and party layout
- [x] Category/content signals show party categories
- [x] `/api/health` returns connected
- [ ] Hero/banner images render from `/uploads/clients/thepartystore/products` after a redeploy
- [ ] Catalog count is close to 4,061 products after import, verified from the tenant database
- [ ] Products with duplicate WooCommerce SKUs import with unique generated SKUs
- [ ] POS checkout prints 80mm receipt with order number, counter, operator, payment, and change
- [ ] 58mm print preset does not overflow columns
- [ ] `npm run client:certify` and `npm run ops:smoke` pass against the tenant
- [ ] Backup/export and restore drill completed before handover
