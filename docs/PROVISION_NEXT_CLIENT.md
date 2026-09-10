# Provision next Solo client (Phase 4)

One-pager SSOT. Detail: [`FRESH_START.md`](./FRESH_START.md) · Fleet: [`certification/FLEET_RELEASE_MANAGEMENT.md`](./certification/FLEET_RELEASE_MANAGEMENT.md)

## Commands

```powershell
# 1) Packet (env + RUNBOOK) — does not create cloud resources
npm run client:provision -- --client "Urban Trendz" --slug "urban-trendz" --domain "urbantrendz.lk"

# 2) After Supabase + Vercel exist — push secrets
npm run ops:sync-env -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production

# 3) Schema: numbered migrations through 0014 (wishlist + WhatsApp + Wave B vertical depth)
npm run db:bootstrap -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production
# If upgraded tenant missing later SQL:
# npm run db:apply-sql -- drizzle/migrations/0011_wishlist_reviews.sql
# npm run db:apply-sql -- drizzle/migrations/0012_whatsapp_threads.sql
# npm run db:apply-sql -- drizzle/migrations/0014_vertical_depth_wave_b.sql
# npm run db:apply-sql -- drizzle/migrations/0015_vertical_depth_wave_c.sql

# 4) Validate + smoke
npm run env:validate -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production --production
$env:CERTIFY_HTTP_BASE_URL = "https://urbantrendz.lk"
npm run ops:smoke -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production
npm run client:certify -- --client "Urban Trendz" --slug "urban-trendz" --env reports/provision_urban-trendz/.env.urban-trendz.production

# 5) Optional legacy bridge health (do not drop yet)
npm run db:validate-legacy -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production
```

## Migrations checklist

`0000` … `0010` core · **`0011` wishlist/reviews** · **`0012` WhatsApp threads** · **`0014` Wave B** · **`0015` Wave C QR tokens** · (future) **`0013` drop legacy triggers** after DB-06 exit.

## Phase 0 operator (manual)

See [`FULL_PROOF_PLAN.md`](./FULL_PROOF_PLAN.md) §5 — PIN, WhatsApp Meta, POS smoke, `release:gate`.
