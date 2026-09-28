# Company Admin and SuperAdmin Plan

Status: active SSOT for the Grabberpoz.com company admin workstream.

## Current Position

- `grabberpoz.com` is the company/prospect landing.
- `/company/leads` is the protected lead CRM.
- `/company` is the company admin dashboard.
- `/company/settings` edits company profile and logo URL.
- `/company/admin` is the SuperAdmin command center over existing CRUD areas.
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
- Navigation links under Commerce and Settings.
- Existing `/settings` page can also edit `logoUrl`.

Exit criteria:
- Owner/Admin can reach company leads, settings, staff, storefront builder, ops, and backups from one place.
- Company logo URL persists through `business_profile.logo_url`.
- No dead links in the admin command center.

## Milestone 3 - Proper SuperAdmin CRUD

Build only after Milestone 2 is accepted.

CRUD modules:
- Leads: already live at `/company/leads`.
- Staff/users: use `/settings/staff` unless a dedicated `/company/admin/users` wrapper is approved.
- Company profile: `/company/settings`.
- Tenant provisioning register: create a dedicated table only after approval.
- Deployment register: read-only first, then write controls only if Coolify API credentials are available.
- Audit trail: expose filtered `audit_logs` view for company admin actions.

Recommended new tables later:
- `company_clients`
- `company_deployments`
- `company_onboarding_tasks`

Do not add these until the UI and workflow are approved.

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
6. Confirm `/company`, `/company/settings`, and `/company/admin` render for Owner/Admin.
