# M7 — Client Onboarding Plan

**Status:** 🟠 IN PROGRESS (S1 shell)  
**Depends on:** M2 Security 🟢 · M3 Commerce 🟢 · M6 Installation Identity 🟢  
**Goal:** Fresh install → owner completes an interactive wizard → store is sellable without engineering help.

Not in M7: catalog Excel import (later), UI redesign, multi-tenant, checkout rewrite.

---

## Problem

Today `/setup` was a **milestone checklist** (seed / preset / links). Ops still relies on CLI playbooks and manual PIN rotation. M7 turns that into a **productized owner wizard** for a single-business install.

---

## Target flow (11 steps — full plan)

```text
1. Welcome + installation identity (read M6 license/install id)
2. Business profile (name, vertical preset, currency LKR)
3. Owner account (create / rotate off TEMP$ PIN)
4. Branch + register bootstrap
5. Tax profile confirm (STANDARD_VAT from seed — editable rate)
6. Chart of accounts confirm (ensureDefaultChartOfAccounts)
7. Catalog kickstart (seed preset OR skip to import)
8. Payments (COD on; optional PayHere/WebXPay keys)
9. Storefront basics (theme + contact / WhatsApp number)
10. Integrations optional (WhatsApp, courier) — skippable
11. Certification gate (env:validate summary + auth:coverage + smoke links)
```

Exit: `onboardingCompletedAt` set · owner can open `/pos` and `/shop` · release smoke checklist green.

---

## Bounded first slice — M7-S1 · **DONE 2026-09-18**

**Wizard shell + progress SSOT**

1. `/api/setup/progress` returns `wizardSteps` + `currentStepId` via `buildWizardSteps` (wraps existing milestones; **no gate bypass**).
2. `/setup` shows Owner wizard rail; milestone list retained.
3. Complete still blocked until: DB connected, seeded, OWNER PIN not `TEMP$`, profile, branch (`goLiveReady` unchanged).
4. Tests: `tests/onboarding-wizard.test.ts`.

**Out of S1:** payment key forms, WhatsApp OAuth, Excel import, in-wizard PIN rotate UI.

---

## Later slices

| Slice | Focus | Status |
|-------|--------|--------|
| M7-S1 | Wizard shell + progress SSOT | **DONE** |
| M7-S2 | Owner credential rotation inside wizard | **NEXT** |
| M7-S3 | Tax + COA confirmation screens | TODO |
| M7-S4 | Payments + storefront contact | TODO |
| M7-S5 | In-app certification panel | TODO |
| M7-S6 | Docs + `release:gate-m7` | TODO |

---

## Evidence

- `/setup` + `/api/setup/progress` (+ `wizardSteps`)
- Seed + vertical presets · M6 installation identity
- `docs/CLIENT_ONBOARDING_PLAYBOOK.md` · `docs/ERP_GAPS_AND_NEXT_WAVE.md`

---

## Done when

```text
Fresh install → /setup wizard without CLI → /pos + /shop COD → release:gate-m7 PASS
```
