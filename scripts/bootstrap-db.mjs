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
import { hasDatabaseUrl, resolveDirectDatabaseUrl } from './lib/resolve-db-url.mjs';

const envFileIdx = process.argv.indexOf('--env-file');
if (envFileIdx !== -1 && process.argv[envFileIdx + 1]) {
  loadEnv({ path: process.argv[envFileIdx + 1], override: true });
}
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--env-file')));

if (!hasDatabaseUrl()) {
  console.error('Database URL missing — set DATABASE_URL or POSTGRES_URL in .env.local');
  process.exit(1);
}

const directUrl = resolveDirectDatabaseUrl();
if (!directUrl) {
  console.error('Could not resolve a Postgres URL for migrations.');
  process.exit(1);
}
process.env.DATABASE_URL = directUrl;
console.log(`Using direct connection: ${new URL(directUrl.replace(/^postgresql:\/\//, 'https://')).hostname}`);

function run(label, cmd, cmdArgs = []) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
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
  run('Verify RLS policies', 'npm', ['run', 'db:test-rls']);
}

if (args.has('--certify')) {
  run('Client certification', 'npm', ['run', 'client:certify']);
}

console.log('\n✓ Database bootstrap complete.');
console.log('Next: POST /api/seed (dev) or owner-authenticated seed in production.');
