import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const host = new URL(url.replace(/^postgresql:\/\//, 'https://')).hostname;
const db = postgres(url, { max: 1, prepare: false, ssl: 'require' });

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
  sales: names.includes('sales'),
  organizations: names.includes('organizations'),
});
console.log(names.join('\n'));
await db.end({ timeout: 2 });
