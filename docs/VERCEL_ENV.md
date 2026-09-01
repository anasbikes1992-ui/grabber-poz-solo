# Vercel Environment Variables

Single checklist for **Grabber Poz Solo** (`grabber-poz-solo` on Vercel + Supabase project `rbayhrskowtahepwccrq`).

Full deploy flow: [`FRESH_START.md`](./FRESH_START.md)

---

## Auto-injected (Supabase ↔ Vercel integration)

If you connected Supabase in Vercel, these are set automatically:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | App runtime (pooler) — **app reads this** |
| `POSTGRES_PRISMA_URL` | Prisma-style pooler URL |
| `POSTGRES_URL_NON_POOLING` | Direct connection (migrations) |

You do **not** need to duplicate `POSTGRES_URL` as `DATABASE_URL` for builds to succeed.  
Optional: set `DATABASE_URL` to the same pooler URL for clarity in scripts.

---

## Required — set manually

| Variable | Example / source |
|----------|------------------|
| `AUTH_SECRET` | `openssl rand -hex 48` |
| `MASTER_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://grabber-poz-solo-….vercel.app` |
| `NEXT_PUBLIC_STORE_NAME` | `Grabber Poz Solo` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rbayhrskowtahepwccrq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role (server only) |

---

## Recommended

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Random string for webhook verification |
| `DATABASE_URL` | Same pooler URL as `POSTGRES_URL` (optional if integration connected) |

---

## Optional integrations

Only add when enabling the feature:

- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`
- `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`
- `FAL_KEY` (creative engine)

---

## Sync from local vault

After filling `reports/provision_grabber-poz-solo/.env.grabber-poz-solo.production` → `.env.local`:

```powershell
$env:VERCEL_PROJECT="grabber-poz-solo"
npm run ops:sync-env
```

Then redeploy production.

---

## Verify after deploy

1. `GET /api/health` → `{ "ok": true, "db": "connected" }`
2. `npm run client:certify:http` with `CERTIFY_HTTP_BASE_URL` set to your Vercel URL
3. Seed once: `POST /api/seed` (dev) or owner-authenticated seed in production

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build: `ECONNREFUSED 127.0.0.1:5432` | Connect Supabase integration or set `POSTGRES_URL` / `DATABASE_URL` |
| Runtime: `relation does not exist` | Run `npm run db:bootstrap` against the Supabase project |
| `db: not_configured` on health | Missing DB env on Vercel |
| Pooler errors on DDL | Bootstrap uses direct URL locally — see `FRESH_START.md` Phase 2 |
