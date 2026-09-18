#!/usr/bin/env node
/**
 * Wave C maintainability helper — reports line counts for heavy client modules.
 * No build required. Use before/after splits to confirm size moves in the right direction.
 *
 *   node scripts/report-client-sizes.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const roots = [
  'src/app/pos/page.tsx',
  'src/app/products/page.tsx',
  'src/components/company/CompanyLanding.tsx',
  'src/components/company/CompanyLandingBelowFold.tsx',
  'src/components/storefront/storefront-home.tsx',
  'src/lib/pos/pos-types.ts',
];

const cwd = process.cwd();
const rows = [];

for (const rel of roots) {
  const abs = join(cwd, rel);
  if (!existsSync(abs)) {
    rows.push({ file: rel, lines: null, bytes: null, note: 'missing' });
    continue;
  }
  const buf = readFileSync(abs);
  const lines = buf.toString('utf8').split(/\r?\n/).length;
  rows.push({ file: rel, lines, bytes: buf.length, note: '' });
}

rows.sort((a, b) => (b.lines ?? 0) - (a.lines ?? 0));

console.log('Client / heavy module sizes (Wave C)\n');
console.log(
  `${'file'.padEnd(52)} ${'lines'.padStart(7)} ${'bytes'.padStart(10)}`,
);
console.log('-'.repeat(72));
for (const r of rows) {
  const lines = r.lines == null ? '—' : String(r.lines);
  const bytes = r.bytes == null ? '—' : String(r.bytes);
  console.log(`${r.file.padEnd(52)} ${lines.padStart(7)} ${bytes.padStart(10)}${r.note ? `  (${r.note})` : ''}`);
}
console.log('\nTip: keep POS/products behavior intact — extract types/helpers first, then UI sections.');
