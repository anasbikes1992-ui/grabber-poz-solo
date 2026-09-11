# GRABBER SOLO — COOLIFY FLEET DEPLOYMENT PLAYBOOK
## Operator guide for the Contabo VPS (`109.123.246.84`)

Quick-start version: [`FRESH_START.md`](./FRESH_START.md).

---

## Rules that apply to every tenant

| Do | Don't |
|----|-------|
| Deploy **only from the `main` branch** (Coolify git source and GHCR images) | Point any Coolify app at `dev` or another branch, or build images from it |
| Put `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`, WhatsApp tokens, DB URLs in Coolify **runtime** env | Tick **Build Variable** on a secret — Coolify passes those as Docker `ARG`s and they appear in build logs |
| Keep each tenant's Postgres private to the Coolify network | Tick **Publicly Accessible** on a database |
| Rotate any secret that ever appeared in a deploy log | Share raw Coolify deploy logs |
| Reach the Coolify UI at `https://coolify.grabberpoz.com` | Use `http://109.123.246.84:8000` (blocked externally) |

Incident background: [`DEPLOY_INCIDENT_COOLIFY_2026-09-11.md`](./DEPLOY_INCIDENT_COOLIFY_2026-09-11.md).

---

## 0. Domains and landing pages

| Host | App | `/` shows | How |
|------|-----|-----------|-----|
| `grabberpoz.com`, `www.grabberpoz.com` | `grabber-demo` | Company landing (CompanyLanding) | Host allowlist in `src/lib/config/landing-mode.ts`; `LANDING_MODE` **unset** on this app |
| `demo.grabberpoz.com` | `grabber-demo` | Demo merchant storefront | Same app, host not in the company list → storefront |
| `<merchant>.grabberpoz.com` (+ merchant's own domain) | `grabber-<merchant>` | That merchant's storefront | `LANDING_MODE=storefront` |

Staff portal is `/adminpoz` on each merchant host. The company landing's
"Storefront Demo" / "Staff Portal" links go to `COMPANY_DEMO_URL`
(default `https://demo.grabberpoz.com`).

DNS (Hostinger): A records → `109.123.246.84` for `@`, `www`, `demo`,
`coolify`, and one per merchant subdomain.

---

## 1. Fleet layout

```
Traefik :443 (Let's Encrypt)
 ├─ grabberpoz.com / www / demo ─► grabber-demo          build: Dockerfile on VPS, auto-deploy from main
 │                                   └─ DB: Supabase cloud (existing project)
 ├─ thepartystore.grabberpoz.com ─► grabber-thepartystore build: GHCR image sha-<short>, manual promote
 │                                   └─ DB: Coolify Postgres 16 (private)
 └─ coolify.grabberpoz.com ───────► Coolify UI
```

Two build paths are in use on purpose, to compare in practice:

- **Dockerfile on VPS** (`grabber-demo`): Coolify builds from `main` on every
  push. Simple; costs VPS CPU/RAM during each build.
- **GHCR image** (merchants): `.github/workflows/fleet-deploy.yml` builds
  `ghcr.io/anasbikes1992-ui/grabber-poz-solo:sha-<short>` once per push to
  `main`. Merchant apps pin a tag and are promoted after the demo is verified.
  Server must be logged in: `docker login ghcr.io` (PAT with `read:packages`).

Remaining merchants (shoppingstation, asmobiles, wowthings) follow section 3
when they are onboarded.

---

## 2. Demo app (`grabber-demo`)

- Source: this repo, branch **`main`**, build pack **Dockerfile**, auto-deploy on.
- Domains: `https://grabberpoz.com`, `https://www.grabberpoz.com` (redirect to apex), `https://demo.grabberpoz.com`.
- Runtime env: `NODE_ENV=production`, `APP_URL=https://demo.grabberpoz.com`,
  `STORE_NAME`, `COMPANY_DEMO_URL=https://demo.grabberpoz.com`,
  `PAYHERE_MODE=sandbox`, `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`,
  `DATABASE_URL` (Supabase pooler), `POSTGRES_URL_NON_POOLING` (Supabase direct
  URL, used for migrations). **No `LANDING_MODE`.**
- Persistent storage: `/app/public/uploads`. Health check: `/api/health`.
- After deploy, in the container terminal:
  ```bash
  node scripts/bootstrap-db.mjs              # idempotent
  node scripts/staff-credentials.mjs rotate-weak-pins   # any 1234-style PINs → one-time TEMP$ PINs
  ```

---

## 3. Merchant app (example: thepartystore)

### 3.1 Database
Coolify → **+ New → Database → PostgreSQL 16**, name `grabber-db-thepartystore`.
Not publicly accessible. Memory limit 512 MB. **Backups:** schedule `0 2 * * *`
to the S3 destination, retention 14 days; run **Backup Now** once and test a
restore into a scratch database.

### 3.2 Application
Coolify → **+ New → Docker Image**:
`ghcr.io/anasbikes1992-ui/grabber-poz-solo:sha-<short>` (a commit on `main`).
Domain `https://thepartystore.grabberpoz.com` (add the merchant's own domain
too if they have one). Persistent storage `/app/public/uploads`. Health check
`/api/health`. Memory limit 1 GB.

### 3.3 Environment (runtime only)
```bash
node scripts/provision-client.mjs --client "ThePartyStore" --slug thepartystore --domain thepartystore.grabberpoz.com
```
Paste `reports/provision_thepartystore/.env.thepartystore.production` into
Coolify runtime env. Replace its placeholder `DATABASE_URL` with the
**internal** URL Coolify shows for `grabber-db-thepartystore`. Add
`PAYHERE_MODE=sandbox` until the merchant's PayHere credentials are in.

### 3.4 Schema (source never goes on the server)
The numbered migrations are **not** self-sufficient from an empty database —
push the full `schema.ts` first. From a laptop checkout at the **same commit**
as the image tag:
```bash
ssh -N -L 15432:<postgres-container-ip>:5432 root@109.123.246.84   # separate terminal
DATABASE_URL="postgresql://postgres:<pw>@localhost:15432/postgres" npx drizzle-kit push --force
```
Then in the app container: `node scripts/bootstrap-db.mjs`.
(`drizzle/rls_baseline.sql` / `--rls` only matter on Supabase-hosted DBs.)

### 3.5 First owner, then seed
No HTTP route can create the first user on an empty production DB. In the app
container:
```bash
node scripts/staff-credentials.mjs create-owner --email owner@thepartystore.lk --name "ThePartyStore Owner"
```
The owner logs in at `https://thepartystore.grabberpoz.com/adminpoz` with the
printed temporary PIN and is forced to rotate it. Then, with that session,
`POST /api/seed` (`{"storeName":"ThePartyStore","slug":"thepartystore","preset":"<id>"}`)
and hand the returned `generatedPins` to the owner. There is no
"general-retail" preset — choose from `src/lib/config/vertical-presets.ts`
(`fashion`, `grocery`, `electronics`, `mobilerepair`, `restaurant`, `salon`,
`wholesale`, `hybrid`, `full`); for a party/packages retailer `wholesale`
(quotations, customer groups) is the closest fit — confirm with the merchant.

### 3.6 Catalog
From the operator laptop over the same SSH tunnel:
```bash
DATABASE_URL="postgresql://postgres:<pw>@localhost:15432/postgres" \
  node scripts/import-client-catalog.mjs --manifest clients/client-002.json
```
(`catalogSource` paths in the manifest are local to the operator machine.)

### 3.7 Job queue
Coolify app → **Scheduled Tasks** → every 2 minutes (`*/2 * * * *`):
```bash
node -e "fetch('http://127.0.0.1:3000/api/cron/process-jobs',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>process.exit(r.ok?0:1))"
```
Nothing else triggers WhatsApp sends, webhook retries, or stock automations.

---

## 4. Releasing

1. Merge to `main` → `grabber-demo` rebuilds on the VPS; GHCR builds `sha-<short>` in parallel.
2. Verify on `demo.grabberpoz.com` and `grabberpoz.com`.
3. For each merchant app: set the image tag to the same `sha-<short>` → **Redeploy**.
4. Migrations must be additive (expand → deploy → contract later); run
   `node scripts/bootstrap-db.mjs` in each tenant container after redeploy.
5. `dev` is for integration only — nothing deploys from it. Merging into `main` is the release.

---

## 5. Smoke test per tenant

1. `GET /api/health` → `{"db":"connected"}`.
2. `POST /api/auth/login {"pin":"1234","role":"OWNER"}` → 401.
3. Unauthenticated `GET /api/cron/process-jobs` → 401; Scheduled Task history shows successful runs.
4. Owner logs in, scans/searches a product, completes a cash sale, previews the receipt.
5. Sale appears in `/dashboard` and the ledger in `/reports`.
