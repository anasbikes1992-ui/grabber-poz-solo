# Dev Deploys — Vercel + Supabase

The `dev` branch auto-deploys to a Vercel environment. Production deploys are
unaffected: `main` deploys from `main` through Coolify only (see
[`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md)).

No GitHub Actions minutes are used — Vercel builds through its own GitHub
integration, and the test gate is the local `.githooks/pre-push` hook.

## ⚠ Dev shares the live demo database

**Decision (2026-09-12, user):** rather than a separate Supabase dev project,
this Vercel environment was pointed at the **same** Supabase project
(`rbayhrskowtahepwccrq`) that backs the live `grabberpoz.com` demo tenant on
Coolify. This was a deliberate call to save setup time, made with the
following understood and accepted:

- **Every dev build runs `bootstrap-db.mjs` against the live demo data.** It's
  idempotent (already-applied migrations are skipped), but any dev-only schema
  experiment lands on production data, not a sandbox.
- **Secrets are shared with the leaked-secret incident.** `AUTH_SECRET`,
  `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`, the WhatsApp token — these are the
  same values flagged in `DEPLOY_INCIDENT_COOLIFY_2026-09-11.md` for rotation.
  **Stage 4 secret rotation must update Vercel's env at the same time as
  Coolify's**, or one side breaks. Treat the two as one unit going forward.
- **No separate job queue cron for dev** — see below.
- No new Supabase project, storage bucket, schema baseline, or first-owner
  creation was needed, since all of that already exists on the live project.

If a genuinely isolated dev database is wanted later, create a fresh Supabase
project and swap `DATABASE_URL`/`POSTGRES_URL_NON_POOLING`/`SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY` in Vercel — nothing else in this doc changes.

## Branch model

| Branch | Builds on | Serves | Database |
|---|---|---|---|
| `main` | Coolify (VPS, `Dockerfile`) | demo + merchant tenants | per tenant |
| `dev` | Vercel (`vercel.json`) | `https://grabber-poz-solo.vercel.app` | live demo Supabase project (shared — see above) |
| anything else | nothing | — | — |

`vercel.json` enforces this on the Vercel side:

- `git.deploymentEnabled.main: false` — `main` never deploys to Vercel.
- `ignoreCommand` skips every build whose branch is not `dev`, so feature
  branches don't create preview deployments against the shared database.
- `buildCommand` runs `node scripts/bootstrap-db.mjs` (idempotent numbered
  migrations) before `next build`. A failing migration fails the deploy.

**Settings → Git → Production Branch must also be set to `dev`** in the
Vercel dashboard. This is separate from `vercel.json`'s `deploymentEnabled`
flag: without it, pushes to `dev` build as anonymous preview deployments on
random URLs instead of the stable `grabber-poz-solo.vercel.app` alias that
`APP_URL` and the WhatsApp webhook assume.

## Local test gate

`npm install` runs `prepare`, which points `core.hooksPath` at `.githooks`.
Pushing to `dev` or `main` then runs `npm run typecheck` and `npm test` first.
Bypass in an emergency with `git push --no-verify`.

## Vercel env vars (project `grabber-poz-solo`, Production scope)

Since dev reuses the live demo project's credentials, most of these already
exist in Vercel from prior use. The ones actually specific to this dev wiring
(add if missing):

| Variable | Value | Why |
|---|---|---|
| `APP_URL` | `https://grabber-poz-solo.vercel.app` | server code reads this canonical name, not `NEXT_PUBLIC_APP_URL` (`src/lib/config/app-url.ts`) |
| `STORE_NAME` | e.g. `GRABBER` | same — canonical vs `NEXT_PUBLIC_STORE_NAME` |
| `SUPABASE_URL` | live project URL | same — canonical vs `NEXT_PUBLIC_SUPABASE_URL` |
| `POSTGRES_URL_NON_POOLING` | live project's **session** pooler (port `5432`, no `pgbouncer` param) | `bootstrap-db.mjs` runs DDL on every build; the transaction pooler (port `6543`) can choke on schema statements |
| `BACKUP_ENCRYPTION_KEY` | fresh `openssl rand -base64 48` | dev-only, doesn't need to match Coolify |
| `PAYHERE_MODE` | `sandbox` | keeps dev off live payments regardless of Coolify's setting |

Everything else (`AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `DATABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, WhatsApp vars, `CRON_SECRET`,
`CERTIFY_HTTP_BASE_URL`) is reused as-is from the live project — see the
warning above about coordinating rotation.

Push to `dev` → check the build log for the bootstrap step's `SKIP` lines
(expected — schema is already applied) and no `FAIL` lines, then
`GET https://grabber-poz-solo.vercel.app/api/health` → `{"db":"connected"}`.

## Job queue — intentionally not run from dev

Vercel Hobby crons only run daily, and the usual fix (`pg_cron` polling
`/api/cron/process-jobs` every 2 minutes, documented in earlier drafts of this
file) was **dropped** for this setup: since dev shares the live database with
the demo tenant, a second automated consumer of the same jobs table would
race Coolify's own Scheduled Task (Stage 5) for the same rows — including
side effects like real WhatsApp sends, since the WhatsApp token is also
shared. Coolify's Scheduled Task is the sole intended consumer once Stage 5
is done. To exercise the job queue from dev, call the route manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://grabber-poz-solo.vercel.app/api/cron/process-jobs
```

If a genuinely isolated dev database is set up later (see the warning above),
reintroduce per-project `pg_cron` polling at that point — it's safe once the
jobs table isn't shared with production.

## Promotion

`dev` verified on Vercel → PR `dev` → `main` → Coolify rebuilds the demo →
verify → bump each merchant tenant in Coolify.
