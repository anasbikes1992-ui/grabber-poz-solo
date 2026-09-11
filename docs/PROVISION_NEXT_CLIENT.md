# Provision next Solo client (Phase 4)

One-pager SSOT. Detail: [`FRESH_START.md`](./FRESH_START.md) · Fleet: [`certification/FLEET_RELEASE_MANAGEMENT.md`](./certification/FLEET_RELEASE_MANAGEMENT.md)

## Commands

```bash
# 1) Packet (env + RUNBOOK) — does not create Coolify resources
npm run client:provision -- --client "Urban Trendz" --slug "urban-trendz" --domain "urbantrendz.lk"

# 2) In Coolify: create the Postgres resource + Application, paste the
#    generated .env into the Application's RUNTIME env (never build env).

# 3) Schema: full schema.ts baseline, then numbered migrations 0000-0016.
#    The numbered chain is not self-sufficient from empty — push first.
npx drizzle-kit push --force  # DATABASE_URL pointed at the tenant DB
node scripts/bootstrap-db.mjs --env-file reports/provision_urban-trendz/.env.urban-trendz.production

# 4) Validate + smoke
npm run env:validate -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production --production
CERTIFY_HTTP_BASE_URL="https://urbantrendz.lk" npm run ops:smoke -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production
npm run client:certify -- --client "Urban Trendz" --slug "urban-trendz" --env reports/provision_urban-trendz/.env.urban-trendz.production

# 5) Optional legacy bridge health (do not drop yet)
npm run db:validate-legacy -- --env-file reports/provision_urban-trendz/.env.urban-trendz.production
```

## Migrations checklist

`0000` … `0016` (`drizzle-kit push` first for the full `schema.ts` baseline —
several early numbered migrations, e.g. `0003`, assume tables that only the
push creates). `0013_drop_legacy_triggers.sql.pending` stays pending until
DB-06 exit.

## Phase 0 operator (manual)

See [`FULL_PROOF_PLAN.md`](./FULL_PROOF_PLAN.md) §5 — PIN, WhatsApp Meta, POS smoke, `release:gate`.
