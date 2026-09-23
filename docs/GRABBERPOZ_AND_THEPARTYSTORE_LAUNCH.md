# Grabberpoz.com + ThePartyStore Launch Checklist

**Date:** 2026-09-23  
**Commercial model:** one product, **Grabber Business OS Pro**.  
**Deployment model:** one isolated app/database per business.

## 1. Company Site — `grabberpoz.com`

Purpose: public company website for Grabber Business OS Pro.

Required routing:

- `https://grabberpoz.com` → company landing page.
- `https://www.grabberpoz.com` → company landing page or redirect to apex.
- `https://demo.grabberpoz.com` → demo merchant storefront, not the company page.

Required runtime:

```env
NODE_ENV=production
LANDING_MODE=company
APP_URL=https://grabberpoz.com
NEXT_PUBLIC_APP_URL=https://grabberpoz.com
STORE_NAME=Grabber Business OS Pro
COMPANY_DEMO_URL=https://demo.grabberpoz.com
COMPANY_LANDING_HOSTS=grabberpoz.com,www.grabberpoz.com
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=8192
```

Acceptance checks:

- `/` shows the Grabber company landing.
- `/pricing` shows one all-in-one Pro plan, not feature tiers.
- Company CTA routes to demo/contact, not ThePartyStore.
- OpenGraph metadata uses `https://grabberpoz.com`.
- `/api/health` returns healthy.

## 2. Client Site — `thepartystore.grabberpoz.com`

Purpose: production client app for ThePartyStore.

Required routing:

- `https://thepartystore.grabberpoz.com` → ThePartyStore storefront.
- `https://thepartystore.grabberpoz.com/shop` → ThePartyStore catalog.
- `https://thepartystore.grabberpoz.com/adminpoz` → staff login/admin.
- Public header must not expose builder/media/theme links.

Required runtime:

```env
NODE_ENV=production
LANDING_MODE=storefront
APP_URL=https://thepartystore.grabberpoz.com
NEXT_PUBLIC_APP_URL=https://thepartystore.grabberpoz.com
STORE_NAME=ThePartyStore
NEXT_PUBLIC_STORE_NAME=ThePartyStore
CLIENT_ID=GRB-002
CLIENT_SLUG=thepartystore
CLIENT_MANIFEST=clients/client-002.json
PUBLIC_UPLOADS_DIR=/app/public/uploads
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=8192
```

Post-deploy commands:

```bash
node scripts/bootstrap-db.mjs
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json
node scripts/import-client-catalog.mjs --manifest clients/client-002.json
npm run client:certify
npm run ops:smoke
```

Acceptance checks:

- Storefront shows `ThePartyStore` branding and `party-pop` theme.
- Product images load from `/uploads/clients/thepartystore/products`.
- Catalog count is close to `4,061` after import.
- `/pos` product pagination works with the full catalog.
- Thermal receipt print preview shows one receipt, not the full POS page.
- Jarvis is available in Pro but execute actions remain approval controlled.
- `/api/config/plan` returns `commercialModel: "one_pro_plan"` and vertical packs.

## 3. Remaining Before Real Payment Collection

- Point DNS for both domains to the correct Coolify applications.
- Add persistent storage for ThePartyStore uploads at `/app/public/uploads`.
- Rotate and paste production secrets from a secure password manager.
- Run one real POS sale and one real storefront order in front of the client.
- Confirm backup/export and restore drill before handover.
