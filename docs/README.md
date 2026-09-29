# Grabber Business OS Documentation

This directory has one canonical documentation tree. If facts conflict, trust this order:

1. Source code and database migrations.
2. The numbered master docs below.
3. Release-gate and operational runbooks.
4. Archived snapshots in `docs/archive/`.

## Canonical Master Docs

| Doc | Purpose |
| --- | --- |
| [01 System Architecture](./01_SYSTEM_ARCHITECTURE.md) | Single-business architecture, system boundaries, auth, database, and core modules. |
| [02 Client Onboarding & Deployment](./02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md) | New client provisioning, isolated app/database handover, deployment and certification SOP. |
| [03 Commerce & Operations](./03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md) | POS, storefront, inventory, purchasing, returns, shifts, GL, and operational workflows. |
| [04 Jarvis Autonomous OS](./04_JARVIS_AUTONOMOUS_OS_MANUAL.md) | Approval-gated automation, WhatsApp/Jarvis actions, policies, and safety boundaries. |
| [05 Vertical Intelligence](./05_VERTICAL_INTELLIGENCE_GUIDE.md) | Vertical packs, storefront themes, and business-specific operating modes. |

## Current Facts

- Product: one sellable package, **Grabber Business OS Pro**. Vertical packs configure the client business; they are not pricing tiers.
- Architecture: one client app and one private Postgres database per business. No shared client database.
- Schema SSOT: `src/db/schema.ts` and numbered `drizzle/` migrations; current schema has 107 tables.
- Verification baseline: `npm run check` is expected to pass typecheck, 657 Vitest tests, the security audit, and production build.
- Company/admin surfaces: `/company`, `/company/leads`, `/company/clients`, `/company/settings`, `/company/admin`, `/company/roadmap`.

## Live Operational Runbooks

These are intentionally kept outside the numbered docs because scripts, release gates, or handover steps reference them directly:

| Runbook | Purpose |
| --- | --- |
| [RELEASE_GATE](./RELEASE_GATE.md) | Merge/deploy gate checklist. |
| [PROVISION_NEXT_CLIENT](./PROVISION_NEXT_CLIENT.md) | Next-client provisioning checklist. |
| [FRESH_START](./FRESH_START.md) | Fresh database/bootstrap notes used by fleet tests. |
| [LEGACY_MIGRATION_BRIDGE](./LEGACY_MIGRATION_BRIDGE.md) | Legacy database bridge validation. |
| [LIGHTHOUSE_MOBILE](./LIGHTHOUSE_MOBILE.md) | Mobile performance smoke workflow. |
| [ERP_GAPS_AND_NEXT_WAVE](./ERP_GAPS_AND_NEXT_WAVE.md) | Remaining ERP gaps and next-wave controls. |
| [GRABBER_GAP_REGISTER](./GRABBER_GAP_REGISTER.md) | Closed/open gap ledger. |
| [COMPANY_ADMIN_SUPERADMIN_PLAN](./COMPANY_ADMIN_SUPERADMIN_PLAN.md) | Company admin/HQ surface plan. |
| [COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK](./COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md) | Coolify deployment SOP. |

## Archive Policy

Superseded plans, duplicate root docs, old SSOT files, and stale roadmaps live under `docs/archive/`.
Do not use archived files as implementation authority unless a current numbered doc explicitly points to them for historical context.
