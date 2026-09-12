# Fresh Start — Coolify

Deploy **Grabber Poz Solo** as a new Coolify tenant: one Postgres resource +
one Application (from this repo's `Dockerfile`) per tenant, on Coolify's
internal Docker network. See
[`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md)
for the full per-tenant walkthrough; this doc is the quick-start version.

**Env checklist:** [`.env.example`](../.env.example)
**Repo:** https://github.com/anasbikes1992-ui/grabber-poz-solo

---

## Surfaces

| URL | Purpose |
|-----|---------|
| `/` | Storefront (shoppers) or company landing, by `LANDING_MODE`/host |
| **`/adminpoz`** → `/app` | Staff hub (bookmark — not linked from storefront) |
| `/login` | Redirects to `/adminpoz` |
| `/pos` | Point of sale |
| `/shop/checkout` | Shopper checkout |

Schema: `src/db/schema.ts` (70 tables) · Migrations: `drizzle/migrations/0000`
→ `0016`. Future drop: `0013_drop_legacy_triggers.sql.pending` (DB-06).

**The numbered migrations are not self-sufficient from an empty database** —
several early ones (e.g. `0003`, which alters `serial_numbers`) assume tables
that only `drizzle-kit push` creates, not `0000_clever_gateway.sql`. Verified
end-to-end: push the full schema first, then apply the numbered migrations on
top (they're idempotent `IF NOT EXISTS`-style throughout, so this is safe
even if the DB was already fully migrated some other way).

---

## Phase 1 — Provision the tenant in Coolify

1. Create a private Postgres resource, e.g. `grabber-db-<slug>` — **do not
   publish it to the host**; it should only be reachable on Coolify's
   internal Docker network.
2. Create an Application from this repo's `Dockerfile`.
3. Generate secrets and write the tenant's env file:

```bash
node scripts/provision-client.mjs --client "My Store" --slug "my-store" --domain "my-store.grabberpoz.com"
```

Writes `reports/provision_my-store/.env.my-store.production` (generated
`AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET` — never reused across
tenants) and `RUNBOOK.md` with the full step list.

4. Paste that file's contents into the Application's **runtime** env in
   Coolify — never the build env (build env is visible in build logs; see
   `docs/DEPLOY_INCIDENT_COOLIFY_2026-09-11.md` for why this matters).

---

## Phase 2 — Database bootstrap

From a shell with network access to the tenant's Postgres (a Coolify
terminal into the app container, or a temporary SSH tunnel — never publish
the DB port to reach it from a laptop):

```bash
npx drizzle-kit push --force   # DATABASE_URL pointed at the tenant DB — full schema.ts baseline
node scripts/bootstrap-db.mjs  # numbered migrations 0000-0016 + column align, idempotent on top of the push
```

Both steps need to run once. Re-running `bootstrap-db.mjs` on redeploy is
safe (same idempotent SQL); re-running `drizzle-kit push` on a tenant that
already has data is not something this project has validated — treat it as a
fresh-provision-only step, not a redeploy step.

---

## Phase 3 — Deploy the app

Deploy **only from `main`**. Two build paths exist (see the Coolify playbook):
Coolify builds the Dockerfile from `main` on push, or a tenant runs the GHCR
image `ghcr.io/anasbikes1992-ui/grabber-poz-solo:sha-<short>` that
`.github/workflows/fleet-deploy.yml` builds from `main` after tests pass.
`dev` never deploys to a tenant; it auto-deploys only to the Vercel dev
environment on a separate Supabase dev database — see
[`DEV_DEPLOY_VERCEL.md`](./DEV_DEPLOY_VERCEL.md).

Post-deploy:

- `GET /api/health` → `{"db":"connected"}`
- Create the first owner — on an empty production DB no HTTP route can create
  a user, so do it in the app container:

```bash
node scripts/staff-credentials.mjs create-owner --email owner@my-store.lk --name "My Store Owner"
```

  It prints a one-time PIN stored as `TEMP$…`; the owner must rotate it on
  first login at `/adminpoz`. (On an existing DB that still has seeded `1234`
  PINs, run `node scripts/staff-credentials.mjs rotate-weak-pins` instead.)
- Seed once, authenticated as that owner (never unauthenticated, in any environment):

```bash
# after logging in as OWNER at /adminpoz and carrying that session cookie
curl -X POST "https://my-store.grabberpoz.com/api/seed" \
  -H "Content-Type: application/json" \
  -b "grabber_session=<cookie>" \
  -d '{"storeName":"My Store","slug":"my-store"}'
```

The response's `generatedPins` field has each staff role's PIN, generated
fresh and shown once — hand these to the owner immediately; none of them is
`1234`.

- `npm run client:certify:http` with `CERTIFY_HTTP_BASE_URL` set

---

## Phase 4 — Custom domain

1. In Coolify, add the tenant's own domain alongside the canonical
   `<slug>.grabberpoz.com` and enable Let's Encrypt.
2. Have the merchant CNAME their domain to `<slug>.grabberpoz.com` — a future
   VPS move is then one DNS change here, not one per client.
3. `APP_URL` in the tenant's env should stay the canonical
   `<slug>.grabberpoz.com` (or the merchant's domain, if that's primary) — it
   is read at request time, not build time, so no rebuild is needed to change
   it (see `src/lib/config/app-url.ts`).

---

## Ongoing operations

- **Cron:** add a host crontab entry hitting
  `https://<slug>.grabberpoz.com/api/cron/process-jobs` with the
  `CRON_SECRET` bearer token every 1-2 minutes. Nothing else triggers the job
  queue.
- **Backups:** nightly `pg_dump` per tenant Postgres resource, encrypted,
  off-box.

---

## Route map

**Public:** `/`, `/products/[slug]`, `/categories/[slug]`, `/shop/*`

**Staff:** `/app`, `/pos`, `/store/builder`, `/approvals`, `/settings/automation`, `/ai/*`

**Redirects:** `/collections`→`/products`, `/wholesale`→`/quotations`, `/setup`→`/settings`, `/accounts`→`/reports`, `/dashboard`→`/app`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `serial_numbers does not exist` (or similar) during bootstrap | Run `drizzle-kit push` first — the numbered migrations assume that baseline |
| `role "anon" does not exist` during bootstrap | Already fixed in `0006_rls_public_baseline.sql` (guarded — that role only exists on Supabase); if you still see this, you're on a stale checkout |
| `Cannot find package 'postgres'` / `'dotenv'` running a script inside the container | Rebuild the image — the Dockerfile explicitly copies both into the runner since neither is traced into `.next/standalone/node_modules` |
| Empty storefront | Run bootstrap + seed |
| APIs 401 in prod | Login at `/login` |
| Container won't boot: `AUTH_SECRET is still the Dockerfile's build-time placeholder value` | Coolify runtime env didn't override it — check the env panel, not the build env |

---

## Related

- [`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md) — full per-tenant playbook
- [`DEPLOY_INCIDENT_COOLIFY_2026-09-11.md`](./DEPLOY_INCIDENT_COOLIFY_2026-09-11.md) — the build-secret-leak incident and its fix
- [`ROADMAP.md`](./ROADMAP.md) — future work
- [`.env.example`](../.env.example)
