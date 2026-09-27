# Grabberpoz.com + ThePartyStore Launch Checklist

**Date:** 2026-09-27
**Commercial model:** one product, **Grabber Business OS Pro**.
**Deployment model:** one isolated app/database per business.

## 1. Company Site - `grabberpoz.com`

Purpose: public company website for Grabber Business OS Pro.

Database verdict:

- The running `grabberpoz.com` / `demo.grabberpoz.com` Coolify app is healthy and points at the active Supabase cloud Postgres.
- The exited Coolify Supabase service in the POZ project is not the serving database for the company/demo app.
- Do not create or switch to a new POZ database during launch polish.
- If full Coolify-owned database control is required later, run it as a separate migration with backup, restore rehearsal, DNS/env cutover, and rollback.

Required routing:

- `https://grabberpoz.com` -> company landing page.
- `https://www.grabberpoz.com` -> company landing page or redirect to apex.
- `https://demo.grabberpoz.com` -> demo merchant storefront, not the company page.

Required runtime:

```env
NODE_ENV=production
APP_URL=https://grabberpoz.com
NEXT_PUBLIC_APP_URL=https://grabberpoz.com
STORE_NAME=Grabber Business OS Pro
COMPANY_DEMO_URL=https://demo.grabberpoz.com
COMPANY_LANDING_HOSTS=grabberpoz.com,www.grabberpoz.com
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=8192
```

`LANDING_MODE` may be left unset for the shared company/demo app so the host fallback can show company landing on apex and storefront on `demo.grabberpoz.com`. If set explicitly, use only `company` or `storefront`; there is no `auto` mode.

Acceptance checks:

- `/` shows the Grabber company landing.
- Company landing sells one Pro platform, not feature tiers.
- Company CTA routes to demo/contact, not ThePartyStore.
- OpenGraph metadata uses `https://grabberpoz.com`.
- `/api/health` returns healthy with `db:"connected"`.

## 2. Client Site - `thepartystore.grabberpoz.com`

Purpose: production client app for ThePartyStore.

Required routing:

- `https://thepartystore.grabberpoz.com` -> ThePartyStore storefront.
- `https://thepartystore.grabberpoz.com/shop` -> ThePartyStore catalog.
- `https://thepartystore.grabberpoz.com/adminpoz` -> staff login/admin.
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
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json --apply
node scripts/import-client-catalog.mjs --manifest clients/client-002.json --apply
npm run client:certify
npm run ops:smoke
```

Acceptance checks:

- Storefront shows `ThePartyStore` branding and `party-pop` theme.
- Product images load from `/uploads/clients/thepartystore/products`.
- Catalog count is close to the imported WooCommerce source count after import.
- `/pos` product pagination works with the full catalog.
- Thermal receipt print preview shows one receipt, not the full POS page.
- Checkout supports COD; PayHere stays disabled until merchant gateway credentials are approved.
- Jarvis is available in Pro but execute actions remain approval controlled.
- `/api/config/plan` returns `commercialModel: "one_pro_plan"` and vertical packs.

## 3. Remaining Before Real Payment Collection

- Promote only a verified `main` build to ThePartyStore.
- Keep ThePartyStore's existing private DB unchanged for launch.
- Add/confirm persistent storage for ThePartyStore uploads at `/app/public/uploads`.
- Rotate and paste production secrets from a secure password manager.
- Run one real POS sale and one real storefront order in front of the client.
- Confirm backup/export and restore drill before handover.

## 4. CEO/CTO Finalization Plan

1. Finish public trust polish: company profile copy, one Pro platform positioning, demo CTA clarity, and live demo smoke checks.
2. Freeze database ownership for launch: keep current company/demo DB and ThePartyStore DB unchanged; quarantine the exited POZ Supabase service until a controlled migration is explicitly scheduled.
3. Complete ThePartyStore handover readiness: verify storefront catalog, image persistence, staff login, receipt preview, COD checkout, one POS sale, one storefront order, backup, and restore rehearsal.
4. Promote only proven changes: typecheck, focused tests, production build, browser smoke at 375/768/1024/1440, then commit, push, and deploy.
5. After launch, decide whether POZ should migrate from Supabase cloud to a Coolify-owned Postgres. Treat that as infrastructure work, not UI polish.
