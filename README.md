# Grabber Business OS & Jarvis Autonomous OS
**Single-Business Edition: Commerce Core + Physical Operations + Jarvis Autonomous Business OS**

[![Tests](https://img.shields.io/badge/Tests-629%20Passing-emerald)](https://github.com/)
[![Database](https://img.shields.io/badge/Database-Postgres%20Drizzle-blue)](https://github.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Single%20Business%20Solo-purple)](https://github.com/)
[![Auth](https://img.shields.io/badge/Security-Dual%20Session%20HMAC-green)](https://github.com/)

---

## Overview

**Grabber Business OS** is a single-business, standalone commercial operating system engineered for dedicated deployments (1 VPS / 1 database per business). It rejects SaaS multi-tenant shared DBs in favor of data sovereignty and deterministic physical operations.

**Jarvis Autonomous OS** sits on the commerce engine: measure -> propose -> staff approve -> execute through Approval Center.

**Commercial SSOT:** one product only, **Grabber Business OS Pro**. Vertical packs configure the client business. They are not feature tiers.

**Technical SSOT:** prefer `src/db/schema.ts`, service layers, and [`docs/SYSTEM_SSOT_AND_ROBUSTNESS.md`](docs/SYSTEM_SSOT_AND_ROBUSTNESS.md) over marketing copy. Full ERP gap / next-wave map: [`docs/ERP_GAPS_AND_NEXT_WAVE.md`](docs/ERP_GAPS_AND_NEXT_WAVE.md).

---

## Master documentation

1. [01 System Architecture](docs/01_SYSTEM_ARCHITECTURE.md)
2. [02 Deployment & Onboarding](docs/02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md)
3. [03 Commerce & Operations](docs/03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md)
4. [04 Jarvis Autonomous OS](docs/04_JARVIS_AUTONOMOUS_OS_MANUAL.md)
5. [05 Vertical Intelligence](docs/05_VERTICAL_INTELLIGENCE_GUIDE.md)

**Also:** [docs/README.md](docs/README.md) | [ROADMAP](docs/ROADMAP.md) | [Wave B3 Contabo ops](docs/WAVE_B3_OPS_CHECKLIST.md) | [Agents](docs/AGENTS.md)

---

## Quick start

```bash
npm install
npm test
npm run db:bootstrap
npm run auth:coverage
npm run dev
```

Useful: `npm run typecheck` | `npm run analyze:sizes` | `npm run release:gate`

---

## Current product position (2026-09-27)

| Track | Status |
|-------|--------|
| Core commerce hardening | Green locally: typecheck, 629 tests, production build |
| Company site | Live on Coolify at `grabberpoz.com`; company/demo host split is active |
| Demo storefront | Live at `demo.grabberpoz.com` with seeded catalog and theme picker |
| ThePartyStore | Live client storefront on its dedicated app/database; final handover checks remain |
| Wave B3 Contabo ops | Checklist ready; use `/api/health` for Coolify health checks |
| M8 A11y + PWA | Closed |
| **Next** | Company landing polish, client handover checklist, backup/restore drill, and supervised first sale/order |

Landing: `LANDING_MODE=company|storefront` controls HQ marketing vs client shop at `/`; when unset, host fallback decides. There is no `auto` mode.

Database note: the active company/demo app currently uses the configured Supabase cloud Postgres. The exited Coolify Supabase service in the POZ project is not the live serving database; do not replace it during launch polish without a backup-first migration plan.

Company admin note: `/company` is the company dashboard, `/company/leads` is the prospect CRM, `/company/settings` controls company profile/logo, and `/company/admin` is the Owner/Admin command center. See [`docs/COMPANY_ADMIN_SUPERADMIN_PLAN.md`](docs/COMPANY_ADMIN_SUPERADMIN_PLAN.md).

---

## Client isolation rule

Every paying client gets one isolated application environment and one dedicated private Postgres database. Never point two clients at the same `DATABASE_URL`. ThePartyStore keeps its current database for launch; new clients get new private databases through the Coolify provisioning playbook.

---

## License & architecture guarantee

Built for commercial deployment by Grabber. Protected by strict single-business architecture invariants.
