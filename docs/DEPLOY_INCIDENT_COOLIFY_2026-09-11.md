# Coolify deploy incident — 2026-09-11

**App:** Contabo Coolify `eqrjn2kumxa5djnt26whpwby`  
**Commit built:** `7850763`  
**Log:** `deployment-eqrjn2kumxa5djnt26whpwby-all-logs-2026-09-10-21-09-14.txt`

## Root cause

```text
src/app/api/restaurant/menu/route.ts
Type error: Cannot find name 'kitchenTickets'
```

Guest QR `POST` inserted into `kitchenTickets` without importing the table from `@/db`. Local `npm run build` / Coolify Docker builder both fail typecheck.

## Fix

Import `kitchenTickets` in `src/app/api/restaurant/menu/route.ts`. Also fixed POS loyalty state renames (`loyaltyQuery` → `loyaltyPhoneQuery`) that broke the same build.

## Security (CRITICAL)

Coolify build logs printed live `ARG`/`ENV` secrets (`AUTH_SECRET`, `WHATSAPP_TOKEN`, `MASTER_ENCRYPTION_KEY`, etc.).

**Do this now:**

1. Rotate `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`, WhatsApp token/app secret, and any exposed DB passwords.
2. In Coolify: keep **build** env as placeholders only (match repo `Dockerfile`); inject real secrets as **runtime** env, not `ARG` bake-in.
3. Treat the downloaded log file as secret material — do not commit it; delete after rotation.
4. Redeploy after rotation + this code fix.

Repo `Dockerfile` already uses placeholders at build time. Coolify UI overrides were the leak source.

## Redeploy checklist

```text
[ ] Push fix to main
[ ] Secrets rotated in Coolify + WhatsApp Meta
[ ] Coolify rebuild succeeds (npm run build inside image)
[ ] Apply SQL 0011, 0012, 0014, 0015 on that tenant DB if not done
[ ] GET /api/health → db connected
[ ] GET /shop/menu public
[ ] POST /api/restaurant/menu with valid tableToken creates KOT
[ ] Staff /restaurant sees ticket
[ ] npm run ops:smoke against Coolify URL
```

## Docs cleanup

Superseded readiness/audit snapshots moved to [`docs/archive/`](./archive/README.md).
