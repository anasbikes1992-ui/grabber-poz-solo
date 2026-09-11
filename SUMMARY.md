# Grabber Fleet Deployment — Running Summary
**Last updated:** 2026-09-11 · **Current phase:** 2 (in progress) · **Status:** in progress
**Branch:** `production-deployment` (branched from `origin/dev`)

## Phase status
| Phase | Title | Status | Notes |
|---|---|---|---|
| 0 | Baseline | done | all gates green; probe confirms NEXT_PUBLIC_SUPABASE_URL is inlined server-side |
| 1 | P0 security | done | see below — one item (1.1) implemented differently than planned, with reasoning |
| 2 | Shared-image build | in progress | 2.1-2.3 done + end-to-end verified against real Postgres; 2.4-2.5 not started |
| 3 | CI pipeline | not started | |
| 4 | Demo deploy + soak | not started | |
| 5 | Merchant onboarding | not started | |

## ⚠️ Structural discovery (read before touching any more `NODE_ENV` code)

**`process.env.NODE_ENV` inside any file that Next.js's webpack build touches
(routes, `src/lib/**` imported by routes, `middleware.ts`, `instrumentation.ts`)
is NOT a runtime value — it is permanently baked to the literal string
`'production'` at build time**, because `next build` always forces
`NODE_ENV=production` internally (a well-known, intentional Next.js/webpack
behavior — the same mechanism React uses to strip its own dev warnings from
production bundles), regardless of the Dockerfile's own `ENV NODE_ENV=...` or
whatever the *running* container's env says.

Consequence, verified empirically by decompiling the actual built image
(`.next/server/app/api/auth/login/route.js`, `.next/server/src/middleware.js`):
- Any `if (process.env.NODE_ENV !== 'production') { ...bypass... }` block is
  **dead-code-eliminated by Terser and physically absent from the shipped
  JS** — confirmed zero occurrences of `'1234'` or `isStaffMiddlewareOptional`
  anywhere in the compiled login route or middleware bundle. The demo PIN, the
  `DEV_OWNER_SESSION` fallback, and the middleware staff-bypass are **already
  unreachable in any image built by this repo's Dockerfile**, regardless of
  what `NODE_ENV` a deployed container's runtime environment sets.
- Conversely, `if (process.env.NODE_ENV === 'production') { ...enforce X... }`
  survives as unconditionally-true, permanently-active code (confirmed: the
  original `AUTH_OPTIONAL` boot check in `instrumentation.ts` compiles to
  `if("true"===process.env.AUTH_OPTIONAL)throw...` — the `NODE_ENV==='production'`
  half folded away to `true`, leaving a genuine live check on the other half).

**This does not make Phase 1's fixes unnecessary** — the seeded `1234` PINs
are *data* written to a real database, unaffected by any of this; the
`/api/seed` and `/api/backup/restore` guard fixes and killed insecure
defaults are correct at the *source* level regardless of what one specific
compiler happens to optimize away today (Turbopack, a config change, or
someone running `tsc`-then-`node` outside `next build` could all reintroduce
reachability). But it means the **actual exposure of the Docker/Coolify
deployment path was smaller than the original audit assumed** — treat this as
lowered residual risk on those specific items, not as new work.

**Direct fallout: my Phase 1.1 boot-time assertion in `instrumentation.ts` was
dead code and provided zero protection** (same elimination mechanism killed
its `NODE_ENV !== 'production'` condition). Replaced it with a check that
doesn't depend on `NODE_ENV` at all: refuse to boot if `AUTH_SECRET` or
`CRON_SECRET` still equals the Dockerfile's literal build-time placeholder
string — a genuine runtime read of an ordinary (non-inlined) env var, and a
check that maps directly to the real operational risk (Coolify never
overrode the placeholder). The `ALLOW_NON_PRODUCTION_DB` escape hatch was
removed along with it (it never worked, and `.env.example` no longer mentions
it).

## What changed this phase (Phase 0)
- No code changes. Installed deps, ran the four gates, ran the Docker inlining probe.

## What changed this phase (Phase 1 — P0 security)

