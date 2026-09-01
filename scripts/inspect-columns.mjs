import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const db = postgres(process.env.DATABASE_URL || process.env.database_url, {
  max: 1,
  prepare: false,
  ssl: 'require',
});

const tables = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['business_profile', 'suppliers', 'tax_profiles', 'tax_rates'];

for (const table of tables) {
  const cols = await db`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  console.log(`\n${table} (${cols.length} cols):`);
  for (const c of cols) console.log(`  - ${c.column_name} (${c.data_type}, null=${c.is_nullable})`);
}

await db.end({ timeout: 2 });
