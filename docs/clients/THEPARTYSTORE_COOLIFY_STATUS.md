# ThePartyStore Coolify Status

Date: 2026-09-22
Updated: 2026-09-26

> Updated 2026-09-23: ThePartyStore is a **Grabber Business OS Pro** client instance using the Party/Event + Retail vertical packs.

## Created Resources

- Coolify project: `thepartystore`
- Environment: `production`
- Application: `thepartystore-app`
- Database: `thepartystore-db`
- Git source: `anasbikes1992-ui/grabber-poz-solo`
- Git branch: `codex/thepartystore-onboarding`
- Build pack: `Dockerfile`
- Container port: `3000`

## Confirmed State

- PostgreSQL resource is running.
- Application resource exists and is live at `https://thepartystore.grabberpoz.com`.
- Public health returns HTTP 200 with `db:"connected"`.
- Coolify application status is `running:unknown`; public app health is good, but the Coolify health path is `/`. Prefer changing the app health check path to `/api/health` during the next maintenance window.
- Source branch has been pushed to GitHub with ThePartyStore storefront, POS receipt, catalog import, and client setup changes.
- Product image assets were prepared locally under `public/uploads/clients/thepartystore/products`.
- Storefront smoke signals are present: ThePartyStore branding, `party-pop` preset, party categories, product links, and WhatsApp.

## Required Runtime Environment

Set these as runtime variables on `thepartystore-app` only, not as build variables:

```env
NODE_ENV=production
LANDING_MODE=storefront
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=8192
APP_URL=https://thepartystore.grabberpoz.com
NEXT_PUBLIC_APP_URL=https://thepartystore.grabberpoz.com
STORE_NAME=ThePartyStore
NEXT_PUBLIC_STORE_NAME=ThePartyStore
DATABASE_URL=<Coolify internal PostgreSQL URL from thepartystore-db>
AUTH_SECRET=<unique generated secret>
NEXTAUTH_SECRET=<same as AUTH_SECRET>
SESSION_SECRET=<same as AUTH_SECRET>
MASTER_ENCRYPTION_KEY=<unique generated secret>
CRON_SECRET=<unique generated secret>
```

## Next Coolify Actions

1. Change the Coolify health check path to `/api/health` so dashboard status becomes healthy instead of unknown.
2. Confirm persistent storage mounted at `/app/public/uploads` and verify product images survive redeploy.
3. Run one supervised storefront order and one POS cash sale before client handover.
4. Confirm backup schedule, run one backup, and test restore into a scratch database.
5. Rotate any setup credentials that were shared outside a password manager.

## Post-Deploy Commands

Run these inside the application container after deployment:

```bash
node scripts/bootstrap-db.mjs
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json --apply
node scripts/import-client-catalog.mjs --manifest clients/client-002.json --apply
```

Do not run these commands with the company/demo database. ThePartyStore must remain on its own dedicated database.
