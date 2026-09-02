/**
 * Verify RLS baseline is applied on the host database.
 * Exit 0 = pass, 1 = fail (or skip if no DATABASE_URL).
 */
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { postgresClientOptions, resolveDatabaseUrl } from './lib/resolve-db-url.mjs';

const envFile = process.argv.find((a) => a.startsWith('--env-file='))?.split('=')[1];
if (envFile) {
  loadEnv({ path: envFile });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const url = resolveDatabaseUrl();
if (!url) {
  console.log('SKIP: DATABASE_URL not set');
  process.exit(0);
}

const db = postgres(url, postgresClientOptions(url));

let fail = 0;

const tables = await db`
  SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relispartition
  ORDER BY c.relname
`;

if (!tables.length) {
  console.log('FAIL: no public tables found');
  fail++;
} else {
  for (const row of tables) {
    if (!row.rls_enabled) {
      console.log('FAIL: RLS not enabled on', row.tablename);
      fail++;
    }
  }
  if (!fail) {
    console.log(`OK: RLS enabled on all ${tables.length} public tables`);
  }
}

const anonPrivs = await db`
  SELECT privilege_type, table_name
  FROM information_schema.table_privileges
  WHERE grantee = 'anon' AND table_schema = 'public'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'SELECT')
  LIMIT 10
`;
if (anonPrivs.length) {
  console.log(
    'WARN: anon has table privileges on',
    [...new Set(anonPrivs.map((r) => r.table_name))].join(', '),
  );
} else {
  console.log('OK: anon has no table privileges on public tables');
}

const authPrivs = await db`
  SELECT privilege_type, table_name
  FROM information_schema.table_privileges
  WHERE grantee = 'authenticated' AND table_schema = 'public'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'SELECT')
  LIMIT 10
`;
if (authPrivs.length) {
  console.log(
    'WARN: authenticated has table privileges on',
    [...new Set(authPrivs.map((r) => r.table_name))].join(', '),
  );
} else {
  console.log('OK: authenticated has no table privileges on public tables');
}

console.log(fail ? `\nRLS probe: ${fail} failure(s)` : '\nRLS probe: PASS');
await db.end({ timeout: 2 });
process.exit(fail > 0 ? 1 : 0);
