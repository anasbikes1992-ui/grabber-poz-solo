# Grabber Poz Solo

Single-business retail OS: POS, storefront, inventory, finance, and automation.

**Deploy:** [`docs/FRESH_START.md`](docs/FRESH_START.md) · **Vercel env:** [`docs/VERCEL_ENV.md`](docs/VERCEL_ENV.md)

| | |
|--|--|
| GitHub | [anasbikes1992-ui/grabber-poz-solo](https://github.com/anasbikes1992-ui/grabber-poz-solo) |
| Supabase | Project ref in your provision vault / Vercel integration |
| Vercel | `grabber-poz-solo` |

---

## Modules

- **POS** — barcode scan, split pay, shifts, thermal receipts
- **Storefront** — SSR catalog, checkout, CMS blocks, SEO
- **Inventory** — multi-location stock, transfers, GRN
- **Finance** — Polim Potha (AR), reports, ledger
- **Ops** — approvals, automation rules, Jarvis brief, agents

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
| [`FRESH_START.md`](docs/FRESH_START.md) | New Supabase + Vercel deploy |
| [`VERCEL_ENV.md`](docs/VERCEL_ENV.md) | Environment variable checklist |
| [`ROADMAP.md`](docs/ROADMAP.md) | Planned features |
| [`RELEASE_GATE.md`](docs/RELEASE_GATE.md) | Release criteria |

Legacy audit / GTM docs remain under `docs/` for reference; use **FRESH_START** and **VERCEL_ENV** for current deploys.
