# GRABBER BUSINESS OS — TECHNICAL HANDOVER GUIDE

> **Superseded (2026-09-02).**  
> Do **not** use this file for deployment or contracts.  
> Wrong historical details (41 tables, `supabase_setup.sql` as SSOT, incomplete env) are retired.

**Use instead:**

| Need | Document |
|------|----------|
| Full ops procedure | [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) |
| What client receives | [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md) |
| Claim language | [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) |
| Env vars | [`VERCEL_ENV.md`](./VERCEL_ENV.md) |
| Fresh deploy | [`FRESH_START.md`](./FRESH_START.md) |
| Doc index | [`README.md`](./README.md) |

Schema SSOT: `src/db/schema.ts` (~49 tables). Prefer `db:bootstrap` / migrations / `db:push` per Fresh Start — not legacy one-shot SQL alone.
