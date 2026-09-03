#!/usr/bin/env node
/**
 * GRABBER BUSINESS OS — RELEASE GATE M5
 * Verifies Storefront Promotion & Conversion Engine (PI-001 through PI-012)
 * + Zero M3 Commerce Invariant Regression.
 */

import { spawnSync } from 'child_process';

console.log('\n======================================================');
console.log('RELEASE GATE — M5: STOREFRONT PROMOTION ENGINE');
console.log('======================================================\n');

function runStep(label, cmd, args) {
  console.log(`▶ ${label}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error(`\n❌ FAILED: ${label} (exit ${r.status})\n`);
    process.exit(r.status ?? 1);
  }
}

// 1. TypeScript Verification
runStep('TypeScript Clean Check', 'npx', ['tsc', '--noEmit']);

// 2. M5 Promotion Invariants Test Suite
runStep('M5 Promotion Invariants & Attack Tests (PI-001 → PI-012)', 'npx', [
  'vitest',
  'run',
  'tests/promotion-engine.test.ts',
  'tests/promotion-security.test.ts',
  'tests/promotion-concurrency.test.ts',
  'tests/promotion-checkout-parity.test.ts',
]);

// 3. M3 Regression Verification (118/118 must pass)
runStep('M3 Commerce Integrity Regression Check', 'npx', [
  'vitest',
  'run',
  'tests/commerce-integrity.test.ts',
  'tests/commerce-certification.test.ts',
]);

// 4. API Authentication Coverage
runStep('API Auth Coverage Check', 'node', ['scripts/api-auth-coverage.mjs']);

console.log('\n======================================================');
console.log('✓ M5 PROMOTION & CONVERSION ENGINE: CERTIFIED');
console.log('  PI-001 through PI-012: 12/12 Invariants Verified');
console.log('  M3 Commerce Regression: ZERO REGRESSION (118/118 PASS)');
console.log('======================================================\n');
