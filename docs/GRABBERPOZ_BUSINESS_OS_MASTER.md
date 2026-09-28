# GRABBER BUSINESS OS PRO — MASTER REFERENCE
**GrabberPOZ.com | Single-Tenant Commerce & Operations Platform**
_Last updated: 2026-09-28 | Branch: main | Tests: 629/629_

---

## 1. WHAT THIS IS

**Grabber Business OS Pro** is a single-business, standalone POS + storefront + lightweight ERP engineered for dedicated deployments on Sri Lankan SME commerce.

**One product. One price tier. Vertical packs configure the client business. They are not feature tiers.**

### Core surfaces
| Surface | URL | Who uses it |
|---------|-----|-------------|
| Company landing (grabberpoz.com) | `/` | Prospects/leads |
| Staff portal | `/adminpoz` -> `/app` | Owner, Manager, Staff |
| Point of Sale | `/pos` | Cashier/Staff |
| Online storefront | `/shop` | End customers |
| Inventory/ERP | `/products`, `/inventory`, etc. | Owner/Manager |
| Jarvis AI | Drawer (Ctrl+J) | Owner/Manager |

---

## 2. ARCHITECTURE DECISIONS -- LOCKED

### 2.1 Single Tenant, Single DB -- FINAL DECISION

**One app instance = one Postgres database. No exceptions.**

- `grabberpoz.com` -> POZ company app -> POZ company Postgres DB
- `ThePartyStore` Coolify app -> ThePartyStore Postgres DB (isolated)
- Each new client gets a fresh Coolify app + fresh Postgres DB
- **Never share databases between clients**
- **Never point two apps at the same DB**

Enforced in:
- `docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`
- `docs/SYSTEM_SSOT_AND_ROBUSTNESS.md`
- Onboarding: `npm run db:bootstrap`

### 2.2 Commerce Engine -- LOCKED

Do NOT refactor:
- `src/lib/commerce/pos-checkout-service.ts`
- `src/lib/db/repositories/checkout-repo.ts`
- `src/lib/commerce/inventory-engine.ts`
- `src/db/schema.ts`

### 2.3 Auth -- LOCKED

- Staff: JWT via `AUTH_SECRET`, edge session via `session-edge.ts`
- Customer: phone+token, `shopper_session` cookie (separate)
- `AUTH_OPTIONAL=true` FORBIDDEN in production (P0 gate)

---

## 3. WHAT IS LIVE

### Commerce Core
- POS checkout (cash, card, credit, COD, split tender)
- Stock ledger (multi-location, barcode, GRN, transfers)
- Customer credit / Polim Potha
- Orders with invoices, lifecycle, channel filters
- Returns, damages, trade-in
- Loyalty points
- Purchasing / GRN with invariants
- Shifts with cash reconciliation invariants

### Storefront
- Product catalog, variants, gallery, SEO
- Cart, checkout (COD, PayHere, WebXPay)
- Customer account, order tracking
- Wishlist, reviews, promotions
- Layout templates (6) + theme presets (vibe, ocean, atelier-gold, party, etc.)
- Category sitemap

### Company Platform (GrabberPOZ.com)
- Marketing landing page with lead capture form
- Leads saved to `company_leads` DB table (migration 0022)
- Legacy JSON backup kept as fallback
- Company dashboard at `/company`
- Admin CRM at `/company/leads` (search, filter, edit, archive, status pipeline)
- Company settings at `/company/settings` (profile, tax, receipt, logo URL)
- SuperAdmin command center at `/company/admin` (Owner/Admin entry point for company CRUD areas)
- Company roadmap at `/company/roadmap` (CEO/CTO milestones, SOP links, acceptance checks)
- Client provisioning register at `/company/clients` (isolated app/DB readiness and handover checklist)
- Company audit trail at `/company/audit` (read-only action history from `audit_logs`)
- RBAC-protected: Owner/Admin/Manager/Marketing by route and action
- Lead statuses: NEW -> CONTACTED -> DEMO_SCHEDULED -> PROPOSAL_SENT -> WON/LOST/ARCHIVED

### Jarvis / AI
- Approval-first agent actions (25 red-team attacks verified)
- DB-grounded tools, role-gated execution

### Vertical Packs
- general-retail, fashion, jewelry/watches, electronics, grocery, repairs, restaurant, pharmacy, party
- Activated via `business_config.verticalPacks[]`

---

## 4. DOs AND DON'Ts

