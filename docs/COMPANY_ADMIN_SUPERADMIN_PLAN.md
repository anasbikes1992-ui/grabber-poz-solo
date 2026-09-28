# Company Admin and SuperAdmin Plan

Status: active SSOT for the Grabberpoz.com company admin workstream.

## Current Position

- `grabberpoz.com` is the company/prospect landing.
- `/company/leads` is the protected lead CRM.
- `/company` is the company admin dashboard.
- `/company/settings` edits company profile and logo URL.
- `/company/admin` is the SuperAdmin command center over existing CRUD areas.
- `/company/roadmap` is the in-app CEO/CTO roadmap and acceptance checklist.
- `/company/clients` is the client provisioning register and handover checklist.
- `/company/deployments` is the app/database/domain deployment register.
- `/company/audit` is the Owner/Admin/Manager read-only audit trail over `audit_logs`.
- `/ai/demand` is the read-only demand planning workbench backed by forecast snapshots and replenishment recommendations.
- The POZ company/demo app uses the existing Supabase cloud Postgres database.
- ThePartyStore remains isolated on its own database.

## Non-Negotiables

- No shared tenant database.
- No ThePartyStore database changes during company admin polish.
- No new POZ database unless a backup, restore rehearsal, env cutover, and rollback plan are approved.
- Company admin features use existing roles first: `OWNER` and `ADMIN` are SuperAdmin-equivalent.
- Keep the current Grabber visual identity: dark shell, emerald/lime brand, orange company CTA.

## Milestone 1 - Live Deploy Recovery

Goal: production container must run the latest Git commit.

Checks:
- `/api/health` build must match latest `main`.
- `/company/leads` must render without fallback crashes.
- A public lead form submission must appear in `/company/leads`.
- `company_leads` table must exist in the POZ company DB.

Known fact:
- `company_leads` is already migrated on POZ Supabase.
- If Coolify still reports an old commit, redeploy from the application resource, not the exited Supabase service.

## Milestone 2 - Company Admin Surface

Implemented scope:
- `/company` command dashboard with profile, pipeline metrics, and recent leads.
- `/company/settings` profile/logo editor.
- `/company/admin` SuperAdmin command center.
- `/company/roadmap` in-app roadmap and command links.
- `/company/deployments` deployment register.
- `/company/audit` filtered audit log viewer.
- Navigation links under Commerce and Settings.
- Existing `/settings` page can also edit `logoUrl`.

Exit criteria:
- Owner/Admin can reach company leads, settings, staff, storefront builder, ops, and backups from one place.
- Owner/Admin can reach the roadmap from `/company`, `/company/admin`, and the Settings nav.
- Company logo URL persists through `business_profile.logo_url`.
- No dead links in the admin command center.
- Company audit trail renders recent protected actions without exposing raw stack traces.

## Milestone 3 - Proper SuperAdmin CRUD

Status: started. Client provisioning register, deployment register, company audit trail, and demand planning foundation are now implemented; Coolify automation remains future work.

CRUD modules:
- Leads: already live at `/company/leads`.
- Staff/users: use `/settings/staff` unless a dedicated `/company/admin/users` wrapper is approved.
- Company profile: `/company/settings`.
- Client provisioning register: `/company/clients`, backed by `company_clients` and `company_onboarding_tasks`.
- Deployment register: `/company/deployments`, backed by `company_deployments`.
- Audit trail: `/company/audit`, backed by `audit_logs`.

Implemented demand planning tables:
- `forecast_runs`
- `forecast_items`
- `sku_classifications`
- `replenishment_recommendations`

Implemented client provisioning fields:
- Client status: PROSPECT, DEMO, WON, PROVISIONING, LIVE, ON_HOLD, LOST.
- Isolated app readiness: app status, database status, target domain, Coolify app name, database name.
- Client configuration: vertical preset, layout template, branch count.
- Handover state: NOT_READY, IN_PROGRESS, READY, HANDED_OVER.
- Default onboarding checklist: app, DB, env, bootstrap, seed, vertical, branding, smoke, handover.

Implemented deployment register fields:
- Business/app identity: business name, app name, environment, repository, branch, commit SHA.
- Infrastructure references: target domain, database name, Coolify project ID, Coolify service ID.
- Readiness state: app status, database status, deploy status, health status.
- Ops handover: notes, next action, last deployed timestamp, last checked timestamp.

## Milestone 4 - Inventory Demand Planning

Status: foundation live. The first release is intentionally read-only for commerce operations: it computes and stores forecast evidence, SKU classifications, and draft replenishment recommendations without creating purchase orders or mutating stock.

Implemented:
1. Read-only planner from existing sales, order lines, products, and stock balances.
2. ABC/XYZ classification baseline.
3. Safety stock and reorder point recommendations.
4. Snapshot persistence into forecast and replenishment tables.
5. Supplier/warehouse review queue at `/purchasing/recommendations`.
6. Explicit draft PO creation from one reviewed recommendation.

Remaining:
1. Full PO approval state machine before GRN/payment.
2. Forecast accuracy reporting using WMAPE and bias.
3. Cost variance and supplier scorecards.

Non-goals:
- No automatic PO creation in the first planning release.
- No ML forecast before deterministic baseline metrics are visible.
- No stock mutation outside existing inventory and purchasing services.

## UI and Motion Rules

- Dense dashboard layout, not a marketing hero.
- 44px minimum interactive height.
- Visible labels for every form field.
- Loading and saving states on every async action.
- Animate only transform/opacity; keep durations 150-300ms.
- Respect `prefers-reduced-motion`.
- Use Lucide icons, not emoji.

## Deployment Runbook

1. Push latest `main`.
2. Coolify -> POZ app -> redeploy from `main`.
3. Confirm `/api/health` build starts with latest commit.
4. Submit one lead on `grabberpoz.com`.
5. Confirm it appears in `/company/leads`.
6. Confirm `/company`, `/company/settings`, `/company/admin`, and `/company/roadmap` render for Owner/Admin.
7. Confirm `/company/audit` renders recent logs for Owner/Admin/Manager.
8. Confirm `/company/deployments` renders and can create a manual deployment record after migration 0024.
9. Confirm `/ai/demand` renders and can save a forecast snapshot after migration 0025.
10. Confirm `/purchasing/recommendations` renders and can create a draft PO after migration 0026.
