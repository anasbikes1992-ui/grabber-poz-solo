/**
 * Bootstrap a Grabber Business OS database from numbered migrations.
 *
 * Flow: migrations → column align → optional RLS → optional certify
 *
 * Usage:
 *   node scripts/bootstrap-db.mjs
 *   node scripts/bootstrap-db.mjs --rls
 *   node scripts/bootstrap-db.mjs --certify
 */
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = new Set(process.argv.slice(2));
const url = process.env.DATABASE_URL || process.env.database_url;

if (!url) {
  console.error('DATABASE_URL missing — set in .env.local');
  process.exit(1);
}

function run(label, cmd, cmdArgs = []) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`✗ Failed: ${label}`);
    process.exit(r.status ?? 1);
  }
}

const migrations = [
  'drizzle/migrations/0000_clever_gateway.sql',
  'drizzle/migrations/0001_business_os_align.sql',
  'drizzle/migrations/0002_legacy_column_canonicalization.sql',
];

for (const file of migrations) {
  run(`Apply ${file}`, 'node', ['scripts/apply-sql-migration.mjs', file]);
}

run('Align missing columns', 'node', ['scripts/align-missing-columns.mjs']);

if (args.has('--rls')) {
  run('Apply RLS baseline', 'node', ['scripts/apply-sql-migration.mjs', 'drizzle/rls_baseline.sql']);
}

if (args.has('--certify')) {
  run('Client certification', 'npm', ['run', 'client:certify']);
}

console.log('\n✓ Database bootstrap complete.');
console.log('Next: POST /api/seed (dev) or owner-authenticated seed in production.');
