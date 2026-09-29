#!/usr/bin/env node
/**
 * Ops smoke wrapper: public HTTP checks plus optional read-only staff checks.
 *
 * This script never writes data. Protected checks run only when
 * CERTIFY_STAFF_COOKIE is supplied from an active owner/admin/manager session.
 *
 * Usage:
 *   npm run ops:smoke
 *   CERTIFY_HTTP_BASE_URL=https://grabberpoz.com npm run ops:smoke
 *   CERTIFY_STAFF_COOKIE="session=..." CERTIFY_HTTP_BASE_URL=https://grabberpoz.com npm run ops:smoke
 *   npm run ops:smoke -- --env-file .env.prod.txt
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const envIdx = process.argv.indexOf('--env-file');
const envFile = envIdx !== -1 ? process.argv[envIdx + 1] : null;
const base = (
  process.env.CERTIFY_HTTP_BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://grabberpoz.com'
).replace(/\/$/, '');
const staffCookie = process.env.CERTIFY_STAFF_COOKIE || '';

const readOnlyChecks = [
  {
    name: 'ops-health',
    path: '/api/ops/health',
    validate: (json) => json.success === true && typeof json.deadJobs === 'number' && json.providers,
  },
  {
    name: 'provider-health',
    path: '/api/integrations/health',
    validate: (json) => json.success === true && Array.isArray(json.services) && json.summary,
  },
  {
    name: 'bank-reconciliation',
    path: '/api/accounts/bank',
    validate: (json) => json.success === true && Array.isArray(json.accounts) && Array.isArray(json.reconciliations),
  },
  {
    name: 'erp-control',
    path: '/api/erp/control',
    validate: (json) =>
      json.success === true &&
      Array.isArray(json.approvalEvents) &&
      Array.isArray(json.supplierScores) &&
      Array.isArray(json.varianceAlerts) &&
      Array.isArray(json.forecastAccuracy),
  },
  {
    name: 'handover-readiness',
    path: '/api/company/admin/handover',
    validate: (json) => json.success === true && json.summary && Array.isArray(json.handovers),
  },
  {
    name: 'client-register',
    path: '/api/company/admin/clients',
    validate: (json) => json.success === true && Array.isArray(json.clients),
  },
];

function run(label, cmd, args) {
  console.log(`\n-- ${label} --`);
  let executable = cmd;
  let finalArgs = args;
  if (cmd === 'npm' && process.env.npm_execpath) {
    executable = process.execPath;
    finalArgs = [process.env.npm_execpath, ...args];
  } else if (process.platform === 'win32' && cmd === 'npm') {
    executable = 'cmd.exe';
    finalArgs = ['/d', '/s', '/c', 'npm', ...args];
  }
  const result = spawnSync(executable, finalArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, CERTIFY_HTTP_BASE_URL: base },
  });
  if (result.error) {
    console.error(`${label} failed to start: ${result.error.message}`);
  }
  return result.status === 0;
}

async function runReadOnlyChecks() {
  console.log('\n-- live read-only staff checks --');
  if (!staffCookie) {
    console.log('SKIP  protected checks (set CERTIFY_STAFF_COOKIE from an active staff session)');
    for (const check of readOnlyChecks) {
      console.log(`SKIP  ${check.name.padEnd(22)} ${base}${check.path}`);
    }
    return true;
  }

  let failed = 0;
  for (const check of readOnlyChecks) {
    const url = `${base}${check.path}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Cookie: staffCookie,
          Accept: 'application/json',
          'User-Agent': 'grabber-ops-smoke/1.0',
        },
      });
      const json = await res.json().catch(() => null);
      const ok = res.ok && json && check.validate(json);
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name.padEnd(22)} ${res.status} ${url}`);
      if (!ok) failed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAIL  ${check.name.padEnd(22)} ERR ${url} - ${message}`);
      failed += 1;
    }
  }

  return failed === 0;
}

async function main() {
  console.log(`\nOPS SMOKE - base ${base}\n`);

  let ok = true;
  if (envFile) {
    ok = run('env:validate', 'npm', ['run', 'env:validate', '--', '--env-file', envFile, '--production']) && ok;
  } else {
    console.log('SKIP  env:validate (pass --env-file for production check)');
  }

  ok = run('client:certify:http', 'npm', ['run', 'client:certify:http']) && ok;
  ok = (await runReadOnlyChecks()) && ok;

  console.log('\n-- manual still required --');
  console.log('[ ] Owner PIN rotated');
  console.log('[ ] POS sale / hold / return / GRN');
  console.log('[ ] Storefront COD checkout and receipt');
  console.log('[ ] WhatsApp webhook/provider live-send proof when credentials are real');
  console.log('[ ] Backup export and restore rehearsal');

  if (!ok) {
    console.log('\nOPS SMOKE: FAIL (see above)\n');
    process.exit(1);
  }
  console.log('\nOPS SMOKE: PASS (read-only gates clean; complete manual checklist for full handover).\n');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`OPS SMOKE: FAIL - ${message}`);
  process.exit(1);
});
