# GRABBER BUSINESS OS — MASTER DOCUMENTATION INDEX

Welcome to the official documentation for **Grabber Business OS (Single-Business Edition)** and the **Jarvis Autonomous Business OS**.

---

## 📚 Master Documentation Suite

The complete documentation is organized into 5 authoritative master pillars:

| Pillar | Title & Purpose | Key Highlights |
|:---|:---|:---|
| **[01 System Architecture](./01_SYSTEM_ARCHITECTURE.md)** | **Master System Architecture & Tech Stack** | Single-business database model, 49 Drizzle ORM tables, double-entry general ledger, HMAC auth, and system topology. |
| **[02 Deployment & Onboarding](./02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md)** | **Client Onboarding & Deployment Playbook** | Step-by-step setup in < 15 mins: Supabase DB, migrations bootstrap, Vercel/VPS deploy, DNS binding, and Level 4 SQL certification. |
| **[03 Commerce & Operations](./03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md)** | **Commerce & Physical Operations Playbook** | Fast counter POS, barcode scanning, shift registers, Polim Potha customer credit ledger, GRN receiving, and payment gateways. |
| **[04 Jarvis Autonomous OS](./04_JARVIS_AUTONOMOUS_OS_MANUAL.md)** | **Jarvis Autonomous OS Operational Manual** | Closed-loop brain, Action Policy Matrix, Owner Morning Brief, SEO audit & keyword intelligence, and true profit attribution. |
| **[05 Vertical Intelligence](./05_VERTICAL_INTELLIGENCE_GUIDE.md)** | **Vertical Intelligence Packs Specification** | Specialized rules and KPIs for Grocery, Fashion, Electronics & Repairs, Restaurant / KOT, Hardware, and General Retail. |

---

## 🏆 Certification & Quality Gates

* **[Certification Levels & SQL Gates](./certification/CERTIFICATION_LEVELS.md)**: Specifications for Level 1 through Level 4 automated SQL database gates.
* **[Client Acceptance Test Suite](./certification/CLIENT_ACCEPTANCE_TEST.md)**: 7-day end-to-end commercial smoke test scenarios.
* **[Release Gate Specification](./RELEASE_GATE.md)**: Automated pre-flight validation rules and pre-commit checks.

---

## ⚡ Quick Command Reference

```bash
# Run full automated test suite (62 test files / 433 tests)
npm test

# Bootstrap fresh database with migrations and double-entry COA
npm run db:bootstrap

# Validate API authentication coverage (118 endpoints certified)
npm run auth:coverage

# Pre-flight environment check before production deployment
npm run env:validate

# Run Level 4 client database certification gate
npm run client:certify -- --client "Client Store Name" --slug "clientstore"
```
