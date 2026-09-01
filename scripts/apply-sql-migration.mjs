/**
 * Apply drizzle SQL migration file (split on statement-breakpoint).
 * Ignores already-exists errors so it is safe on partially migrated DBs.
 */
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const file = process.argv[2] || 'drizzle/migrations/0001_business_os_align.sql';
const url = process.env.DATABASE_URL || process.env.database_url;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sqlText = fs.readFileSync(path.resolve(file), 'utf8');
const statements = sqlText
  .split(/-->\s*statement-breakpoint/)
  .map((s) => s.trim())
  .filter(Boolean);

const db = postgres(url, { max: 1, prepare: false, ssl: 'require' });

let ok = 0;
let skip = 0;
let fail = 0;

for (const stmt of statements) {
  try {
    await db.unsafe(stmt);
    ok += 1;
    console.log('OK:', stmt.slice(0, 72).replace(/\s+/g, ' '));
  } catch (e) {
    const msg = e.message || String(e);
    if (/already exists|duplicate/i.test(msg)) {
      skip += 1;
      console.log('SKIP:', msg.split('\n')[0]);
    } else {
      fail += 1;
      console.error('FAIL:', msg.split('\n')[0]);
      console.error('STMT:', stmt.slice(0, 120));
    }
  }
}

const tables = await db`
  select count(*)::int as n from information_schema.tables where table_schema = 'public'
`;
console.log(`\nDone ok=${ok} skip=${skip} fail=${fail} public_tables=${tables[0].n}`);
await db.end({ timeout: 2 });
process.exit(fail > 0 ? 1 : 0);
