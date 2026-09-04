# M6 INSTALLATION IDENTITY & CLIENT CONFIGURATION REPORT

**Release Milestone:** M6 — Installation Identity & Client Configuration  
**Date:** 2026-09-03  
**Status:** 🟢 **ENGINEERING CERTIFIED**  
**Architecture:** Single-Business Standalone Installation (`ONE DB -> ONE BIZ -> ONE INSTALL`)  
**Commerce Foundation:** M3 Commerce Integrity (CERTIFIED & FROZEN)  
**Payment Gateway:** M4 Payment Gateway Adapter Framework (CERTIFIED & FROZEN)  
**Promotion Engine:** M5 Storefront Promotion & Conversion Engine (CERTIFIED & FROZEN)  

---

## 1. Commercial Reality & Architectural Law

Grabber Poz Solo is architected as an **independent, client-owned business operating system**:

```text
GRABBER POZ SOLO
        │
        ├── Client A (ABC Fashion)
        │    ├── Database A
        │    ├── Domain A
        │    └── License A
        │
        ├── Client B (City Electronics)
        │    ├── Database B
        │    ├── Domain B
        │    └── License B
        │
        └── Client C (GMS Mart)
             ├── Database C
             ├── Domain C
             └── License C
```

**Architectural Boundaries Enforced:**
1. **Zero `tenant_id` proliferation:** The system strictly rejects multi-tenant database designs. Each client maintains their own private Postgres database, encryption keys, and domain.
2. **Server-authoritative identity:** Installation UUID, license tier, tax registration numbers, and visual branding are managed by the server. The browser displays configuration but can never forge or manipulate it.
3. **Data safety guarantee:** Maintenance expiration or license status transitions **never delete, corrupt, or block access to local POS sales or historical ledger data**.

---

## 2. Canonical Identity Model Implemented

The canonical model defined in [`src/lib/installation/types.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/installation/types.ts) provides complete client whitelabeling:

```text
InstallationIdentity
 ├── installationId          (Immutable installation UUID)
 ├── businessId              (Canonical business UUID)
 ├── businessName            (Operating trade name)
 ├── legalName               (Registered corporate name for tax receipts)
 ├── displayName             (Short UI brand title)
 ├── address                 (Line 1, Line 2, City, Postal Code, Country)
 ├── contact                 (Phone, Email, Website)
 ├── localization            (Currency: LKR, Timezone: Asia/Colombo, Locale: en-LK)
 ├── tax                     (VAT/TIN number, SVAT, tax rate: 18%, tax inclusive flag)
 ├── branding                (Primary color, accent color, tagline, logo, favicon)
 └── license                 (License ID, Edition, Status, Maintenance Status, Cryptographic Signature)
```

---

## 3. Cryptographic Tamper Resistance & Licensing

Implemented in [`src/lib/installation/license-service.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/installation/license-service.ts):
* **HMAC Signature:** Calculated as `HMAC-SHA256(installationId:licenseId:edition:issuedTo, AUTH_SECRET)`.
* **Hardware/Install Binding:** If an attacker attempts to copy a license from Installation A to Installation B, verification immediately fails with `tampering detected`.
* **Tier Escalation Defense:** Modifying `edition` from `STANDARD` to `ENTERPRISE` without the private signing secret is immediately flagged as tampered.
* **Graceful Degradation:** Tampered or suspended licenses degrade gracefully (`license.status = 'SUSPENDED'`) without touching business databases or transaction integrity.

---

## 4. Real-time System Diagnostics

Implemented in [`src/lib/installation/diagnostics.ts`](file:///d:/GRABBER%20POZ%20SOLO/src/lib/installation/diagnostics.ts) and exposed via `GET /api/installation/diagnostics`:
1. **Database & Configuration:** Validates database connection and `business_config` row presence.
2. **License Cryptographic Verification:** Proves valid HMAC signature and active status.
3. **Branch Infrastructure:** Verifies active branches are provisioned for POS registers.
4. **Tax & Invoicing Profile:** Asserts VAT registration and rate consistency.
5. **Security Boundaries:** Enforces `AUTH_SECRET` presence and rejects `AUTH_OPTIONAL=true` in production.

---

## 5. UI Surfaces & Whitelabel Propagation

1. **Owner Settings UI ([`/settings/installation`](file:///d:/GRABBER%20POZ%20SOLO/src/app/settings/installation/page.tsx)):**
   - Direct tab in main `/settings` navigation.
   - Comprehensive editor for Business Profile, Legal Name, Address, Contact, and Tax configuration.
   - Interactive Diagnostics Runner with real-time pass/warn/fail badges.
   - Copyable Installation UUID and License Key badges.
2. **Public Identity API ([`/api/installation/identity`](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/installation/identity/route.ts)):**
   - Unauthenticated, safe endpoint exposing only branding, display name, contact info, and tax label for storefronts and receipts (zero secret leakage).
3. **Auditability:**
   - Identity modifications write an immutable audit log (`INSTALLATION_IDENTITY_UPDATED`) recording actor, timestamps, and field changes.

---

## 6. Verification & Certification Evidence

| Gate / Suite | Command | Result | Notes |
|:---|:---|:---:|:---|
| **TypeScript Compilation** | `npx tsc --noEmit` | **PASS (0 errors)** | Zero type errors |
| **M6 Installation Tests** | `tests/installation-identity.test.ts` | **6/6 PASS** | Canonical model, tampering, hardware lock, and data safety |
| **Vitest Master Suite** | `npx vitest run` | **49/49 PASS** | **351 / 351 tests passing (100% green)** |
| **M3 Commerce Regression** | `npm run release:gate-m3` | **118/118 PASS** | **Zero regression** on CI-001 through CI-012 |
| **M5 Promotion Regression** | `npm run release:gate-m5` | **15/15 PASS** | Zero regression on PI-001 through PI-012 |
| **M6 Release Gate** | `npm run release:gate-m6` | **PASS** | Complete automated M6 release gate |
| **API Auth Coverage** | `npm run auth:coverage` | **107/107 PASS** | 100% route classification maintained |

---

## 7. Next Milestones

Following the revised commercial roadmap:
* **M7 Client Onboarding:** 11-step interactive owner setup wizard — [`reports/M7_ONBOARDING_PLAN.md`](./M7_ONBOARDING_PLAN.md). First slice: wizard shell + progress SSOT.
* **M8 Excel / CSV Import:** High-volume product catalog import engine with preview, column mapping, duplicate detection, and error reports.
