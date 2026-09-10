# GRABBER SOLO / BUSINESS OS — MASTER DOCUMENTATION INDEX

Welcome to the official documentation for **Grabber Solo / Grabber Business OS (Single-Business Edition)** and the **Jarvis Autonomous Business OS**.

---

| **[Full Proof Plan](./FULL_PROOF_PLAN.md)** | Phases 0–4 + operator checklist | Production proof track |
| **[Vertical Depth](./VERTICAL_DEPTH_PLAN.md)** | Restaurant / salon / ROAS waves A–C | Vertical money paths |
| **[Coolify incident 2026-09-11](./DEPLOY_INCIDENT_COOLIFY_2026-09-11.md)** | Contabo build failure + secret leak | Must-read before Coolify redeploy |
| **[docs/archive](./archive/README.md)** | Superseded snapshots | Do not use for runbooks |

---

## 🏛️ 1. Architecture & Domain Engine Guides

| Document | Title & Focus | Scope & Highlights |
| :--- | :--- | :--- |
| **[01 System Architecture](./01_SYSTEM_ARCHITECTURE.md)** | **Master System Architecture & Tech Stack** | Single-business database topology, 65 PostgreSQL tables, double-entry GL, and HMAC security. |
| **[Domain Architecture](./GRABBER_DOMAIN_ARCHITECTURE.md)** | **Canonical Domain Engine Specifications** | Server-authoritative pricing, immutable stock ledger, and unified multi-channel commerce core. |
| **[Offline POS Subsystem](./GRABBER_OFFLINE_POS.md)** | **5-Store IndexedDB Offline Architecture** | Catalog snapshots, customer cache, transaction journal, sequence UUIDs, and reconnect backoff sync. |
| **[Returns & Reverse Commerce](./GRABBER_RETURNS_REFUNDS.md)** | **Itemized Returns & Pro-Rata Accounting** | `orderReturnLines` schema, discount/tax proration, grading/restocking, and Polim Potha credit refunds. |
| **[Commerce Invariants Ledger](./GRABBER_INVENTORY_ACCOUNTING_INVARIANTS.md)** | **The 20 Golden Invariants of Grabber Solo** | Mathematical invariants for GL balance ($\sum D = \sum C$), stock deltas, and idempotency gates. |
| **[Vertical Adaptor Framework](./GRABBER_VERTICAL_ENGINE_ARCHITECTURE.md)** | **Vertical Intelligence Pack Architecture** | Modular adaptors for Grocery, Fashion, Electronics, Mobile Repair, Restaurant, and Hire Purchase. |

---

## 🏆 2. Certification & Audit Ledgers (Pass 1–3)

| Document | Purpose | Key Content |
| :--- | :--- | :--- |
| **[Odoo Parity Matrix](./GRABBER_ODOO_PARITY_MATRIX.md)** | **Odoo-Class Feature Benchmark** | Full benchmark comparing Grabber Solo against Odoo Community & Enterprise standards. |
| **[Feature Certification Report](./GRABBER_FEATURE_CERTIFICATION.md)** | **Independent Certification Matrix** | Verified F5 production ratings and evidence anchors across all horizontal domains. |
| **[False-Positive Register](./GRABBER_CERTIFICATION_FALSE_POSITIVES.md)** | **Adversarial Audit & Corrected Claims** | Transparent disclosure of disproven claims, downgrades, and hardened validation fixes. |
| **[Master Gap Register](./GRABBER_GAP_REGISTER.md)** | **Remediation & Roadmapped Scope** | Closed issues ledger (GAP-001–007) and scheduled Phase 4 vertical extensions. |

---

## 🚀 3. Operational Playbooks & Deployment

| Playbook | Purpose | Key Content |
| :--- | :--- | :--- |
| **[02 Deployment & Onboarding](./02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md)** | **Client Onboarding Playbook** | 15-minute setup: Supabase DB, migrations bootstrap, Vercel/VPS deploy, DNS binding. |
| **[03 Commerce & Operations](./03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md)** | **Physical Operations Playbook** | Fast counter POS, barcode scanning, shift registers, Polim Potha customer credit, and GRN. |
| **[04 Jarvis Autonomous OS](./04_JARVIS_AUTONOMOUS_OS_MANUAL.md)** | **Jarvis Operational Manual** | Closed-loop brain, Action Policy Matrix, Owner Morning Brief, SEO audit, and profit attribution. |
| **[05 Vertical Intelligence](./05_VERTICAL_INTELLIGENCE_GUIDE.md)** | **Vertical Packs Guide** | Specialized domain parameters, KPIs, and prompt templates across active vertical packs. |

---

## ⚡ Quick Operational Command Reference

```bash
# Run full automated test suite (68 test files / 451 tests)
npm test

# Run complete release gate suite (env validate, auth coverage, RLS, typecheck, tests)
npm run release:gate

# Typecheck the entire TypeScript codebase
npm run typecheck

# Bootstrap fresh database with numbered migrations and Chart of Accounts
npm run db:bootstrap

# Validate API authentication coverage (119 endpoints certified)
npm run auth:coverage

# Pre-flight environment check before production deployment
npm run env:validate

# Run Level 4 client database certification gate
npm run client:certify -- --client "Client Store Name" --slug "clientstore"
```
