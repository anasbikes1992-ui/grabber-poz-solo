# GRABBER BUSINESS OS — FLEET VERSIONING & RELEASE MANAGEMENT

Operational guidelines for managing multiple dedicated client instances from a single upstream template repository without code drift or diverging forks.

---

## 1. Upstream Template Hierarchy

```
                      GRABBER CORE TEMPLATE
                   (anasbikes1992-ui/grabber-business-os)
                                 │
                 ┌───────────────┼───────────────┐
                 ↓ Tag v1.0.0    ↓ Tag v1.0.0    ↓ Tag v1.1.0
             Client Instance A  Client Instance B  Client Instance C
             (Wowthings)        (Shopping Station) (Future Client)
```

---

## 2. Semantic Release Cycle

1. **Development & Hardening:** Features and bug fixes are developed on `main`.
2. **Certification Gate:** `npm run client:certify` → `L4_SCHEMA_SQL_CERTIFIED` (or equivalent) with **0 P0 failures**.
3. **Ready for Re-Testing:** Complete [`docs/READY_FOR_RETESTING.md`](../READY_FOR_RETESTING.md) P0 before tagging a client-facing release.
4. **Release Tagging:**
   * `v1.0.0` — Initial schema/SQL-certified single-business retail release.
   * `v1.0.1` — Patch (hotfix, zero schema changes).
   * `v1.1.0` — Minor (backward-compatible feature + migration scripts).
   * `v2.0.0` — Major (breaking structural schema revisions).

---

## 3. Fleet Client Metadata Matrix

Each client instance tracks its provisioned version in `business_profile`:

```json
{
  "clientName": "Shopping Station",
  "clientSlug": "shoppingstation",
  "appVersion": "v1.0.0",
  "schemaVersion": "41-tables-canonical",
  "certEngineVersion": "v1.0.0",
  "certifiedCommit": "ea2bea3",
  "certifiedAt": "2026-08-30T16:45:00Z",
  "certificationLevel": "L4_PRODUCTION_CERTIFIED"
}
```

---

## 4. Zero-Downtime Fleet Upgrade Protocol

When rolling out an update (`v1.0.0` $\rightarrow$ `v1.0.1`):
1. **Pilot Upgrade:** Deploy update to Pilot Client (`Shopping Station`).
2. **Automated Certification Run:** Execute `npm run client:certify -- --env .env.production`.
3. **Reconciliation Check:** Confirm 0 variance across GL, AR, AP, and Inventory balances.
4. **Fleet Propagation:** Trigger Vercel deploy hooks for remaining client instances.
