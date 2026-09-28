#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { scanApiAuthCoverage } from './api-auth-coverage.mjs';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.next', 'node_modules', 'coverage', 'graphify-out', 'references', 'unpacked_docs']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.sql', '.yml', '.yaml', '.env', '.example']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(path.extname(ent.name)) || ent.name.startsWith('.env')) out.push(full);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function pass(name, detail = '') {
  return { ok: true, level: 'PASS', name, detail };
}

function fail(name, detail) {
  return { ok: false, level: 'FAIL', name, detail };
}

function warn(name, detail) {
  return { ok: true, level: 'WARN', name, detail };
}

function checkRateLimitConfig() {
  const src = read('src/lib/security/rate-limit.ts');
  const required = [
    'RATE_LIMIT_AUTH_IP_LIMIT',
    'RATE_LIMIT_AUTH_ACCOUNT_LIMIT',
    'RATE_LIMIT_PUBLIC_LEADS_LIMIT',
    'RATE_LIMIT_CHECKOUT_LIMIT',
    'authBackoffSeconds',
  ];
  const missing = required.filter((needle) => !src.includes(needle));
  return missing.length ? fail('rate-limit-config', `Missing ${missing.join(', ')}`) : pass('rate-limit-config');
}

function checkUploadValidation() {
  const src = read('src/lib/security/upload-validation.ts');
  const uploadRoute = read('src/app/api/storage/upload/route.ts') + read('src/app/api/media/route.ts');
  const required = ['signatures', 'file.size > maxBytes', 'Only JPG, PNG, WEBP, or GIF'];
  const missing = required.filter((needle) => !src.includes(needle));
  if (!uploadRoute.includes('validateUploadFile')) missing.push('validateUploadFile route usage');
  return missing.length ? fail('upload-validation', `Missing ${missing.join(', ')}`) : pass('upload-validation');
}

function checkAuthCoverage() {
  const result = scanApiAuthCoverage();
  return result.unclassified.length
    ? fail('api-auth-coverage', `${result.unclassified.length} unclassified routes`)
    : pass('api-auth-coverage', `${result.total} routes classified`);
}

function checkSourceMaps() {
  const nextConfig = fs.existsSync(path.join(ROOT, 'next.config.js')) ? read('next.config.js') : '';
  const risky = /productionBrowserSourceMaps\s*:\s*true/.test(nextConfig);
  return risky ? fail('source-maps', 'productionBrowserSourceMaps is enabled') : pass('source-maps');
}

function checkHardcodedSecrets() {
  const patterns = [
    /sk_live_[A-Za-z0-9]{16,}/,
    /sk_test_[A-Za-z0-9]{16,}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/,
    /ghp_[A-Za-z0-9]{30,}/,
    /AKIA[0-9A-Z]{16}/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!\s*$|changeme|your_|<)/i,
  ];
  const hits = [];
  const scanRoots = ['src', 'scripts', 'drizzle', 'package.json', 'next.config.js', 'middleware.ts']
    .map((p) => path.join(ROOT, p))
    .filter((p) => fs.existsSync(p));
  const files = scanRoots.flatMap((p) => (fs.statSync(p).isDirectory() ? walk(p) : [p]));
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel.endsWith('security-hardening-audit.mjs')) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      if (pattern.test(src)) hits.push(rel);
    }
  }
  return hits.length ? fail('hardcoded-secrets', [...new Set(hits)].slice(0, 20).join(', ')) : pass('hardcoded-secrets');
}

function checkPublicErrorHelpers() {
  const risky = [];
  for (const file of walk(path.join(ROOT, 'src/app/api'))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const src = fs.readFileSync(file, 'utf8');
    if (/status:\s*500/.test(src) && /\(err as Error\)\.message|e\.message|err\.message/.test(src)) {
      risky.push(rel);
    }
  }
  if (!risky.length) return pass('generic-error-handling');
  const detail = `Raw 500 error messages in ${risky.length} existing route(s); first: ${risky.slice(0, 10).join(', ')}`;
  return process.env.SECURITY_AUDIT_STRICT === '1' ? fail('generic-error-handling', detail) : warn('generic-error-handling', detail);
}

const checks = [
  checkRateLimitConfig(),
  checkUploadValidation(),
  checkAuthCoverage(),
  checkSourceMaps(),
  checkHardcodedSecrets(),
  checkPublicErrorHelpers(),
];

console.log('\nSECURITY HARDENING AUDIT\n');
for (const check of checks) {
  console.log(`${check.level}  ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}
const ok = checks.every((check) => check.ok);
console.log(`\nSECURITY HARDENING AUDIT: ${ok ? 'PASS' : 'FAIL'}\n`);
process.exit(ok ? 0 : 1);
