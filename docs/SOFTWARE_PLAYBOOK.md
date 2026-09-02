# Grabber Business OS — Software Playbook

**Operational handbook** for provisioning, validating, piloting, and handing over a dedicated client instance.  
**Claims:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md)  
**Commercial:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)  
**Deliverables:** [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md)  
**VPS (default host):** [`VPS_DEPLOY.md`](./VPS_DEPLOY.md)  
**Readiness:** [`STAGE_READINESS.md`](./STAGE_READINESS.md)

**Supersedes:** older “10-minute handover” notes that referenced 41 tables or `drizzle/supabase_setup.sql` as the only path.

---

## 1. Architecture (ops view)

```text
Client DNS
    → Grabber Managed VPS (Next.js)   [default]
       or Vercel                        [optional]
        → Dedicated PostgreSQL (local on VPS or Supabase)
        → Optional: WhatsApp, Meta CAPI, PayHere
        → Cron → /api/cron/process-jobs (CRON_SECRET)
        → Sentry (Grabber ops DSN)
        → Optional CREATIVE_WORKER_URL (GPU host)
```

**Surfaces:** storefront `/` · staff `/adminpoz` → `/app` · POS `/pos` · social `/social` · creative `/creative/*`

---

## 2. End-to-end lifecycle

```mermaid
flowchart TD
  A[1 Intake + package] --> B[2 env:validate P0]
  B --> C[3 Dedicated Postgres + schema]
  C --> D[4 Deploy on Grabber VPS]
  D --> E[5 Sentry DSN + cron]
  E --> F[6 Seed or CSV migrate]
  F --> G[7 client:certify]
  G --> H[8 Ready for Re-Testing P0]
  H --> I[9 Physical POS smoke]
  I --> J[10 Rotate secrets / PIN]
  J --> K[11 Optional COMMS / SOCIAL / AI credits]
  K --> L[12 7-day acceptance]
  L --> M[13 Handover + maintenance start]
```

---

## 3. Step-by-step

### Step 1 — Intake

Collect using [`CLIENT_ONBOARDING_CREDENTIALS.md`](./CLIENT_ONBOARDING_CREDENTIALS.md):

- Business identity, tax, addresses, receipt text, logo  
- Staff roles  
- Product / customer / supplier CSVs  
- Domain + DNS contact  
- Optional: WhatsApp, pixels, PayHere, courier keys  
- Contracted packages: CORE / COMMS / SOCIAL Cx / VERTICALS  

### Step 2 — Environment file

Create `.env.client-[slug]` (never commit):

**P0 required**

```env
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
NEXT_PUBLIC_APP_URL=https://[client-domain]
AUTH_SECRET=[openssl rand -hex 48]
MASTER_ENCRYPTION_KEY=[openssl rand -hex 32]
NEXT_PUBLIC_STORE_NAME=[Trading Name]
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

```powershell
npm run env:validate -- --env-file .env.client-[slug] --production
```

**P0 errors → stop.** Do not deploy.

### Step 3 — Database

1. Create Supabase project (`ap-southeast-1` recommended for LK).  
2. Prefer: `npm run db:bootstrap` or `npm run db:push` against **direct :5432** for migrations; runtime uses **pooler :6543**.  
3. Apply `drizzle/rls_baseline.sql` in SQL editor (manual).  
4. Do **not** treat legacy `drizzle/supabase_setup.sql` as SSOT (reference only).

### Step 4 — Deploy (Grabber Managed VPS default)

1. Follow [`VPS_DEPLOY.md`](./VPS_DEPLOY.md): DNS, Postgres DB, app unit, Nginx/Caddy SSL.  
2. Set P0 env + `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` + `CRON_SECRET`.  
3. Verify `GET /api/health` → `"db":"connected"` and `"sentry":"configured"`.  
4. Optional alternate: Vercel project with same env vars.

### Step 4b — Observability

- Reproduce bugs during pilot → Sentry Issues → fix → redeploy.  
- Tag releases with `SENTRY_RELEASE` (git sha).

### Step 5 — Data

```powershell
# Demo seed (internal only — rotate PIN after)
# POST https://[url]/api/seed

