# Grabber Business OS — Stage Readiness (Next Stage & Physical Testing)

**Snapshot date:** 2026-09-02  
**Default host:** Grabber Managed **VPS** ([`VPS_DEPLOY.md`](./VPS_DEPLOY.md))  
**Commercial:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)  
**Related:** [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) · [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) · [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md)

---

## 1. Verdict

| Question | Answer |
|----------|--------|
| Ready to **sell Starter (CORE / R3)**? | **Yes — CONDITIONALLY**, after physical POS smoke. |
| Default commercial model? | **Perpetual license + monthly Infra & Maintenance** (not SaaS rent). |
| Default deploy? | **Grabber VPS** + dedicated Postgres + **Sentry**. |
| Ready to **promise live AI video**? | **No**, until GPU worker + credits model. |

---

## 2. Release gate summary

| Release | Verdict | Sell? |
|---------|---------|-------|
| R1 Foundation | CONDITIONALLY READY | Required |
| R2 Commerce | CONDITIONALLY READY | Required |
| R3 Storefront COD | CONDITIONALLY READY | **Sell here** |
| R4 WhatsApp | CONDITIONALLY READY | Add-on |
| R5–R6 Jarvis / Agents | CONDITIONALLY READY | Soft sell |
| R7 Creative / Social | UI + PDF + UGC scripts + queues shipped; live video optional | Add-on C0–C2 |

Details: [`RELEASE_GATE.md`](./RELEASE_GATE.md).

---

## 3. Done (foundation for next stage)

- Dual auth: shopper vs staff sessions  
- Durable Postgres commerce APIs  
- Storefront `/` + staff `/app`  
- Creative Engine routes `/creative/*` (PDF, video queue, UGC)  
- Social Channel Manager `/social` (handles, pixels, catalog XML, creative merge)  
- WhatsApp send/webhook wiring  
- Onboarding / cert / release scripts  
- Agent registry (12) + approval bridge  

---

## 4. Remaining necessary work

### P0 — before first paid handover

| ID | Item | Owner |
|----|------|-------|
| P0-1 | Complete manual RT-M01…M08 on target URL | Ops |
| P0-2 | Physical scanner + 80mm printer + shift smoke | Ops + client |
| P0-3 | Rotate demo PIN / any leaked secrets | Ops |
| P0-4 | Client CSV + opening stock on **dedicated** DB | Ops + client |
| P0-5 | Vercel P0 env mirrored; health green | Ops |
| P0-6 | Deliverables + claims sign-off | Ops + client |

### P1 — recommended

| ID | Item |
|----|------|
| P1-1 | Live WhatsApp proof in automation logs (if COMMS sold) |
| P1-2 | Mobile Lighthouse / storefront UX pass |
| P1-3 | Backup export smoke |
| P1-4 | Offline POS queue — pass or written WAIVE |

### P2 — explicit deferrals (do not block CORE)

- GPU video worker production host  
- Meta/TikTok Ads API auto-publish  
- Stripe online checkout  
- Full Meta Commerce API sync (XML feed is enough for C0 social)  

---

## 5. Physical testing checklist

### Lab day (software)

```powershell
npm run typecheck
npm test
npm run env:validate -- --env-file .env.prod.txt --production
npm run release:gate -- --env-file .env.prod.txt --production --http
```

### Counter day (hardware)

| # | Test | Pass criteria | ☐ |
|---|------|---------------|---|
| 1 | Staff login `/adminpoz` | Hub `/app` | ☐ |
| 2 | Open shift | Shift active | ☐ |
| 3 | Scan SKU | Line &lt; 1s | ☐ |
| 4 | Cash sale | Order #; stock − | ☐ |
| 5 | Print receipt | Header/footer OK | ☐ |
| 6 | Storefront COD (phone) | Order appears for staff | ☐ |
| 7 | Return | Stock restore | ☐ |
| 8 | Close shift | Z-report usable | ☐ |

### Social / creative smoke (if package sold)

| # | Test | ☐ |
|---|------|---|
| 1 | `/social` save Instagram + WhatsApp handles | ☐ |
| 2 | Save Meta pixel; view storefront source | ☐ |
| 3 | `/creative/pdf` generate + download | ☐ |
| 4 | `/creative/ugc-ads` hooks/scripts generate | ☐ |
| 5 | Catalog XML opens | ☐ |
| 6 | Video render only if C1/C2 configured | ☐ |

---

## 6. Per-client config summary

Full matrices: [`VERCEL_ENV.md`](./VERCEL_ENV.md), [`CLIENT_ONBOARDING_CREDENTIALS.md`](./CLIENT_ONBOARDING_CREDENTIALS.md).

| Layer | Minimum |
|-------|---------|
| P0 env | DATABASE_URL (pooler), AUTH_SECRET, APP_URL, STORE_NAME, Supabase trio, MASTER_ENCRYPTION_KEY |
| Staff | OWNER PIN rotated |
| Data | Catalog + opening stock |
| Optional | WhatsApp, pixels, PayHere, CREATIVE_WORKER_URL |

**Wrong project hygiene:** Never paste MyPoz or unrelated Supabase project keys into this app. One client = one DB ref.

---

## 7. Test count note

Unit suite size grows over time. Do **not** hardcode “64/64” in contracts.  
Pass criterion: **`npm test` exit 0** on the release commit being shipped.

---

## 8. Next actions (ordered)

1. Run counter physical checklist on reference or staging.  
2. Fill intake for first real merchant.  
3. Provision dedicated DB + Vercel.  
4. Execute [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) through PRODUCTION_HANDOVER.  
5. Sell SOCIAL/CREATIVE only with explicit C0/C1/C2 tier.