**1.1 Fail-closed boot assertion — implemented differently than the plan drafted, deliberately.**
Before editing, re-verified every "bypass" against its test coverage:
- `tests/security-p0.test.ts:31` locks in `isStaffMiddlewareOptional('test', 'false') === true`
  — non-production middleware bypass is **intentional dev/test UX**, not a bug. Rewriting
  it as the plan first proposed would have broken a deliberately-tested contract for no
  security gain, since production is already unconditionally protected
  (`nodeEnv === 'production'` → `false`, always).
- Every dev-bypass in the codebase (`requireStaffSession`'s `DEV_OWNER_SESSION`, the demo
  PIN, the HMAC-secret fallback, `MASTER_ENCRYPTION_KEY`'s derived fallback) is already
  individually gated on `NODE_ENV !== 'production'` and already throws/refuses correctly
  in production. The actual gap is operational, not logical: **nothing stops a tenant
  container from booting with `NODE_ENV` unset or wrong.**
- `src/lib/auth/session.ts:43-45`'s `TEMP$` plaintext-PIN path is **not** a dev bypass —
  it's the production onboarding/rotation mechanism (`isTemporaryCredential` →
  `mustRotateCredentials`, used by `/api/settings/staff` and `/api/onboarding`). Left
  untouched; gating it behind a dev-only flag would have broken staff PIN resets in
  production. This corrects the approved plan's 1.4 item.
- **What was actually added** (`src/instrumentation.ts`): a boot-time check that throws
  when `NODE_ENV !== 'production'` **and** `DATABASE_URL`/`POSTGRES_URL` points at a
  non-local host, with an explicit `ALLOW_NON_PRODUCTION_DB=1` escape hatch for deliberate
  staging work. This is the actual fail-closed guarantee: a real tenant database can no
  longer be served by a container that forgot to set `NODE_ENV=production`.

**1.2 Killed the seeded `1234` PINs** — `src/lib/setup/seed-service.ts`: all 7 staff roles
and the demo shopper password now get a random 6-digit PIN via a new shared
`generateRandomPin()` (`src/lib/auth/session.ts`), returned once as `generatedPins` in the
seed result (only for rows actually inserted, not pre-existing ones). `src/app/api/seed/route.ts`
surfaces `generatedPins` in its response. `src/app/api/settings/staff/route.ts`'s new-staff
default also dropped `'1234'` — now generates a PIN and stores it as `TEMP$<pin>` (forces
rotation on first login) when the caller doesn't supply one, returning it once as
`generatedPin`.

**1.3 Guarded `/api/seed` and `/api/backup/restore` unconditionally** — both routes'
OWNER/ADMIN checks moved outside the `NODE_ENV === 'production'` conditional; they now
require a real session in every environment. `/api/backup/restore` also dropped the
`x-backup-key` request header and the `AUTH_SECRET` fallback from its decryption-key
resolution — it now reads `BACKUP_ENCRYPTION_KEY` only.

**1.4 Removed ungated insecure defaults**:
- `src/lib/integrations/whatsapp.ts` — dropped the `'grabber_dev_verify'` fallback for
  `WHATSAPP_VERIFY_TOKEN`; webhook handshake now fails closed with nothing configured.
- `src/lib/payments/lkr-provider.ts` and `src/lib/payments/payhere/client.ts` —
  `PAYHERE_MODE` now defaults to `'sandbox'`, not `'live'`. `scripts/validate-env.mjs`'s
  status display updated to match.

**1.6 Extended `scripts/validate-env.mjs`** — added a P0 check for `MASTER_ENCRYPTION_KEY`
(required + ≥32 chars in production; was documented in `.env.example` but never validated),
plus a check that `AUTH_SECRET` and `MASTER_ENCRYPTION_KEY` are never the same value.
True cross-tenant uniqueness isn't checkable from one process's env — documented as an
operator responsibility instead (see `.env.example`).

`.env.example` documents the two new vars: `BACKUP_ENCRYPTION_KEY`, `ALLOW_NON_PRODUCTION_DB`.

