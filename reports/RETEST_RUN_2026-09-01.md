# Re-Test run log — 2026-09-01 (updated)

**Gate:** READY_FOR_RETESTING  
**Baseline commit (app):** `a538384` (+ env/cert follow-up)  
**Live app:** https://grabber-poz-solo.vercel.app  
**DB project:** `nvsejnlnulplmptnptpj` (Business OS — not MyPoz `sauzjjbk…`)

## Automated results

| ID | Check | Result | Notes |
|----|--------|--------|-------|
| RT-A01 | `npm run typecheck` | **PASS** | |
| RT-A02 | `npm test` | **PASS** | 25/25 |
| RT-A03 | `env:validate --env-file .env.local` | **PASS** | P0 clear; pooler recommended for Vercel |
| RT-A04 | Schema align + verticals | **PASS** | 49 tables; `npm run db:align` + migration `0001` |
| RT-A05 | `client:certify` live SQL | **PASS** | `CERT-77D0E7FA` → `L4_SCHEMA_SQL_CERTIFIED` (12/12) |
| RT-M01…M08 | Manual smoke | **PENDING** | Needs Vercel env parity + seed |

## Env alignment decisions

* **Kept:** `DATABASE_URL` → `nvsejnln…`, `NEXT_PUBLIC_APP_URL` → Business OS Vercel URL, generated `AUTH_SECRET` / `MASTER_ENCRYPTION_KEY`
* **Rejected:** MyPoz `sauzjjbk…` keys, GMS/Redis/Resend/Stripe/pixel template block
* **Supabase client keys:** leave empty until Dashboard keys for **same** DB project are pasted

## Operator next

1. Mirror `.env.local` core vars onto Vercel project (use **pooler** `6543` URL in production).
2. `POST /api/seed` on a running instance.
3. Manual dual-auth checklist in `docs/READY_FOR_RETESTING.md`.
4. **Rotate** DB password + any keys pasted in chat.
