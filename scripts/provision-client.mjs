#!/usr/bin/env node

/**
 * GRABBER BUSINESS OS — CLIENT PROVISIONING CHECKLIST GENERATOR
 * Produces env + runbook artifacts. Does not call Supabase/Vercel APIs without tokens.
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
const clientDomain = getArg('--domain') || `${clientSlug}.grabberpos.com`;
const authSecret = crypto.randomBytes(48).toString('hex');

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
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_APP_URL="https://${clientDomain}"
NEXT_PUBLIC_STORE_NAME="${clientName}"
AUTH_SECRET="${authSecret}"
NODE_ENV="production"
`;

fs.writeFileSync(path.join(outDir, `.env.${clientSlug}.production`), envContent);

const runbook = `# Provision runbook — ${clientName}

1. Create Supabase project in \`ap-southeast-1\`
2. Apply schema: \`npm run db:bootstrap\` (migrations 0000–0002 + column align)
3. Optional RLS: \`npm run db:bootstrap -- --rls\` then \`npm run db:test-rls\`
4. Copy env from \`.env.${clientSlug}.production\` into Vercel
5. \`npm run env:validate -- --env-file .env.${clientSlug}.production --production\`
6. \`npm run db\` seed: \`curl -X POST "$NEXT_PUBLIC_APP_URL/api/seed" -H "Content-Type: application/json" -d '{"storeName":"${clientName}","slug":"${clientSlug}"}'\`
7. \`npm run client:certify -- --client "${clientName}" --slug "${clientSlug}" --env .env.${clientSlug}.production\`
8. Owner first login → rotate TEMP PIN if seeded with TEMP$
9. Bind domain ${clientDomain} in Vercel + DNS

See full guide: docs/FRESH_START.md
`;

fs.writeFileSync(path.join(outDir, 'RUNBOOK.md'), runbook);

console.log(`[1/3] Schema SSOT: src/db/schema.ts`);
console.log(`[2/3] Wrote ${path.join(outDir, `.env.${clientSlug}.production`)}`);
console.log(`[3/3] Wrote ${path.join(outDir, 'RUNBOOK.md')}`);
console.log(`\nNext: create Supabase + Vercel manually, then run env:validate + client:certify.\n`);
