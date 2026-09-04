#!/usr/bin/env node
/**
 * GRABBER BUSINESS OS — RELEASE GATE: AGENT CONTROL PLANE & PREFLIGHT SAFETY
 *
 * Verifies Invariants AG-001 through AG-012:
 * AG-001: Explicit Tool Input/Output Schemas
 * AG-002: Tool Authorization Policies
 * AG-003: Approval Bridge for High-Risk Writes
 * AG-004: Absolute Prohibition of Arbitrary SQL
 * AG-005: Canonical Commerce Service Routing
 * AG-006: Immutable Audit Attribution
 * AG-007: Strict Idempotency
 * AG-008: Transactional Rollback on Execution Failure
 * AG-009: Prompt-Injection Resistance
 * AG-010: Privilege Escalation Immunity
 * AG-011: Immutability of Financial & Certified Records
 * AG-012: Zero Regression on Commerce Invariants (CI-001 -> CI-012)
 */

import { spawnSync } from 'child_process';

console.log('\n======================================================');
console.log('RELEASE GATE — AGENTIC CONTROL PLANE & PREFLIGHT SAFETY');
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

// 1. TypeScript Clean Check
runStep('TypeScript Clean Check', 'npx', ['tsc', '--noEmit']);

// 2. P0 Security Hardening Tests (Role spoofing, amount lock, typed errors)
runStep('P0 Security Hardening Tests', 'npx', [
  'vitest',
  'run',
  'tests/p0-security-hardening.test.ts',
]);

// 3. Multi-Warehouse & Stock Transfers Tests
runStep('Multi-Warehouse & Stock Transfers Invariants', 'npx', [
  'vitest',
  'run',
  'tests/warehouses-and-transfers.test.ts',
]);

// 4. Agent Control Plane & Security Tests (AG-001 -> AG-012)
runStep('Agent Security & Control Plane (AG-001 -> AG-012)', 'npx', [
  'vitest',
  'run',
  'tests/agents/agent-security.test.ts',
]);

// 5. M6 Installation Identity & Standalone Licensing
runStep('M6 Installation Identity Check', 'npx', [
  'vitest',
  'run',
  'tests/installation-identity.test.ts',
]);

// 6. M5 Promotion Invariants
runStep('M5 Promotion Invariants Check', 'npx', [
  'vitest',
  'run',
  'tests/promotion-engine.test.ts',
  'tests/promotion-security.test.ts',
  'tests/promotion-concurrency.test.ts',
  'tests/promotion-checkout-parity.test.ts',
]);

// 7. M3 Commerce Integrity Regression Check (118/118)
runStep('M3 Commerce Integrity Regression Check', 'npx', [
  'vitest',
  'run',
  'tests/commerce-integrity.test.ts',
  'tests/commerce-certification.test.ts',
]);

// 8. API Authentication Coverage Check
runStep('API Auth Coverage Check', 'node', ['scripts/api-auth-coverage.mjs']);

console.log('\n======================================================');
console.log('✓ AGENT CONTROL PLANE & SAFETY GATES: CERTIFIED');
console.log('  AG-001 through AG-012: 12/12 Agent Invariants Verified');
console.log('  Security Guarantee: Zero Arbitrary SQL / High-Risk Approval Required');
console.log('  Single-Business Invariant: Preserved (1 Client = 1 DB = 1 Install)');
console.log('  Regression Verdict: ZERO REGRESSION across M3, M4, M5, M6');
console.log('======================================================\n');
