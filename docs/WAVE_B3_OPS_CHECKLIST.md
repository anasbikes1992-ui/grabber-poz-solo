# Wave B3 — Ops robustness checklist (Contabo / Coolify)

**Code support:** `/api/health` returns `build` SHA when available.  
**Do not** put secrets in git. Run on each tenant with that tenant’s `DATABASE_URL`.

## Per instance (demo → HQ → clients)

| # | Step | Command / action | Pass |
|---|------|------------------|------|
| 1 | Runtime env only | Coolify: `DATABASE_URL`, `AUTH_SECRET` (≥32), `NEXT_PUBLIC_APP_URL`, `LANDING_MODE` | ☐ |
| 2 | Landing mode | HQ/demo: `LANDING_MODE=company` · Clients: `LANDING_MODE=storefront` | ☐ |
| 3 | Apply migrations | Include `0016_orders_client_uuid_unique.sql` via `npm run db:apply-sql` or bootstrap | ☐ |
| 4 | Seed vertical | `npm run seed:vertical -- --preset cafe` *(or salon/retail)* against tenant URL | ☐ |
| 5 | Rotate weak PINs | In container: `node scripts/staff-credentials.mjs rotate-weak-pins` | ☐ |
| 6 | Owner first login | `/adminpoz?rotate=1` if TEMP$ PIN — set strong PIN | ☐ |
| 7 | Health | `GET /api/health` → `db:connected`, note `build`, turn Sentry on if `sentry:off` | ☐ |
| 8 | Smoke | Login → POS sale → storefront `/` shop → print preview | ☐ |
| 9 | Lighthouse | `npm run lighthouse:shop` against seeded URL (target ≥80) | ☐ |

## Env template (client)

```env
NODE_ENV=production
LANDING_MODE=storefront
DATABASE_URL=postgres://...
AUTH_SECRET=<openssl rand -hex 32>
CRON_SECRET=<random>
NEXT_PUBLIC_APP_URL=https://client.example.com
```

## Env template (HQ / demo)

```env
LANDING_MODE=company
NEXT_PUBLIC_APP_URL=https://grabberpoz.com
# or https://demo.grabberpoz.com
```

## Related

- [`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md)
- [`WAVE_B_C_ROBUSTNESS_PLAN.md`](./WAVE_B_C_ROBUSTNESS_PLAN.md)
- `scripts/staff-credentials.mjs`