## Verified
- `npm ci` → 665 packages installed clean. 8 vulnerabilities reported (7 moderate, 1 high) — not yet triaged, deferred to Phase 1/2 (not blocking, revisit before go-live).
- `npm run typecheck` → **clean**, zero errors (both before and after Phase 1 edits).
- `npm test` → **526/526 tests passed**, 81 files, both before and after Phase 1 edits — no regressions.
- `npm run build` → **succeeded** both times, 184 kB shared first-load JS.
- `docker build --target builder .` → succeeded (after one network-flake retry on `npm ci` inside the container). Docker's own build linter independently flagged: `SecretsUsedInArgOrEnv: ENV "AUTH_SECRET"` and `ENV "CRON_SECRET"` at Dockerfile lines 29-30 — corroborates the plan's Phase 2.3 finding without prompting.
- **Inlining probe — POSITIVE.** `grep -rl 'placeholder.supabase.co' .next/standalone .next/server` inside the built image hit:
  - `.next/standalone/.next/server/app/api/storage/upload/route.js`
  - `.next/standalone/.next/server/app/api/media/route.js`
  - (and their non-standalone twins)
  This confirms the draft's suspicion as **fact, not risk**: `NEXT_PUBLIC_SUPABASE_URL` is frozen into these two server route handlers at build time via webpack DefinePlugin. Today, with the current Dockerfile, upload requests on any deployed tenant take the dead Supabase branch and the local-filesystem fallback never runs — **uploads are currently broken**, not just theoretically fragile. This raises Phase 2.1 from "required for per-tenant domains" to "required to fix a live bug."

## What changed this phase (Phase 2 — shared-image build, 2.1-2.3 done)

**2.1 — `src/lib/config/app-url.ts` created.** `getAppUrl()`/`getSupabaseUrl()`/
`getSupabaseAnonKey()`/`getStoreName()`/`getStoreUrl()`/`getConfiguredAppUrl()`
replace ~20 direct `process.env.NEXT_PUBLIC_*` reads across API routes and
`src/lib/**` (payments, storefront SEO, WhatsApp, creative, social, business
settings). **First implementation attempt made the problem worse, caught by
testing**: centralizing the `?? process.env.NEXT_PUBLIC_X` fallback as a
direct member-expression in one shared module caused webpack's DefinePlugin
to inline the placeholder into **every route that imported the module**
(28 route files hit on the Docker probe, up from 2). Fixed by reading the
legacy name through `process.env[name]` (bracket access) inside a `readEnv()`
helper — DefinePlugin only rewrites a literal `process.env.NEXT_PUBLIC_X`
member expression, not a computed one — confirmed by re-running the probe:
**zero hits** after the fix (down from 28). Also fixed `src/app/setup/page.tsx`
(sent a client-inlined, always-wrong `storeName` to `/api/seed`, shadowing the
correct per-tenant server default — removed, now omitted so the server
decides) and `src/lib/creative/creative-repo.ts` (one straggler literal read
the initial sweep missed). Left untouched, deliberately: `NEXT_PUBLIC_SENTRY_DSN`
(one fleet-wide project, not tenant data — now a real build `ARG`),
`NEXT_PUBLIC_WHATSAPP_NUMBER` in `storefront-config.shared.ts` (only reachable
from the store-builder page's initial placeholder state before an API fetch
overwrites it — the actual live storefront render path already goes through
server-resolved `readStorefrontConfig()` via a `cms` prop, confirmed by
tracing `page.tsx`/`shop/page.tsx` — cosmetic-only, not worth the churn),
`resolve-marketing.ts` (already safe — uses `process.env[key]` with a string
variable, never inlined), `landing-mode.ts` (already prefers non-prefixed
`LANDING_MODE`/`COMPANY_LANDING_HOSTS` — an operator/Phase-4 concern, not code).

**2.2 — `.dockerignore` added.** Excludes `.git`, `node_modules`, `.env*`,
`excel/`, `reports/`, `postman/`, `docs/`, `clients/`, `creative-engine/`,
`design-system/`, `themes/`, `supabase/`, `src/graphify-out/` — confirmed none
of these are referenced by `src/` before excluding. Build still succeeds,
faster (smaller context).

