# Grabber Business OS — Claims & Scope (Contract Boundary)

**Purpose:** Define what Grabber may **truthfully claim**, sell, and warrant.  
Use this document in proposals, SOWs, invoices, and dispute resolution.  
**SSOT for marketing claims.** If GTM or sales decks conflict, **this file wins**.  
**Commercial model:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)  
**Hosting:** Grabber Managed **VPS** by default — [`VPS_DEPLOY.md`](./VPS_DEPLOY.md)

**Effective:** 2026-09-02

---

## 1. Product definition

**Grabber Business OS (Solo)** is a **dedicated single-business** retail operating system:

- One merchant = **one isolated PostgreSQL database** + **one app instance** (default: Grabber-managed VPS; optional Vercel).
- Dual surface: **public storefront** (`/`) and **staff OS** (`/app` via `/adminpoz`).
- Sold as a **Perpetual Single-Business Usage License** + recurring **Infrastructure & Maintenance** — not multi-tenant SaaS lock-in, and **not** a source-code sale.

It is **not**:

- A multi-tenant SaaS where many shops share one database.
- Automatic ownership of Grabber source code or resale rights.
- A guaranteed Meta/TikTok Ads Manager replacement.
- Unlimited AI video inside the flat monthly fee.

---

## 2. Claim tiers

### Tier A — May claim as **included** in Starter / CORE (R3)

| Capability | Honest wording |
|------------|----------------|
| Perpetual usage license | Named business may run one production instance indefinitely for contracted major version family. |
| Dedicated database | Client data in a dedicated Postgres DB (on Grabber VPS or contracted host). |
| Counter POS | Staff PIN login; barcode checkout; cash/card tenders; shift open/close. |
| Unified stock | Same inventory pool for POS + storefront. |
| Web storefront | Public catalog + **COD** checkout when shopper signed in. |
| Orders / Polim / settings / reports | As contracted in package. |

### Tier B — Optional add-ons (contracted + configured)

| Capability | Prerequisite |
|------------|---------------|
| WhatsApp Cloud API | `WHATSAPP_*` + webhook |
| Pixels / Meta CAPI | `/social` or env |
| PayHere / WebXPay | Explicit enable |
| Verticals | Flags + smoke |
| Creative C0 (PDF / UGC scripts) | Growth+ |
| Social Channel Manager | `/social` |
| Agents / Jarvis | Staff session |
| Grabber Managed Cloud (VPS) | Monthly infra fee |
| Sentry-backed support | Grabber ops DSN on host |

### Tier C — Forbidden unless separately delivered

| Overclaim | Reality |
|-----------|---------|
| “You own the source code” | License ≠ source; IP stays with Grabber |
| “Unlimited AI video in LKR 5,000/mo” | C1/C2 = credits |
| “Live AI video on the web VPS alone” | C2 needs GPU worker URL |
| “Online card checkout included” | Default = COD |
| “Schema certify = handover” | Need physical POS + acceptance |
| Demo PIN in production | Must rotate |

---

## 3. Certification language

| Phrase | Meaning |
|--------|---------|
| **L4_SCHEMA_SQL_CERTIFIED** | Schema + synthetic SQL passed |
| **READY_FOR_RETESTING P0 PASS** | Automated + manual dual-surface |
| **PHYSICAL_POS_SMOKE PASS** | Scanner + printer + live sale |
| **CLIENT_ACCEPTANCE_7DAY PASS** | Pilot sheet signed |
| **PRODUCTION_HANDOVER** | Contracted pack + rotated secrets + deliverables signed |

---

## 4. Warranty / support boundary

1. **Hosting:** Grabber Managed VPS uptime + backups while **Infrastructure & Maintenance** is paid; self-host only under AMC.  
2. **Sentry:** Errors captured to Grabber ops for diagnosis while maintenance is active.  
3. **Integrations:** Meta/PayHere/courier outages = assist, not core POS breach.  
4. **Data:** Client owns data; export/dump on request. Grabber owns product IP.  
5. **Updates:** While maintenance active on supported track; major modules = upgrade SKU.  
6. **AI:** Best-effort; billed by credits for C1/C2.

---

## 5. Demo vs production

| | Demo | Client production |
|--|------|-------------------|
| Host | Grabber VPS or Vercel demo | Dedicated DB + isolated app on Managed Cloud |
| License | Internal | Perpetual Single-Business Usage License |
| PIN | Demo only | Rotated |

---

## 6. Change control

Update this file with [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md) and [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md) in the same change.
