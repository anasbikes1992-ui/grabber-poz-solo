#!/usr/bin/env node

/**
 * GRABBER BUSINESS OS — CLIENT PROVISIONING CHECKLIST GENERATOR
 * Produces env + runbook artifacts for a Coolify-hosted tenant. Does not call
 * the Coolify API — see docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md for the
 * manual steps this runbook assumes.
 *
 * Usage:
 *   node scripts/provision-client.mjs --client "Urban Trendz" --slug "urban-trendz" --domain "urbantrendz.lk"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};

const clientName = getArg('--client') || 'Demo Client Retail';
const clientSlug = (getArg('--slug') || `client-${Date.now().toString().slice(-4)}`)
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-');
const clientDomain = getArg('--domain') || `${clientSlug}.grabberpoz.com`;
const authSecret = crypto.randomBytes(48).toString('hex');
const masterEncryptionKey = crypto.randomBytes(32).toString('hex');
const cronSecret = crypto.randomBytes(24).toString('hex');

console.log(`\n======================================================`);
console.log(`GRABBER BUSINESS OS: PROVISIONING PACKET`);
console.log(`======================================================`);
console.log(`Client Name:     ${clientName}`);
console.log(`Client Slug:     ${clientSlug}`);
console.log(`Target Domain:   https://${clientDomain}`);
console.log(`======================================================\n`);

const outDir = path.resolve('reports', `provision_${clientSlug}`);
fs.mkdirSync(outDir, { recursive: true });

const envContent = `# Generated ${new Date().toISOString()} — DO NOT COMMIT
# Paste these into the Coolify app's runtime env (not build env — build env
# is visible in build logs, see docs/DEPLOY_INCIDENT_COOLIFY_2026-09-11.md).
# DATABASE_URL points at this tenant's own private Postgres container on the
# Coolify-internal Docker network — never publish Postgres to the host.
DATABASE_URL="postgresql://postgres:[PASSWORD]@grabber-db-${clientSlug}:5432/grabber_${clientSlug.replace(/-/g, '_')}"
APP_URL="https://${clientDomain}"
STORE_NAME="${clientName}"
AUTH_SECRET="${authSecret}"
MASTER_ENCRYPTION_KEY="${masterEncryptionKey}"
CRON_SECRET="${cronSecret}"
LANDING_MODE="storefront"
NODE_ENV="production"
`;

fs.writeFileSync(path.join(outDir, `.env.${clientSlug}.production`), envContent);

const runbook = `# Provision runbook — ${clientName}

1. In Coolify: create a private Postgres resource \`grabber-db-${clientSlug}\`
   (not published to the host) and an Application from the repo Dockerfile,
   both on the same Coolify project/network.
2. Paste \`.env.${clientSlug}.production\` into the Application's **runtime**
   env (not build env — see the warning in that file).
3. Deploy the app once so the container exists, then run inside it:
   \`node scripts/bootstrap-db.mjs\` — applies all numbered migrations
   (currently 0000 → 0016) + column alignment. The database must already
   have the full schema from \`src/db/schema.ts\` (\`npx drizzle-kit push\`
   against it first) before the numbered migrations will apply cleanly —
   several early migrations assume that baseline exists rather than
   creating it themselves.
4. Optional RLS (only meaningful if this tenant's DB is Supabase-hosted, not
   the Coolify default): \`node scripts/bootstrap-db.mjs -- --rls\` then
   \`npm run db:test-rls\`.
5. \`npm run env:validate -- --env-file .env.${clientSlug}.production --production\`
6. In Coolify, add domain \`${clientDomain}\`, enable Let's Encrypt, and add
   the merchant's own custom domain alongside it if they have one.
7. Seed (staff session required — \`/api/seed\` is never open, in any
   environment): log in as the seeded OWNER via \`/adminpoz\`, or from a
   script carrying that session's cookie, then
   \`POST https://${clientDomain}/api/seed {"storeName":"${clientName}","slug":"${clientSlug}"}\`.
   The response's \`generatedPins\` field has each staff role's PIN — hand
   these to the owner once; they are not shown again and are not \`1234\`.
8. \`npm run client:certify -- --client "${clientName}" --slug "${clientSlug}" --env .env.${clientSlug}.production\`
9. \`CERTIFY_HTTP_BASE_URL=https://${clientDomain} npm run ops:smoke\`
10. Add a host crontab entry hitting
    \`https://${clientDomain}/api/cron/process-jobs\` with the
    \`CRON_SECRET\` bearer token every 1-2 minutes — nothing else triggers
    the job queue (WhatsApp sends, webhook retries, stock automations).
11. Add a nightly \`pg_dump\` backup for \`grabber-db-${clientSlug}\`.
12. Phase 0 checklist: docs/FULL_PROOF_PLAN.md §5 (WhatsApp, POS smoke, release:gate)

See: docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md · docs/PROVISION_NEXT_CLIENT.md
`;

fs.writeFileSync(path.join(outDir, 'RUNBOOK.md'), runbook);

console.log(`[1/3] Schema SSOT: src/db/schema.ts`);
console.log(`[2/3] Wrote ${path.join(outDir, `.env.${clientSlug}.production`)}`);
console.log(`[3/3] Wrote ${path.join(outDir, 'RUNBOOK.md')}`);
console.log(`\nNext: create the Coolify Postgres + app resources, then run env:validate + client:certify.\n`);