### DO
- One DB per client. Always.
- Run `npm run db:bootstrap` after each deploy.
- Run `npm test` before every push (pre-push hook).
- Lock commerce invariants (checkout-repo, inventory-engine).
- Use `business_config` for vertical flags.
- Store secrets in Coolify env vars only.
- Use theming via `storefront-config.ts` layout templates.
- Apply RBAC via `isRouteAllowedForRole()`.

### DON'T
- Don't create multi-tenant shared DB.
- Don't set `AUTH_OPTIONAL=true` in production.
- Don't import from `checkout-repo` directly in pages.
- Don't modify `schema.ts` without a matching Drizzle migration.
- Don't hardcode pixel values or colors in JSX.
- Don't run `db:migrate` on live DB without backup.
- Don't add payment methods without invariant tests.
- Don't add API routes without classifying in auth coverage.

---

## 5. DEPLOYMENT MODEL

```
grabber-poz-solo (GitHub main) -> CI (fleet-deploy.yml)
  -> TypeCheck + 629 tests + Docker build
  -> GHCR: ghcr.io/anasbikes1992-ui/grabber-poz-solo:sha-<hash> + :main
  -> Coolify: grabberpoz.com app   (redeploy from main)
  -> Coolify: thepartystore app    (promote same image)
```

### Required Env Vars (P0)
```
DATABASE_URL=          # Dedicated Postgres per app
AUTH_SECRET=           # 32+ char random string
CRON_SECRET=           # For /api/cron/process-jobs
MASTER_ENCRYPTION_KEY= # For encrypted backup exports
NEXT_PUBLIC_APP_URL=   # Full domain URL
```

### After Each Deploy
```bash
npm run db:bootstrap   # Apply all pending migrations (including 0022_company_leads)
POST /api/seed         # If fresh install: { demo: false }
GET /api/health        # Verify
GET /api/ops/health    # Verify integrations
```

---

## 6. CUSTOMER ONBOARDING PLAYBOOK

### Pre-Sales (Lead Flow)
1. Prospect submits form at grabberpoz.com
2. Lead saved to `company_leads` table
3. Staff reviews at `/company/leads` -> set CONTACTED
4. Book demo -> DEMO_SCHEDULED
5. Send proposal -> PROPOSAL_SENT
6. Won -> provision new client

### Provisioning New Client
```bash
# 1. Create Coolify app for client
# 2. Create dedicated Postgres DB in Coolify
# 3. Set P0 env vars (DATABASE_URL, AUTH_SECRET, CRON_SECRET, MASTER_ENCRYPTION_KEY, NEXT_PUBLIC_APP_URL)
# 4. Deploy from main
# 5. Post-deploy:
npm run db:bootstrap
POST /api/seed { demo: false }
# 6. Set vertical pack
PATCH /api/settings/business { verticalPacks: ['fashion'] }
# Jewelry/watch clients select the Jewelry & Watches preset in Settings, which maps to:
# verticalPreset='jewelry', storefront preset='atelier-gold', layoutTemplate='jewelry'
# 7. Set staff
POST /api/settings/staff { name: 'Owner Name', role: 'OWNER', pin: 'xxxx' }
```

### Certify & Handover
```bash
npm run client:certify        # auth + route coverage
npm run release:gate-r1       # R1 automated gate
```

### Client Training Checklist
- [ ] Owner changes PIN at /settings
- [ ] First product added
- [ ] First POS sale
- [ ] First shift opened and closed
- [ ] Storefront URL confirmed
- [ ] Payment gateway tested (if enabled)
- [ ] Staff accounts set up
- [ ] Backup confirmed

---

## 7. UI/UX STANDARDS

### Design System
- Font: Plus Jakarta Sans (staff), Inter (storefront)
- Staff primary: Emerald #10b981
- Company landing primary: Amber #f59e0b / Orange #f97316
- Staff UI: dark-first (zinc-950 bg, zinc-800 cards)
- Company landing: slate-950 bg, amber/orange accents

### Touch & Responsive
- All interactive elements: min 44x44px
- Mobile body text: minimum 16px
- No horizontal scroll at 375px
- Breakpoints tested: 375px, 768px, 1024px, 1440px

### Tokens (CSS vars)
```css
--background, --foreground, --card, --border
--primary: 160 84% 39%  (emerald)
--radius: 0.75rem
--font-plus-jakarta
```

### No Hardcoding
- Colors: use Tailwind tokens (bg-emerald-500), never #hex in JSX
- Spacing: Tailwind scale only, no inline style margins
- Font sizes: Tailwind text scale only

