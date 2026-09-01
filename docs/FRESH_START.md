# Fresh Start — Supabase + Vercel

Deploy **Grabber Poz Solo** on a new Supabase database and Vercel project. Use numbered migrations only — never `db:push` in production.

**Env checklist:** [`VERCEL_ENV.md`](./VERCEL_ENV.md)  
**Repo:** https://github.com/anasbikes1992-ui/grabber-poz-solo

---

## Surfaces

| URL | Purpose |
|-----|---------|
| `/` | Storefront (shoppers) |
| **`/adminpoz`** → `/app` | Staff hub (bookmark — not linked from storefront) |
| `/login` | Redirects to `/adminpoz` |
| `/pos` | Point of sale |
| `/shop/checkout` | Shopper checkout |

Schema: `src/db/schema.ts` · Migrations: `drizzle/migrations/0000` → `0002`

---

## Phase 1 — Supabase

1. Create project in **ap-southeast-1**, save DB password, wait until Active.
2. Copy from **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL`, anon key, service_role key.
3. Copy connection strings from **Database**:
   - **App / Vercel:** pooler port `6543` + `?pgbouncer=true`
   - **Local migrations:** direct `db.<ref>.supabase.co:5432`

```text
# Pooler (Vercel runtime)
postgresql://postgres.<REF>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (local bootstrap only)
postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres
```

4. Local env:

```powershell
copy .env.example .env.local
# Or use the provision vault:
copy reports\provision_grabber-poz-solo\.env.grabber-poz-solo.production .env.local
```

Generate secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Phase 2 — Database bootstrap

```powershell
npm run env:validate
npm run db:bootstrap
# Or with provision vault:
node scripts/bootstrap-db.mjs --env-file reports/provision_grabber-poz-solo/.env.grabber-poz-solo.production
```

Seed (dev):

```powershell
npm run dev
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d "{\"storeName\":\"My Store\",\"slug\":\"my-store\",\"ownerPin\":\"1234\"}"
```

Verify locally: `npm run check`

---

## Phase 3 — Vercel

1. Link project: `npx vercel link` → create **grabber-poz-solo** (or use Git integration).
2. Connect **Supabase** integration in Vercel (injects `POSTGRES_URL`).
3. Add manual env vars — see [`VERCEL_ENV.md`](./VERCEL_ENV.md).
4. Sync from local:

```powershell
$env:VERCEL_PROJECT="grabber-poz-solo"
npm run ops:sync-env
```

5. Deploy: `npx vercel --prod`

Post-deploy:

- `GET /api/health` → `db: connected`
- `npm run client:certify:http` with `CERTIFY_HTTP_BASE_URL` set
- Seed production once if needed

---

## Phase 4 — Custom domain (optional)

1. Vercel → Domains → add your domain
2. Set `NEXT_PUBLIC_APP_URL` to the domain URL
3. Redeploy

---

## Client provision packet

```powershell
npm run client:provision -- --client "Urban Trendz" --slug "urban-trendz"
```

Outputs env template + runbook under `reports/provision_<slug>/`.

---

## Route map

**Public:** `/`, `/products/[slug]`, `/categories/[slug]`, `/shop/*`

**Staff:** `/app`, `/pos`, `/store/builder`, `/approvals`, `/settings/automation`, `/ai/*`

**Redirects:** `/collections`→`/products`, `/wholesale`→`/quotations`, `/setup`→`/settings`, `/accounts`→`/reports`, `/dashboard`→`/app`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Vercel build: `127.0.0.1:5432` | Supabase integration or `POSTGRES_URL` missing — see `VERCEL_ENV.md` |
| Bootstrap fails on pooler | Use direct URL or `POSTGRES_URL_NON_POOLING` |
| Bootstrap: `CONNECT_TIMEOUT` on direct | Reset Supabase DB password to match `.env.local`; check firewall allows port 5432 |
| Empty storefront | Run bootstrap + seed |
| APIs 401 in prod | Login at `/login` |

---

## Related

- [`VERCEL_ENV.md`](./VERCEL_ENV.md) — env variable checklist
- [`correction.md`](./correction.md) — sprint tracker
- [`ROADMAP.md`](./ROADMAP.md) — future work
- [`.env.example`](../.env.example)
