# ThePartyStore Coolify Status

Date: 2026-09-22

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
- Application resource exists and is currently not deployed/running yet.
- Source branch has been pushed to GitHub with ThePartyStore storefront, POS receipt, catalog import, and client setup changes.
- Product image assets were prepared locally under `public/uploads/clients/thepartystore/products`.

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

1. Open `thepartystore-app` in Coolify.
2. Paste the runtime variables from the local `partystorecredentials.txt`.
3. Add persistent storage mounted at `/app/public/uploads`.
4. Deploy without cache once env variables and storage are saved.
5. Upload/sync `public/uploads/clients/thepartystore/products` into the persistent volume.
6. Run database bootstrap/import commands from the deployed container terminal.
7. Add `thepartystore.grabberpoz.com` to app domains after DNS points to Coolify.

## Post-Deploy Commands

Run these inside the application container after deployment:

```bash
node scripts/bootstrap-db.mjs
node scripts/setup-client-storefront.mjs --manifest clients/client-002.json --apply
node scripts/import-client-catalog.mjs --manifest clients/client-002.json --apply
```
