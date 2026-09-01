# Grabber Poz Solo

Single-business retail OS: POS, storefront, inventory, finance, and automation.

**Deploy:** [`docs/FRESH_START.md`](docs/FRESH_START.md) · **Vercel env:** [`docs/VERCEL_ENV.md`](docs/VERCEL_ENV.md) · **Phases:** [`docs/NEXT_PHASES.md`](docs/NEXT_PHASES.md)

| | |
|--|--|
| GitHub | [anasbikes1992-ui/grabber-poz-solo](https://github.com/anasbikes1992-ui/grabber-poz-solo) **(canonical — Vercel deploys from here)** |
| Supabase | Project `rbayhrskowtahepwccrq` · migrations in `supabase/migrations/` |
| Vercel | `grabber-poz-solo` → https://grabber-poz-solo.vercel.app |

### Git remotes

Push production changes **only** to `grabber-poz-solo`:

```powershell
git push poz-solo main
# or: npm run push:poz-solo
```

Do **not** push to `origin` (`grabber-business-os`) for this solo deployment — that repo is a legacy/fleet template mirror.

---

## Modules

- **POS** — barcode scan, split pay, shifts, thermal receipts
- **Storefront** — SSR catalog, checkout, CMS blocks, SEO
- **Inventory** — multi-location stock, transfers, GRN
- **Finance** — Polim Potha (AR), reports, ledger
- **Ops** — approvals, automation rules, Jarvis brief, **12 vertical agents**, public repairs

---

## Quick start (local)

```powershell
npm install
copy .env.example .env.local
# Fill DATABASE_URL + AUTH_SECRET — see docs/FRESH_START.md
npm run db:bootstrap
npm run dev
```

```powershell
npm run check          # typecheck + tests + build
npm run env:validate   # pre-flight env check
npm run ops:sync-env   # push .env.local → Vercel (set VERCEL_PROJECT)
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`NEXT_PHASES.md`](docs/NEXT_PHASES.md) | Post-deploy rollout phases |
| [`FRESH_START.md`](docs/FRESH_START.md) | New Supabase + Vercel deploy |
| [`VERCEL_ENV.md`](docs/VERCEL_ENV.md) | Environment variable checklist |
| [`ROADMAP.md`](docs/ROADMAP.md) | Planned features |
| [`RELEASE_GATE.md`](docs/RELEASE_GATE.md) | Release criteria + execution order |
| [`AGENTS.md`](docs/AGENTS.md) | R6 agent catalog (12 agents) |
| [`REPAIRS_STOREFRONT_BLUEPRINT.md`](docs/REPAIRS_STOREFRONT_BLUEPRINT.md) | Repairs + storefront plan |

Legacy audit / GTM docs remain under `docs/` for reference; use **FRESH_START** and **VERCEL_ENV** for current deploys.
