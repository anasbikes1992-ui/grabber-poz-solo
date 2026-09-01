import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const table = process.argv[2] || 'purchase_orders';
const db = postgres(process.env.DATABASE_URL || process.env.database_url, {
  max: 1,
  prepare: false,
  ssl: 'require',
});

const cols = await db`
  SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = ${table}
  ORDER BY ordinal_position
`;
for (const c of cols) {
  console.log(`${c.column_name}: null=${c.is_nullable} default=${c.column_default ?? 'none'}`);
}
await db.end({ timeout: 2 });
