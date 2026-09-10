# Production readiness — Contabo Coolify + Solo

**Updated:** 2026-09-11  
**Code:** main must include `kitchenTickets` import on `/api/restaurant/menu` POST.

## Green when all true

| Gate | Check |
|------|-------|
| Build | `npm run build` exit 0 (Coolify Docker builder too) |
| Schema | SQL **0011, 0012, 0014, 0015** on tenant DB |
| Health | `GET /api/health` → `db: connected` |
| Public | `/shop`, `/shop/menu`, `/shop/appointments/book` |
| Staff | `/adminpoz` → POS sale + restaurant KOT |
| Secrets | Runtime-only in Coolify; rotated after any log leak |
| Smoke | `npm run ops:smoke` against Coolify URL |

## Blockers closed this incident

- Missing `kitchenTickets` import (Coolify typecheck fail)
- POS loyalty rename compile break (`loyaltyQuery`)
- Docs clutter → [`archive/`](./archive/README.md)
- Coolify secret-via-ARG guidance → playbook + incident note

## Still ops (not eng)

Owner PIN · WhatsApp Meta verify · COD automation proof · `release:gate` on that host · Lighthouse optional.

**Incident detail:** [`DEPLOY_INCIDENT_COOLIFY_2026-09-11.md`](./DEPLOY_INCIDENT_COOLIFY_2026-09-11.md)
