/**
 * Apply drizzle/rls_baseline.sql to the configured database.
 */
import { spawnSync } from 'child_process';

const r = spawnSync('node', ['scripts/apply-sql-migration.mjs', 'drizzle/rls_baseline.sql'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
