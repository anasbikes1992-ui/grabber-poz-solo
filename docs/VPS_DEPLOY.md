# Grabber Business OS — VPS Deploy Playbook (Grabber Managed Cloud)

**Default production host for Grabber Cloud:** a **Linux VPS** (Docker or Node + Postgres), not “one shared multi-tenant SaaS DB.”  
Vercel remains an **optional** deploy target for demos or contracted clients.

**Commercial terms:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)  
**Env checklist:** [`VERCEL_ENV.md`](./VERCEL_ENV.md) (vars are host-agnostic; ignore the filename)  
**Observability:** Sentry — see §7

---

## 1. Target architecture (per client)

```text
                    Internet
                        │
                   HTTPS (443)
                        │
              ┌─────────▼─────────┐
              │  Nginx / Caddy    │  SSL (Let's Encrypt)
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │  Next.js (node)   │  grabber-business-os
              │  PORT=3000        │  pm2 / systemd / docker
              └─────────┬─────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   PostgreSQL      Object storage   Cron
   (dedicated DB   (optional S3/    curl /api/cron/process-jobs
    or schema)      local disk)     + CRON_SECRET
         │
         ▼
   Daily backup → off-VPS object storage
```

**Fleet pattern (recommended):** one VPS can host **multiple isolated clients** (separate Docker Compose projects / separate Postgres databases / separate env files) — still **dedicated DB per business**, standardized ops.

---

## 2. Minimum VPS sizes

| Role | Spec (minimum) | Notes |
|------|----------------|-------|
| **Pilot / Starter** | 2 vCPU, 4 GB RAM, 60 GB SSD | 1–2 small shops |
| **Growth multi-client host** | 4 vCPU, 8–16 GB RAM, 160 GB+ SSD | Several isolated apps |
| **Self-host Enterprise (client)** | 4 vCPU, **16 GB RAM**, SSD | Mandatory AMC |
| **Creative C2 GPU** | Separate GPU host | Not on the web VPS |

OS: **Ubuntu 22.04/24.04 LTS**. Node **20+**. Postgres **15+**.

---

## 3. Provision checklist (one client)

1. Create DNS `A`/`AAAA` → VPS IP (`store.client.lk`).  
2. Create Postgres database + user **per client** (never share DB across paying clients).  
3. Clone/build release on VPS (or pull image).  
4. Place env file: `/etc/grabber/[slug].env` (mode 600).  
5. `npm ci && npm run build && npm start` (or Docker).  
6. Reverse proxy + SSL.  
7. Cron every 1–5 min: `Authorization: Bearer $CRON_SECRET` → `/api/cron/process-jobs`.  
8. Set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (Grabber ops project).  
9. `GET /api/health` → `db: connected`.  
10. Seed / migrate → certify → Ready for Re-Testing.

```powershell
# From laptop against VPS URL
npm run env:validate -- --env-file .env.client-slug --production
$env:CERTIFY_HTTP_BASE_URL="https://store.client.lk"
npm run client:certify -- --client "Name" --slug "slug"
```

---

## 4. Example systemd unit

```ini
[Unit]
Description=Grabber Business OS (%i)
After=network.target postgresql.service

[Service]
Type=simple
User=grabber
WorkingDirectory=/opt/grabber/%i
EnvironmentFile=/etc/grabber/%i.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable: `systemctl enable --now grabber@clientslug`

---

## 5. Example Nginx server block

```nginx
server {
  server_name store.client.lk;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then Certbot / Caddy for TLS.

---

## 6. Environment (VPS)

Same P0 as cloud docs — set on the VPS:

```env
DATABASE_URL=postgresql://grabber_client:SECRET@127.0.0.1:5432/grabber_client
NEXT_PUBLIC_APP_URL=https://store.client.lk
AUTH_SECRET=
MASTER_ENCRYPTION_KEY=
NEXT_PUBLIC_STORE_NAME=
NEXT_PUBLIC_SUPABASE_URL=   # if using Supabase API/storage; else leave blank if pure Postgres
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # optional if not using Supabase APIs
CRON_SECRET=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=grabber@1.0.0
```

If Postgres is **on the same VPS**, use local socket/host URL (not Supabase pooler).  
If DB remains on **Supabase**, keep pooler `:6543` as today.

---

## 7. Sentry (required for Grabber-managed testing & support)

Grabber ops owns the Sentry project. Clients do not need accounts.

| Variable | Where |
|----------|--------|
| `SENTRY_DSN` | Server / edge |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser (same DSN or separate) |
| `SENTRY_ENVIRONMENT` | `production` / `staging` / `client-slug` |
| `SENTRY_RELEASE` | git sha or `grabber@semver` |

**Workflow when testing on VPS:**

1. Reproduce issue on storefront/POS.  
2. Open Sentry → Issues (filter by `SENTRY_ENVIRONMENT`).  
3. Fix → deploy → confirm issue resolves.  
4. Optional: tag `client_slug` in future if multi-tenant host.

Without DSN, the app runs normally (Sentry no-ops).

---

## 8. Backups

| What | Cadence |
|------|---------|
| `pg_dump` per client DB | Daily → off-box object storage |
| Env file encrypted vault | On change |
| Media/uploads disk | Daily sync if local |

Test restore quarterly (Enterprise AMC requirement).

---

## 9. Updates on VPS fleet

```text
1. Build release on CI or bastion
2. Drain / short maintenance window
3. Pull tag → npm ci → build → restart unit
4. Smoke /api/health + login + one POS sale
5. Watch Sentry 30 minutes
```

Do **not** leave 50 unmanaged customer machines on random versions without AMC — that is why Managed Cloud is default.

---

## 10. Self-host handoff (rare)

Deliver: install docs, `.env.example`, backup script, admin training.  
Support only under **paid AMC**. Grabber may refuse debugging without current AMC and hardware compliance.