npm run client:migrate -- --client "Client Name" --file "path/to/products.csv"
```

Enter opening stock; import Polim / AP openings if migrating.

### Step 6 — Certify

```powershell
npm run client:certify -- --dry-run --client "Client Name" --slug "slug"
npm run client:certify -- --client "Client Name" --slug "slug"
$env:CERTIFY_HTTP_BASE_URL="https://[client-domain]"
npm run client:certify -- --client "Client Name" --slug "slug"
```

**P0 Failures > 0 → BLOCKED for handover.**  
Report under `reports/`.

### Step 7 — Ready for Re-Testing

Follow [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md):

- Automated: typecheck, test, env, release gate, certify  
- Manual RT-M01…M08 dual surface + commerce  

### Step 8 — Physical POS smoke

| Check | Pass |
|-------|------|
| Open shift | Drawer/session open |
| Scan barcode | Line appears &lt; 1s |
| Cash sale | Order + stock −1 |
| Thermal receipt | Prints header/footer |
| Card tender (if used) | Records correctly |
| Close shift / Z | Cash expected vs counted |

Record as **PHYSICAL_POS_SMOKE PASS**.

### Step 9 — Secure

- Rotate OWNER PIN from any demo value.  
- Rotate DB password if ever shared in chat/email.  
- Confirm no demo shopper password left as default for real customers.  
- Store secrets in vault; never in git.

### Step 10 — Optional packages

**COMMS:** set `WHATSAPP_*`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, Meta webhook → `/api/whatsapp/webhook`, subscribe `messages`.  

**SOCIAL:** configure `/social` handles + pixels; download catalog XML.  

**CREATIVE C1/C2:** set `FAL_KEY`/`REPLICATE_API_TOKEN` and/or `CREATIVE_WORKER_URL` on GPU host (`npm run creative:start` / `creative-engine`).  

**VERTICALS:** enable flags; smoke the sold modules only.

### Step 11 — 7-day acceptance

[`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).

### Step 12 — Handover

Complete [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md) sign-off. Archive cert + intake in client folder.

---

## 4. Cron & jobs

| Item | Notes |
|------|-------|
| `/api/cron/process-jobs` | Needs `CRON_SECRET` Bearer; processes WhatsApp, Meta CAPI, creative jobs |
| Creative PDF | Generated in-app (`pdf-lib`); download via `/api/creative/pdf/download` |
| Creative video | Prefer GPU worker; else cloud image / placeholder |

---

## 5. Rollback

- Soft: disable storefront / pause ads; keep POS.  
- Data: restore from Supabase backup (contracted schedule).  
- Nuclear (dev only): truncate commerce tables then re-migrate — **never** on live client without written approval.

---

## 6. Fleet / multi-client

Each paying client = **separate Postgres database** + isolated app env on the Grabber VPS fleet (or separate Vercel project).  
Never point two clients at the same `DATABASE_URL`.

See also `certification/FLEET_RELEASE_MANAGEMENT.md` for release process notes.

---

## 7. Definition of PRODUCTION_HANDOVER

All contracted items below true:

1. `env:validate --production` → 0 P0  
2. `client:certify` → 0 P0  
3. READY_FOR_RETESTING P0 → PASS (or WAIVE with owner sign)  
4. PHYSICAL_POS_SMOKE → PASS (or WAIVE with owner sign)  
5. Credentials rotated  
6. CLIENT_DELIVERABLES pack signed  
7. Claims Tier C exclusions acknowledged if SOCIAL/CREATIVE sold  

7-day acceptance may be **DEFERRED** only with written agreement; CORE go-live still requires 1–6.
