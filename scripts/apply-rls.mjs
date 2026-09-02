/**
 * Apply drizzle/rls_baseline.sql to the configured database.
 * Usage: node scripts/apply-rls.mjs [--env-file=.env.prod.txt]
 */
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';

const envArg = process.argv.find((a) => a.startsWith('--env-file='));
if (envArg) {
  loadEnv({ path: envArg.split('=')[1] });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const r = spawnSync('node', ['scripts/apply-sql-migration.mjs', 'drizzle/rls_baseline.sql'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});
process.exit(r.status ?? 1);