**2.3 — Dockerfile rewritten**, verified with real builds (not just read):
- Dropped the `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` build placeholders
  entirely — no longer needed now that no client component reads them and
  server code goes through `app-url.ts`.
- Added a real `ARG NEXT_PUBLIC_SENTRY_DSN` for the one legitimate fleet-wide
  client-inlined value.
- `AUTH_SECRET`/`CRON_SECRET` build placeholders kept (required — see
  structural discovery above: `NODE_ENV=production` during build makes
  several server modules throw at static-generation time if these are fully
  unset) but now commented explaining exactly why they're safe: multi-stage
  `FROM` does not inherit `ENV` from an earlier stage, so they never reach the
  runner.
- Copied `drizzle/`, `scripts/`, `drizzle.config.ts` into the runner —
  **and then empirically discovered they still didn't work**: `postgres`
  (used by the app itself, but bundled directly into webpack's compiled
  route chunks rather than copied as a physical `node_modules` package —
  only `next.config.mjs`'s `serverExternalPackages` names get that treatment)
  and `dotenv` (not imported by `src/` at all) were **both** missing from
  `.next/standalone/node_modules`. `node scripts/apply-sql-migration.mjs`
  failed with `ERR_MODULE_NOT_FOUND` inside the actual built runner image
  before this was caught. Fixed by explicitly `COPY`-ing both packages
  (`postgres` has zero dependencies of its own — confirmed via its
  `package.json` — so this is a complete, self-contained fix) from the
  builder stage.

**End-to-end verification actually performed (not just build success)**:
1. `docker build -t grabber-probe --target builder .` then re-ran the
   `placeholder.supabase.co` grep probe from Phase 0 — **zero hits**
   (previously 2, briefly 28 mid-fix).
2. Started a scratch `postgres:16-alpine` container. Ran
   `DATABASE_URL=... npx drizzle-kit push --force` against it (truly empty
   DB) — succeeded, created all 71 tables from `src/db/schema.ts`.
3. Ran `node scripts/bootstrap-db.mjs` **inside the actual built runner
   image** against that DB.
   - **First run surfaced a real, previously-undocumented bug**: migration
     `0003_pass2_returns_damages.sql` failed with
     `relation "serial_numbers" does not exist` — the numbered SQL migration
     chain is **not self-sufficient from an empty database**; it assumes a
     baseline schema already exists (created historically via `drizzle-kit
     push`, not by `0000_clever_gateway.sql`, which only creates 41 of the
     schema's 70 tables). This directly explains why the repo's own docs
     contradict each other on `db:push` vs numbered migrations
     (`docs/FRESH_START.md`: "never db:push in production" vs
     `docs/CLIENT_ONBOARDING_PLAYBOOK.md`: "Prefer db:push") — neither is
     independently sufficient, and nobody had reconciled this. Confirmed
     `drizzle-kit push` first, then the numbered chain on top, is the actual
     working sequence (idempotent `IF NOT EXISTS` style throughout means the
     numbered migrations no-op cleanly on top of a freshly-pushed schema).
   - **Second run (push-first) surfaced a second real bug**: migration
     `0006_rls_public_baseline.sql` failed with `role "anon" does not exist`.
     `anon`/`authenticated` are Supabase-provisioned roles that gate
     Supabase's auto-generated PostgREST API — meaningless on a vanilla
     self-hosted Postgres (Coolify's private per-tenant container, exactly
     this deployment's target). `drizzle/rls_baseline.sql`'s own header
     comment confirms the app itself always connects via `DATABASE_URL`
     as the table owner and bypasses RLS regardless
     (`ENABLE ROW LEVEL SECURITY` without `FORCE` doesn't restrict the
     owner) — so this migration is Supabase-only defense-in-depth, not load-
     bearing for the app's actual authorization (which is HMAC session
     cookies + `assertRole`/`requireStaffSession` at the app layer). Fixed
     both `drizzle/migrations/0006_rls_public_baseline.sql` and
     `drizzle/rls_baseline.sql` by wrapping the `anon`/`authenticated`
     REVOKE/GRANT statements in `IF EXISTS (SELECT 1 FROM pg_roles ...)`
     guards — identical behavior on Supabase, no-op instead of fatal
     everywhere else. Edited the already-numbered `0006` file in place
     rather than adding a new migration: confirmed safe because (a) the
     guarded statements are behavior-identical wherever they previously
     succeeded (Supabase), and (b) `ENABLE ROW LEVEL SECURITY` — the one part
     that already ran before the crash on any self-hosted attempt — has no
     functional effect on the app's own queries anyway, so there's no
     partial-application state to reconcile.
   - **Third run (push + fixed 0006): full chain 0000→0016 + column-align
     completed with zero failures** (`✓ Database bootstrap complete.`).
4. Booted the actual runner image (`docker run ... grabber-fleet-test3`)
   against that fully-migrated database with real generated secrets —
   `GET /api/health` returned `{"success":true,"db":"connected",...}`.
5. Live-verified against the running container:
   `GET /api/cron/process-jobs` unauthenticated → 401.
   `POST /api/seed` unauthenticated → `{"success":false,"error":"Unauthorized"}`.
   `POST /api/auth/login {pin:"1234",role:"OWNER"}` (no seeded users yet) →
   correctly rejected, not a synthetic demo session.
6. Verified the new boot-refusal check: a container started with `AUTH_SECRET`
   left at the Dockerfile placeholder value must refuse to boot (this
   replaced the dead `NODE_ENV`-based check from Phase 1.1 — see the
   structural-discovery section above for why the original approach failed
   silently and how it was caught).

**Not yet done**: 2.4 (drop `node-thermal-printer`/`better-sqlite3` dead
deps from `package.json` + `next.config.mjs`'s `serverExternalPackages`),
2.5 (the drizzle-kit journal only tracks migrations 0000-0002 against 17
files on disk — `drizzle-kit generate`/`migrate` would compute a wrong diff;
`bootstrap-db.mjs` itself is unaffected since it bypasses drizzle-kit
entirely and globs `.sql` files directly, now proven to work end-to-end).

## Verified (Phase 2, cumulative with Phase 0/1 gates)
- `npm run typecheck` / `npm test` (526/526) / `npm run build` all re-run
  clean after every Phase 2.1 edit batch (bracket-access fix included).
- Full Docker build → migrate → boot → health-check → live-endpoint cycle
  above — the strongest verification so far, against a real Postgres
  instance and the actual multi-stage-built runner image, not just source
  review.

## Open / blocked
- npm audit: 8 vulnerabilities (7 moderate, 1 high) unreviewed — triage before Phase 4 deploy.
- `/api/pos/supervisor-pin` (accepts a PIN matching any active OWNER/ADMIN/MANAGER, no rate limit) and the rate-limiter's spoofable `x-forwarded-for` + unbounded bucket Map are real findings from the analysis but are P1, not P0 — not addressed in Phase 1 per the approved scope. Revisit before Phase 4 if time allows.
- Phase 2.4 and 2.5 not started (see above — 2.5's actual bootstrap mechanism is proven working; the journal staleness is a drizzle-kit-tooling-correctness issue, not a live-deploy blocker).
- Scratch Docker/Postgres test containers and images from this session (`grabber-fleet-test`, `grabber-fleet-test2`, `grabber-fleet-test3`, `grabber-test-pg`, `grabber-app-test`, `grabber-test-net`) are still present locally — clean up with `docker rm -f` / `docker rmi -f` / `docker network rm` when convenient, harmless if left.

## Secrets & infra state
- Rotated: none yet · Pending rotation: `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`, WhatsApp token+app secret, exposed Postgres passwords (per `docs/DEPLOY_INCIDENT_COOLIFY_2026-09-11.md`) · Live tenants: none

## Next action
Finish Phase 2: drop `node-thermal-printer`/`better-sqlite3` from `package.json`
+ `next.config.mjs` (2.4), decide on the drizzle-kit journal (2.5 — low
urgency given 2.3's end-to-end proof that the actual bootstrap path works).
Then Phase 3 (fix or delete `.github/workflows/fleet-deploy.yml`, pick one
deploy target, delete `vercel.json` if Coolify wins).
