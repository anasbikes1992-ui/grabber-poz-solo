#!/usr/bin/env node
/**
 * Phase 0/4 ops smoke wrapper — public HTTP + env validate.
 * Does NOT rotate PIN, Meta webhook, or POS UI.
 *
 * Usage:
 *   npm run ops:smoke
 *   CERTIFY_HTTP_BASE_URL=https://grabber-poz-solo.vercel.app npm run ops:smoke
 *   npm run ops:smoke -- --env-file .env.prod.txt
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const envIdx = process.argv.indexOf('--env-file');
const envFile = envIdx !== -1 ? process.argv[envIdx + 1] : null;
const base =
  process.env.CERTIFY_HTTP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://grabber-poz-solo.vercel.app';

function run(label, cmd, args) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CERTIFY_HTTP_BASE_URL: base },
  });
  return r.status === 0;
}

console.log(`\nOPS SMOKE — base ${base}\n`);

let ok = true;

if (envFile) {
  ok = run('env:validate', 'npm', ['run', 'env:validate', '--', '--env-file', envFile, '--production']) && ok;
} else {
  console.log('SKIP  env:validate (pass --env-file for production check)');
}

ok = run('client:certify:http', 'npm', ['run', 'client:certify:http']) && ok;

console.log(`\n── manual still required ──`);
console.log('[ ] Owner PIN rotated');
console.log('[ ] Staff session → /api/integrations/health');
console.log('[ ] Meta WhatsApp webhook + COD automation SUCCESS');
console.log('[ ] POS sale / hold / return / GRN');
console.log('[ ] npm run release:gate -- --env-file .env.prod.txt --production');
console.log('[ ] Apply SQL 0011 + 0012 if not yet on this tenant');

if (!ok) {
  console.log('\nOPS SMOKE: FAIL (see above)\n');
  process.exit(1);
}
console.log('\nOPS SMOKE: PASS (public surface). Complete manual checklist for full Phase 0.\n');
process.exit(0);
