# Grabber Business OS & Jarvis Autonomous OS
**Single-Business Edition: Commerce Core + Physical Operations + Jarvis Autonomous Business OS**

[![Tests](https://img.shields.io/badge/Tests-556%2B%20Passing-emerald)](https://github.com/)
[![Database](https://img.shields.io/badge/Database-99%20Tables%20Drizzle-blue)](https://github.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Single%20Business%20Solo-purple)](https://github.com/)
[![Auth](https://img.shields.io/badge/Security-Dual%20Session%20HMAC-green)](https://github.com/)

---

## Overview

**Grabber Business OS** is a single-business, standalone commercial operating system engineered for dedicated deployments (1 VPS / 1 database per business). It rejects SaaS multi-tenant shared DBs in favor of data sovereignty and deterministic physical operations (branches & warehouses under one commercial entity).

**Jarvis Autonomous OS** sits on the commerce engine: measure → propose → staff approve → execute (Approval Center).

**SSOT:** Prefer `src/db/schema.ts`, service layers, and [`docs/SYSTEM_SSOT_AND_ROBUSTNESS.md`](docs/SYSTEM_SSOT_AND_ROBUSTNESS.md) over marketing copy. Full ERP gap / next-wave map: [`docs/ERP_GAPS_AND_NEXT_WAVE.md`](docs/ERP_GAPS_AND_NEXT_WAVE.md).

---

## Master documentation

1. [01 System Architecture](docs/01_SYSTEM_ARCHITECTURE.md)
2. [02 Deployment & Onboarding](docs/02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md)
3. [03 Commerce & Operations](docs/03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md)
4. [04 Jarvis Autonomous OS](docs/04_JARVIS_AUTONOMOUS_OS_MANUAL.md)
5. [05 Vertical Intelligence](docs/05_VERTICAL_INTELLIGENCE_GUIDE.md)

**Also:** [docs/README.md](docs/README.md) · [ROADMAP](docs/ROADMAP.md) · [Wave B3 Contabo ops](docs/WAVE_B3_OPS_CHECKLIST.md) · [Agents](docs/AGENTS.md)

---

## Quick start

```bash
npm install
npm test
npm run db:bootstrap
npm run auth:coverage
npm run dev
```

Useful: `npm run typecheck` · `npm run analyze:sizes` · `npm run release:gate`

---

## Current product position (2026-09-18)

| Track | Status |
|-------|--------|
| Waves A–C (perf, storefront restore, safe splits) | Done |
| Wave B3 Contabo ops | Checklist ready — redeploy Contabo for health `build`/`landingMode` |
| M8 A11y + PWA | Closed |
| **Next: M7** Client onboarding wizard | S1 shell in progress (`/setup` wizardSteps) |

Landing: `LANDING_MODE=company|storefront` — HQ marketing vs client shop at `/`; when unset, host fallback decides.

---

## License & architecture guarantee

Built for commercial deployment by Grabber. Protected by strict single-business architecture invariants.
