# Dev Deploys — Vercel + Supabase

The `dev` branch auto-deploys to a Vercel dev environment backed by its **own**
Supabase project. Production tenants are unaffected: they deploy from `main`
through Coolify only (see
[`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md)).

No GitHub Actions minutes are used — Vercel builds through its own GitHub
integration, and the test gate is the local `.githooks/pre-push` hook.

## Branch model

| Branch | Builds on | Serves | Database |
|---|---|---|---|
| `main` | Coolify (VPS, `Dockerfile`) | demo + merchant tenants | per tenant |
| `dev` | Vercel (`vercel.json`) | `https://grabber-poz-solo.vercel.app` | Supabase dev project (`grabber-dev`) |
| anything else | nothing | — | — |

`vercel.json` enforces this on the Vercel side:

- `git.deploymentEnabled.main: false` — `main` never deploys to Vercel.
- `ignoreCommand` skips every build whose branch is not `dev`, so feature
  branches don't create preview deployments against the dev database.
- `buildCommand` runs `node scripts/bootstrap-db.mjs` (idempotent numbered
  migrations) before `next build`. A failing migration fails the deploy.

## Local test gate

`npm install` runs `prepare`, which points `core.hooksPath` at `.githooks`.
Pushing to `dev` or `main` then runs `npm run typecheck` and `npm test` first.
Bypass in an emergency with `git push --no-verify`.

## One-time setup

### 1. Supabase dev project

1. Create project `grabber-dev`, region **Southeast Asia (Singapore)** (matches
   Vercel `sin1`).
2. From *Connect*, collect into a local `.env.dev.local` (gitignored):
   - `DATABASE_URL` — transaction pooler (port `6543`)
   - `POSTGRES_URL_NON_POOLING` — **session** pooler (port `5432`). The direct
     `db.<ref>.supabase.co` host is IPv6-only and unreachable from Vercel builds;
     the session pooler is IPv4 and safe for DDL.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Baseline the empty database from a checkout of `dev` (the numbered
   migrations are not self-sufficient from empty — see `FRESH_START.md`):

   ```bash
   set -a; . ./.env.dev.local; set +a
   DATABASE_URL="$POSTGRES_URL_NON_POOLING" npx drizzle-kit push --force
   node scripts/bootstrap-db.mjs --env-file .env.dev.local
   ```

4. Storage → create a **public** bucket `products`. Uploads
   (`src/app/api/storage/upload/route.ts`) go to Supabase storage when
   `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; Vercel's filesystem is
   ephemeral, so the local-disk fallback must not be used there.
5. First owner (no HTTP route can create one on an empty DB):

   ```bash
   set -a; . ./.env.dev.local; set +a
   node scripts/staff-credentials.mjs create-owner --email <owner-email> --name "<name>"
   ```

   Log in at `/adminpoz`, rotate the temporary PIN, then seed with an
   authenticated `POST /api/seed`.

### 2. Vercel project `grabber-poz-solo`

1. **Settings → Environments → Production → Branch Tracking:** `dev`.
2. **Settings → Environment Variables (Production):** remove every old variable,
   then set fresh values — never reuse production tenant secrets:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | dev transaction pooler URL |
   | `POSTGRES_URL_NON_POOLING` | dev session pooler URL |
   | `SUPABASE_URL` | dev project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | dev service role key |
   | `AUTH_SECRET` | `openssl rand -base64 48` |
   | `CRON_SECRET` | `openssl rand -base64 48` |
   | `MASTER_ENCRYPTION_KEY` | `openssl rand -base64 48` (must differ from `AUTH_SECRET`) |
   | `BACKUP_ENCRYPTION_KEY` | `openssl rand -base64 48` |
   | `APP_URL` | `https://grabber-poz-solo.vercel.app` |
   | `STORE_NAME` | e.g. `Grabber Dev` |
   | `PAYHERE_MODE` | `sandbox` |

   Leave WhatsApp, payment-gateway and Meta production credentials unset.
3. Push to `dev` → check the build log for `✓ Database bootstrap complete` and
   then `GET /api/health` → `{"db":"connected"}`.

### 3. Job queue (every 2 minutes)

Vercel Hobby crons run at most once a day, so the job queue is driven from the
dev database with `pg_cron` + `pg_net`. In the Supabase dashboard enable both
extensions (Database → Extensions), then in the SQL editor:

```sql
select vault.create_secret('<CRON_SECRET value>', 'cron_secret');

select cron.schedule(
  'process-jobs',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://grabber-poz-solo.vercel.app/api/cron/process-jobs',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);
```

Check runs with `select * from cron.job_run_details order by start_time desc limit 5;`
and responses with `select status_code from net._http_response order by created desc limit 5;`.
If `CRON_SECRET` is rotated in Vercel, update it with `vault.update_secret`.

This lives only in the dev project — it is not a repo migration, because tenant
databases run the queue from a Coolify Scheduled Task instead.

## Promotion

`dev` verified on Vercel → PR `dev` → `main` → Coolify rebuilds the demo →
verify → bump each merchant tenant in Coolify.
