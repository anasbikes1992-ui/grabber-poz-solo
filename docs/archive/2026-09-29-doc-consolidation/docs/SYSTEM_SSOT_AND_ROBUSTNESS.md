# Grabber Business OS - System SSOT & Robustness Backlog

**Layer:** repo-owned durable knowledge
**Updated:** 2026-09-27
**Live:** `grabberpoz.com`, `demo.grabberpoz.com`, and isolated merchant hosts on Coolify/Contabo

## What this is built as

Grabber is a solo multi-vertical commerce OS on **Next.js App Router** + **Drizzle -> Postgres** + Coolify/Contabo.

**Commercial SSOT:** Grabber is sold as **Grabber Business OS Pro**, one all-in-one platform. Business category is configured through vertical packs, not package tiers or upgrade gates.

| Surface | Purpose |
|---------|---------|
| `/` | Company marketing or client storefront, resolved by `LANDING_MODE` / host fallback |
| `/shop/*` | Public storefront, product detail, cart, checkout, order tracking |
| `/adminpoz`, `/app` | Staff login and merchant operating shell |
| `/pos`, `/barcodes` | Staff retail terminal and labels |
| `/setup` | Onboarding milestones and setup flow |
| `/ai/agents` | Jarvis propose -> approve agents |
| Vertical modules | Retail, wholesale, party/events, repairs, restaurant, salon, grocery/pharmacy readiness |

## Source of truth

| Concern | SSOT |
|---------|------|
| Schema | `src/db/schema.ts` + `drizzle/migrations/` |
| DB client | `src/db/index.ts`, `src/lib/db/connection.ts` |
| Staff auth | `src/lib/auth/session.ts` and edge variant |
| Checkout | `src/lib/commerce/pos-checkout-service.ts` |
| Root landing | `src/lib/config/landing-mode.ts` - `LANDING_MODE=company|storefront`; no `auto` mode |
| Business config | `business-settings`, `vertical-flags`, `/api/config/flags` |
| Storefront CMS | `storefront-config` + `--sf-*` theme tokens |
| Theme/layout | `themePreset` for visual skin, `layoutTemplate` for storefront structure |
| Ops readiness | `docs/PRODUCTION_READY.md`, `docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md` |
| Client launch | `docs/GRABBERPOZ_AND_THEPARTYSTORE_LAUNCH.md` |
| Commercial model | `docs/COMMERCIAL_MODEL.md`, `docs/CLAIMS_AND_SCOPE.md` |

If a fact is in two places, prefer schema + service layer over UI copy.

## Fleet invariants

- One paying client = one isolated app environment + one dedicated private Postgres database.
- Never point two paying clients at the same `DATABASE_URL`.
- Company/demo currently use the configured Supabase cloud Postgres. The exited Coolify Supabase service in the POZ project is not serving live traffic.
- ThePartyStore keeps its current private DB for launch; do not recreate it during UI polish.
- New clients are provisioned through the Coolify playbook and `scripts/provision-client.mjs`.
- Secrets live in Coolify runtime env only, never build variables.

## Current robustness waves

| Wave | Outcome |
|------|---------|
| A-C | Landing performance, storefront restore, safe splits, checkout accessibility, health metadata |
| Commerce hardening | Returns, GRN, transfers, shifts, loyalty, credit, checkout invariants covered by real Postgres tests |
| Theme/demo | Demo theme picker, layout templates, theme presets, storefront builder controls |
| Launch polish | Company landing one-Pro message, ThePartyStore handover polish, docs SSOT cleanup |
| Next | Catalog workspace, mobile/tablet finish, ERP approval gates, import rollback batches |

## Remaining P0/P1 work

1. Deploy the polished `main` build to company/demo, then promote the same verified image/tag to ThePartyStore.
2. Complete ThePartyStore handover smoke: catalog/images, staff login, POS sale, storefront COD order, receipt, return, report, backup, restore rehearsal.
3. Add live read-only smoke script for production endpoints and tenant health.
4. Finish docs cleanup for stale package/tier language and outdated validation counts.
5. Build catalog workspace guided editor and import rollback batches.
6. Finish mobile/tablet admin card views and visual smoke at 375/768/1024/1440.

## Known backlog after launch

- RLS proof for migrations 0017-0021.
- Promotion usage race.
- Webhook pre-claim.
- Checkout-sync offline route.
- Supervisor PIN brute-force throttling.
- Deactivated-user session invalidation.
- Login `next` redirect hardening with a `safeNextPath()` helper.

## Related docs

- [`GRABBERPOZ_AND_THEPARTYSTORE_LAUNCH.md`](./GRABBERPOZ_AND_THEPARTYSTORE_LAUNCH.md)
- [`COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md)
- [`GRABBER_SYSTEM_REFACTOR_PLAN.md`](./GRABBER_SYSTEM_REFACTOR_PLAN.md)
- [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)
- [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md)
