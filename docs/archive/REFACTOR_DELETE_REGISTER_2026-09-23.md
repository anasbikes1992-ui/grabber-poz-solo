# Refactor Archive/Delete Register — 2026-09-23

This register exists so cleanup does not become accidental feature loss. Archive first, delete only after validation.

## Delete Only After Proof
| Area | Candidate | Replacement / Proof Needed | Status |
| --- | --- | --- | --- |
| Strategy docs | Old tier/pricing docs mentioning Starter/Growth/Enterprise | `docs/COMMERCIAL_MODEL.md` and one-Pro-plan docs updated | Review before archive |
| Old deployment notes | Vercel/Supabase-only client deployment references | Coolify client playbook and launch checklist | Review before archive |
| Generated reports | Temporary audit files under `reports/` | Regenerate from scripts when needed | Safe to delete if generated |
| Legacy route aliases | Duplicate staff paths that redirect to current modules | Route audit + RBAC tests + redirect page | Pending |
| Prototype UI pages | Unlinked proof-of-concept pages | No hub/header links + no tests + owner approval | Pending |
| Stale screenshots/plans | Historical pasted planning artifacts | Current SSOT docs | Safe to archive, not runtime code |

## Do Not Delete
| Area | Reason |
| --- | --- |
| Vertical pack pages | Hidden by flags but part of the Pro platform promise |
| Agent/Jarvis handlers | Needed for READ/DRAFT/approval workflows |
| Public storefront routes | SEO, customer tracking, and product pages depend on them |
| Checkout repository | Authoritative sales, stock, GL, and payment path |
| Order state machine | Shared lifecycle logic across POS, storefront, returns, and invoices |

## Required Cleanup Gate
- `npm run typecheck`
- `node scripts/api-auth-coverage.mjs`
- Route-link audit shows no missing targets.
- RBAC tests pass.
- Manual smoke confirms `/app`, `/pos`, `/products`, `/orders`, `/returns`, `/shop`, and `/store/builder`.