### Accessibility
- focus-visible rings on all interactive elements
- aria-label on icon-only buttons
- Skip-to-main link in AppShell
- Form inputs have label elements
- Color is never sole indicator

---

## 8. TEST SUITE (629/629)

| Suite | Tests |
|-------|-------|
| Red Team ATTACK-001-025 | 25 |
| Commerce certification | 34 |
| Security P0 | 12 |
| Security HTTP auth (zero UNCLASSIFIED) | 14 |
| GRN invariants | 4 |
| Shift reconciliation invariants | 3 |
| Transfer workflow invariants | 3 |
| Checkout identity invariants | 2 |
| Returns / order lines | 7 |
| Vertical packs | 5+6 |
| All others | ~514 |
| **Total** | **629** |

---

## 9. ROADMAP

### Immediate (Deploy now)
- [x] Trigger Coolify redeploy from main (latest commit)
- [x] Apply `company_leads` migration on POZ company DB
- [x] Smoke: lead form -> /company/leads -> verify saved
- [x] Smoke: /company, /company/settings, /company/admin after redeploy
- [ ] Smoke: /company/roadmap after next deploy
- [ ] Smoke: /adminpoz login -> POS sale -> report
- [ ] Smoke: /shop -> checkout COD

### Phase 0 -- Company Admin Completion
- [x] Company lead CRM with status pipeline
- [x] Company profile/logo settings route
- [x] SuperAdmin command center over existing CRUD surfaces
- [x] In-app CEO/CTO roadmap route
- [x] Client provisioning register with default handover checklist
- [x] Company admin audit trail view
- [ ] Deployment register after Coolify API/token approval
- [x] Jewelry & Watches vertical preset, storefront preset, and intelligence pack

### Phase 1 -- Inventory Demand Planning
- [ ] Read-only planner from sales, stock, purchasing, and supplier data
- [ ] ABC/XYZ SKU classification
- [ ] Safety stock and reorder point recommendations
- [ ] Suggested PO review queue
- [ ] Forecast accuracy reporting using WMAPE and bias

### Phase A -- Catalog Workspace
- [ ] Guided product creation wizard
- [ ] Bulk image upload with auto-assign
- [ ] Import rollback batches
- [ ] Category hierarchy UI

### Phase B -- Mobile/Tablet Admin
- [ ] Orders card view on mobile
- [ ] POS full-screen tablet mode
- [ ] PWA install prompt
- [ ] 375px smoke pass for all 20 main staff pages

### Phase C -- ERP Completion
- [ ] Purchase order approval workflow (PO/GRN/AP tables exist; approval gate remains)
- [ ] Cost price variance alerts (stock and transfer variance exist; supplier cost alerting remains)
- [ ] Multi-currency display
- [ ] Payroll final export

### Phase D -- Platform Growth
- [ ] Client self-onboarding wizard
- [ ] Partner/reseller portal
- [ ] API key management

---

## 10. KNOWN PENDING OPS

| Item | Status | Action |
|------|--------|--------|
| company_leads table | Applied on POZ Supabase | Keep ThePartyStore DB untouched |
| Coolify redeploy | Pending | Trigger in Coolify from latest main |
| 0013_drop_legacy_triggers.sql | Pending (.pending) | Apply manually after verifying |
| Sentry DSN | Optional | Add NEXT_PUBLIC_SENTRY_DSN in Coolify |
| Party Store catalog import approval | Backlog | Phase A |

---

## 11. KEY FILE REFERENCES

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Canonical DB schema SSOT |
| `src/lib/commerce/pos-checkout-service.ts` | POS checkout engine |
| `src/lib/db/repositories/checkout-repo.ts` | Stock+payment mutations |
| `src/middleware.ts` | Edge auth, RBAC, rate limits |
| `src/components/company/CompanyLanding.tsx` | Company marketing page |
| `src/app/company/leads/page.tsx` | Admin lead CRM |
| `src/app/company/clients/page.tsx` | Client provisioning register |
| `src/app/company/roadmap/page.tsx` | Company admin roadmap |
| `drizzle/migrations/0023_company_client_provisioning.sql` | Client provisioning tables |
| `src/components/ui/app-header.tsx` | Staff nav (all nav groups) |
| `drizzle/migrations/0022_company_leads.sql` | Latest migration |
| `docs/SYSTEM_SSOT_AND_ROBUSTNESS.md` | Technical SSOT |
| `docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md` | Provisioning guide |
| `goaldoc.md` | Long-form milestone doc |
