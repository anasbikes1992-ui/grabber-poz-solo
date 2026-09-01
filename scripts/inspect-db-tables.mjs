import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { postgresClientOptions, resolveDirectDatabaseUrl } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const url = resolveDirectDatabaseUrl();
if (!url) {
  console.error('Database URL missing — set DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

const host = new URL(url.replace(/^postgresql:\/\//, 'https://')).hostname;
const db = postgres(url, postgresClientOptions(url));

const rows = await db`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log('host:', host);
console.log('tables:', rows.length);
const names = rows.map((r) => r.table_name);
console.log('solo_markers:', {
  orders: names.includes('orders'),
  business_profile: names.includes('business_profile'),
  business_config: names.includes('business_config'),
});
console.log(names.join('\n'));
await db.end({ timeout: 2 });
