# Grabber Business OS — Client Deliverables

**What the client receives.**  
**Claims:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) · **Pricing model:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md) · **Ops:** [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) · **VPS:** [`VPS_DEPLOY.md`](./VPS_DEPLOY.md)

**Effective:** 2026-09-02

---

## 1. Commercial deliverable (every paying client)

| Item | Form |
|------|------|
| **Perpetual Single-Business Usage License** | Named entity; one production instance |
| **Implementation** | Scoped migration, staff setup, training |
| **Infrastructure & Maintenance** (Managed Cloud) | Monthly/annual — VPS, DB, backups, updates, support, Sentry |
| **Data ownership** | Export/dump rights; not Grabber source IP |

---

## 2. Packages → technical deliverables

### Starter (maps to CORE / R3)

| Deliverable | Acceptance |
|-------------|------------|
| Dedicated Postgres DB | `/api/health` → `db: connected` |
| App on Grabber Managed VPS (or contracted host) | HTTPS live |
| P0 env + Sentry DSN (Grabber ops) | `env:validate`; health `sentry: configured` |
| Schema ~49 tables + COA | `client:certify` |
| OWNER user (PIN rotated) | `/adminpoz` → `/app` |
| Catalog + opening stock | Store + POS |
| Storefront COD + POS + orders + settings | Smoke pass |
| Docs + credential sheet | Signed |

**Not in Starter unless sold:** WhatsApp API, PayHere, GPU video, deep verticals.

### Business Growth

Starter **plus** (as contracted): up to 3 branches, COMMS WhatsApp, `/social`, Creative **C0**, sold verticals, priority support window.  
AI video: starter credit pack **only if line-itemed** — not unlimited.

### Enterprise

Custom scope; Managed Cloud **or** self-host + **mandatory AMC**; optional hybrid.

### Add-ons

| Package | Deliverable |
|---------|-------------|
| **COMMS** | WhatsApp Cloud API + webhook + wa.me |
| **SOCIAL C0** | `/social` + PDF + UGC scripts |
| **AI C1/C2** | Credits / packs |
| **VERTICAL** | Flag + smoke |
| **PILOT** | Re-test + physical POS + 7-day acceptance |

---

## 3. Creative tiers (must appear on quote)

| Tier | Deliverable | Infra |
|------|-------------|-------|
| C0 | PDF, scripts, Social Hub | App only |
| C1 | Cloud images | API keys |
| C2 | GPU video | Separate GPU worker |

---

## 4. Handover artifacts

1. License certificate (named business, package, date)  
2. URLs (storefront, `/adminpoz`, webhook if COMMS)  
3. Staff roster + PIN rotation confirmation  
4. Cert report if run  
5. Claims Tier C acknowledgment (source ≠ license; AI not unlimited; COD default)  
6. Maintenance start date + SLA contact  

**Access:** Grabber manages VPS by default. Client gets data export rights — not necessarily root SSH unless self-host Enterprise.

---

## 5. Client responsibilities

- Accurate CSVs and opening stock  
- Domain DNS (unless Grabber manages)  
- Meta/WhatsApp Business verification (COMMS)  
- Hardware (PC, scanner, 80mm printer)  
- Paying Infrastructure & Maintenance / AMC on time  

---

## 6. Sign-off

```text
Client: ____________  Package: Starter / Growth / Enterprise
Host: Grabber VPS / Vercel / Self-host+AMC
License: Perpetual Single-Business Usage — INITIALS ____
AI tier: C0 / C1 / C2 credits: ________
Physical POS: PASS / WAIVE    7-day: PASS / DEFERRED
Owner: ____________  Date: ____
Grabber: ____________  Date: ____
```
