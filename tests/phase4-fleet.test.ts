import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Phase 4 fleet & hygiene', () => {
  it('provision docs and runbook mention the current migration range', () => {
    expect(fs.existsSync(path.join(root, 'docs/PROVISION_NEXT_CLIENT.md'))).toBe(true);
    expect(read('scripts/provision-client.mjs')).toContain('0016');
    expect(read('docs/FRESH_START.md')).toContain('0016');
  });

  it('DB-06 validate script and pending 0013 exist', () => {
    expect(fs.existsSync(path.join(root, 'scripts/validate-legacy-bridges.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'drizzle/migrations/0013_drop_legacy_triggers.sql.pending'))).toBe(true);
    expect(read('docs/LEGACY_MIGRATION_BRIDGE.md')).toContain('db:validate-legacy');
    expect(read('package.json')).toContain('db:validate-legacy');
  });

  it('ops:smoke and lighthouse scripts wired', () => {
    expect(fs.existsSync(path.join(root, 'scripts/ops-smoke.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'scripts/lighthouse-mobile.mjs'))).toBe(true);
    expect(read('package.json')).toContain('ops:smoke');
    expect(read('package.json')).toContain('lighthouse:shop');
    expect(fs.existsSync(path.join(root, 'docs/LIGHTHOUSE_MOBILE.md'))).toBe(true);
  });

  it('JAR-08 honesty — keyword router documented', () => {
    expect(read('src/lib/ai/jarvis-chat-router.ts')).toContain('JAR-08');
    expect(read('docs/BUSINESS_OS_JARVIS.md')).toContain('no LLM');
  });
});
