/**
 * Apply MobileRepair shop profile on production or local DB.
 * Usage: node scripts/setup-mobilerepair.mjs [--env-file=.env.prod.txt]
 */
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';

const envArg = process.argv.find((a) => a.startsWith('--env-file='));
if (envArg) {
  loadEnv({ path: envArg.split('=')[1], override: true });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const extraArgs = process.argv.slice(2).filter((a) => a.startsWith('--'));

const r = spawnSync('npx', ['--yes', 'tsx', 'scripts/run-mobilerepair-setup.ts', ...extraArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

process.exit(r.status ?? 1);
