# Grabber Business OS — Client Deliverables

**What the client receives.**  
**Claims:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) · **Pricing model:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md) · **Ops:** [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) · **VPS:** [`VPS_DEPLOY.md`](./VPS_DEPLOY.md)

**Effective:** 2026-09-23

---

## 1. Commercial Deliverable

Every paying client receives **Grabber Business OS Pro**.

| Item | Form |
|---|---|
| Perpetual Single-Business Usage License | Named entity; one production instance unless otherwise quoted |
| Implementation | Scoped migration, vertical pack configuration, staff setup, training |
| Infrastructure & Maintenance | VPS/app, dedicated DB, backups, updates, support, monitoring |
| Data ownership | Export/dump rights; not Grabber source IP |

---

## 2. Technical Deliverables

| Deliverable | Acceptance |
|---|---|
| Dedicated database | `/api/health` reports connected DB |
| App on Grabber Managed VPS or contracted host | HTTPS live |
| Production env + monitoring | `env:validate`; Sentry/health proof where contracted |
| OWNER/admin setup | `/adminpoz` login and PIN rotated |
| Catalog + opening stock | Visible in POS and storefront |
| POS + receipt + order flow | Physical or PDF smoke pass |
| Storefront COD order | Order visible in admin and stock updates |
| Backups | Backup proof and restore procedure documented |
| Docs + credential sheet | Signed by client |

---

## 3. Vertical Pack Configuration

One or more packs are configured during onboarding:

- Retail & Wholesale.
- Electronics & Repairs.
- Restaurant / Cafe.
- Salon / Services.
- Party / Events.
- Grocery / Pharmacy readiness later, only after dedicated certification.

Vertical pack choice affects navigation, seed data, workflow defaults, reports, storefront language, and training checklist. It does not reduce the Pro platform scope.

---

## 4. Provider-Dependent Deliverables

These require credentials, third-party approval, and acceptance proof before being claimed live:

- WhatsApp Cloud API and webhook.
- PayHere/WebXPay/other payment gateways.
- Courier/delivery provider adapters.
- AI image/video/voice credits.
- Custom reports, bridges, or special vertical workflows.

---

## 5. Handover Artifacts

1. License certificate: `Grabber Business OS Pro`.
2. Selected vertical pack(s).
3. URLs: storefront, `/adminpoz`, webhook URLs where relevant.
4. Staff roster and PIN rotation confirmation.
5. Smoke/certification report.
6. Claims acknowledgment: source code is not sold, AI is not unlimited, provider-live claims require proof.
7. Maintenance start date and SLA contact.

---

## 6. Client Responsibilities

- Accurate CSVs and opening stock.
- Domain DNS unless Grabber manages it.
- Provider account ownership and verification.
- Hardware readiness: PC, scanner, 80mm printer, cash drawer where needed.
- Monthly infrastructure and maintenance payment on time.

---

## 7. Sign-Off

```text
Client: ______________________
Product: Grabber Business OS Pro
Vertical pack(s): ______________________
Host: Grabber VPS / Vercel / Self-host+AMC
License: Perpetual Single-Business Usage — INITIALS ____
Provider extras: WhatsApp / Payment / Courier / AI credits / None
Physical POS: PASS / WAIVE    7-day: PASS / DEFERRED
Owner: ______________________  Date: ____
Grabber: ____________________  Date: ____
```
