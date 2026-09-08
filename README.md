# Grabber Business OS & Jarvis Autonomous OS
**Single-Business Edition: Commerce Core + Physical Operations + Jarvis Autonomous Business OS**

[![Tests](https://img.shields.io/badge/Tests-433%20Passing-emerald)](https://github.com/)
[![Database](https://img.shields.io/badge/Database-49%20Tables%20Drizzle-blue)](https://github.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Single%20Business%20Solo-purple)](https://github.com/)
[![Auth](https://img.shields.io/badge/Security-Dual%20Session%20HMAC-green)](https://github.com/)

---

## 🚀 Overview

**Grabber Business OS** is a single-business, standalone commercial operating system engineered for dedicated deployments (1 VPS per business / 1 Database per business). It completely rejects the SaaS multi-tenant model in favor of strict data sovereignty, low query complexity (zero `tenant_id` clutter), and deterministic physical operations (multiple branches & warehouses under a single commercial entity).

**Jarvis Autonomous OS** operates on top of the commerce engine, continuously measuring the business, detecting anomalies, uncovering high-margin revenue opportunities, managing SEO and content, executing approved actions through fine-grained autonomy policies, and attributing real revenue and profit.

---

## 📚 Master Documentation Suite

The complete documentation is organized into 5 authoritative master pillars:

1. 🏛️ **[01 System Architecture](docs/01_SYSTEM_ARCHITECTURE.md)**: Single-business database model, 49 Drizzle ORM tables, double-entry general ledger, HMAC auth, and system topology.
2. 🚀 **[02 Deployment & Onboarding](docs/02_CLIENT_ONBOARDING_AND_DEPLOYMENT.md)**: Step-by-step setup in < 15 mins: Supabase DB, migrations bootstrap, Vercel/VPS deploy, DNS binding, and Level 4 SQL certification.
3. 🛒 **[03 Commerce & Operations](docs/03_COMMERCE_AND_OPERATIONS_PLAYBOOK.md)**: Fast counter POS, barcode scanning, shift registers, Polim Potha customer credit ledger, GRN receiving, and payment gateways.
4. 🧠 **[04 Jarvis Autonomous OS](docs/04_JARVIS_AUTONOMOUS_OS_MANUAL.md)**: Closed-loop brain, Action Policy Matrix, Owner Morning Brief, SEO audit & keyword intelligence, and true profit attribution.
5. 📦 **[05 Vertical Intelligence](docs/05_VERTICAL_INTELLIGENCE_GUIDE.md)**: Specialized rules and KPIs for Grocery, Fashion, Electronics & Repairs, Restaurant / KOT, Hardware, and General Retail.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (62 test files / 433 tests)
npm test

# 3. Bootstrap fresh database with migrations and double-entry COA
npm run db:bootstrap

# 4. Verify API security & authentication coverage
npm run auth:coverage

# 5. Start development server
npm run dev
```

---

## 🛡️ License & Architecture Guarantee
Built for commercial deployment by Grabber. Protected by strict single-business architecture invariants.
