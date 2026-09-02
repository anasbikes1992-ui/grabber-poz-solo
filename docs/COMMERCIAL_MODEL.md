# Grabber Business OS — Commercial Model (SSOT)

**Perpetual Single-Business Usage License** + recurring **Infrastructure & Maintenance** + optional **AI credits**.  
**Not** a multi-tenant SaaS rent lock. **Not** a source-code sale.

**Claims:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md)  
**Deliverables:** [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md)  
**Hosting:** [`VPS_DEPLOY.md`](./VPS_DEPLOY.md) (default Grabber-managed) · Vercel optional

**Effective:** 2026-09-02 · Prices below are **indicative LKR** — lock numbers on the signed quote.

---

## 1. Sales message (approved)

> **You buy a perpetual license for your business.**  
> You are not renting your POS.  
> The monthly fee is **Cloud Infrastructure & Maintenance**: private dedicated environment, database, backups, updates, monitoring, and technical support.

**Never say in contracts:** “You own the software / source code.”  
**Say:** “Perpetual Single-Business Usage License.”

---

## 2. What the one-time fee buys vs recurring

| Component | Customer pays |
|-----------|---------------|
| Grabber perpetual business license | **One-time** |
| Implementation & configuration | **One-time** |
| Data migration (scoped SKU/customer count) | **One-time** |
| Hardware config / initial training | **One-time** |
| Dedicated cloud / VPS infrastructure | **Monthly or annual** |
| Maintenance & updates (supported track) | **Monthly/annual** |
| Support (business hours SLA) | **In maintenance** |
| AI video / heavy image generation | **Credits or packs** |
| Custom development | **Separate quotation** |

---

## 3. Default deployment: Grabber Managed Cloud (VPS)

**95% of merchants.** Grabber operates a standardized VPS fleet (or equivalent). Each client gets an **isolated app + dedicated PostgreSQL**.

```text
Customer (owns license + data)
        ↓
Grabber Business OS (perpetual license)
        ↓
Grabber-managed VPS / dedicated environment
        ↓
Dedicated PostgreSQL + storage + backups
        ↓
Sentry (ops) → Grabber fixes issues
```

Customer pays one-time license/implementation **+** monthly **Infrastructure & Maintenance**.

Optional: still deploy on Vercel for a client if contracted — same commercial terms; infra line item covers that host.

---

## 4. Packages (indicative)

| Package | One-time (license + implementation) | Monthly Infra & Maintenance | Target |
|---------|--------------------------------------|------------------------------|--------|
| **Starter** | **LKR 125,000** | **LKR 5,000** | 1 location, 1 POS, COD store, inventory, Polim, basic accounting |
| **Business Growth** | **LKR 250,000** | **LKR 10,000** | Up to 3 branches, WhatsApp COMMS, Social Hub, Creative **C0** (PDF/UGC scripts), verticals as sold |
| **Enterprise** | **LKR 450,000+** | **LKR 20,000** or AMC | 5+ branches, warehouse, custom bridges, hybrid/self-host options |

### Starter includes (scope-capped)

- 1 location, 1 POS register  
- Web storefront (COD)  
- Inventory, products, customers  
- Polim Potha (when enabled)  
- Basic reporting / COA  
- Up to **500 SKU** migration (extra SKUs billed)  
- Staff setup + initial training  
- Production deploy on Grabber VPS  
- Sentry monitoring on Grabber ops account (client does not need a Sentry seat)

### Growth adds (as contracted)

- Up to 3 branches + transfers (when configured)  
- WhatsApp Commerce (COMMS) when Meta credentials provided  
- Social Channel Manager `/social`  
- Creative C0 (PDF Studio, UGC scripts/storyboards)  
- Priority implementation window  

**Not unlimited in Growth monthly fee:** AI video renders (C1/C2) — see §6.

---

## 5. What monthly “Infrastructure & Maintenance” includes / excludes

### Included ✅

- Dedicated (or isolated) app hosting on Grabber VPS  
- Dedicated PostgreSQL + disk  
- Automated backups (schedule per contract; default daily)  
- Uptime monitoring + **Sentry** error capture (Grabber ops)  
- Security patches on supported app version  
- Application updates on the **maintenance track** while fees are current  
- Bug fixes for contracted scope  
- Remote technical support (business hours; WhatsApp/phone per SLA)

### Not included ❌ (billable)

- On-site visits after initial go-live window (e.g. 14 days)  
- Custom features / new report layouts / ERP bridges  
- Manual catalog data entry beyond contracted migration  
- Meta / PayHere / courier account fees  
- AI video / voice overage beyond credit pack  
- Major new modules (new verticals) — upgrade SKU  
- Self-host firefighting without active AMC  

---

## 6. AI / Creative commercial ring-fence

| Tier | What | Pricing |
|------|------|---------|
| **C0** | PDF Studio, UGC hooks/scripts, Social Hub | Included in Growth+ (zero GPU) |
| **C1** | Cloud image APIs (FAL/Replicate) | Starter pack or per-image |
| **C2** | GPU video / UGC render | Credits — e.g. **5 videos/mo** starter on Growth if sold; then **LKR 1,500–2,500 / video** or packs of 10 |

**Never** sell “unlimited AI generation” inside flat maintenance.

---

## 7. Self-hosted / customer server (Enterprise only)

```text
Customer server → Grabber OS → Customer Postgres → Customer network
```

- One-time from **LKR 350,000+** (license + deploy + docs + admin training)  
- Hardware bar: Ubuntu LTS / Docker / ≥16GB RAM / SSD (see `VPS_DEPLOY.md`)  
- **AMC mandatory** for remote support: **LKR 75,000–100,000 / year** (indicative)  
- No AMC → no remote debug of their offline network / SSL / Postgres  

Prefer Grabber Managed Cloud whenever possible.

---

## 8. License legal boundaries (contract must say)

1. Non-transferable **Perpetual Single-Business Usage License** for the **named legal entity**.  
2. Right to operate **one production instance** (extra shops/brands = additional license).  
3. Grabber retains **all IP**: source code, schema design, trademarks, AI pipelines, internal tools.  
4. No reverse-engineering, resale, sublicensing, or multi-tenant hosting of Grabber for third parties.  
5. Perpetual use of the **purchased major version family** while data remains; **updates** require active maintenance.  
6. Hosting and AI compute are **separate** from the license.  
7. Data export / DB dump available on request (client owns **data**, not Grabber IP).

---

## 9. Invoice line-item pattern (recommended)

```text
1. Perpetual Single-Business License — Grabber Starter ........ LKR xxx
2. Implementation & go-live (≤500 SKU, N users, training) .... LKR xxx
3. Cloud Infrastructure & Maintenance — Month 1 ............. LKR 5,000
4. AI Video Credit Pack (optional) .......................... LKR xxx
```

---

## 10. Change control

Update this file + `CLAIMS_AND_SCOPE.md` + `CLIENT_DELIVERABLES.md` + `GTM_MARKETING_PLAN.md` together when prices or package contents change.
