import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL or POSTGRES_URL is required.');
  process.exit(1);
}

async function main() {
  console.log('Connecting to database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  const sql = postgres(DATABASE_URL);

  console.log('Checking stock balances count...');
  const before = await sql`
    SELECT 
      count(*)::int as total_rows,
      count(*) FILTER (WHERE on_hand = 10)::int as ten_count,
      count(*) FILTER (WHERE on_hand != 10)::int as not_ten_count,
      coalesce(sum(on_hand), 0)::numeric as total_stock
    FROM stock_balances
  `;
  console.log('Stock balances BEFORE update:');
  console.table(before);

  console.log('Setting all stock_balances to on_hand = 10, reserved = 0, damaged = 0...');
  const updated = await sql`
    UPDATE stock_balances
    SET 
      on_hand = 10,
      reserved = 0,
      damaged = 0,
      updated_at = NOW()
    WHERE on_hand != 10 OR reserved != 0 OR damaged != 0
  `;
  console.log(`Updated ${updated.count} stock balance rows.`);

  // Also check if any products exist that do not have a stock_balance record at all
  const missingStock = await sql`
    SELECT p.id, p.name, p.sku
    FROM products p
    LEFT JOIN stock_balances sb ON sb.product_id = p.id
    WHERE sb.id IS NULL
    LIMIT 20
  `;

  if (missingStock.length > 0) {
    console.log(`Found products missing stock_balance records. Creating default stock balance of 10...`);
    // Find default branch
    const branches = await sql`SELECT id FROM branches ORDER BY created_at ASC LIMIT 1`;
    const defaultBranchId = branches[0]?.id;

    if (defaultBranchId) {
      for (const p of missingStock) {
        await sql`
          INSERT INTO stock_balances (id, product_id, branch_id, on_hand, reserved, damaged, created_at, updated_at)
          VALUES (${randomUUID()}, ${p.id}, ${defaultBranchId}, 10, 0, 0, NOW(), NOW())
          ON CONFLICT (product_id, branch_id) DO UPDATE SET on_hand = 10
        `;
      }
      console.log(`Inserted stock balances for ${missingStock.length} items.`);
    }
  }

  const after = await sql`
    SELECT 
      count(*)::int as total_rows,
      count(*) FILTER (WHERE on_hand = 10)::int as ten_count,
      count(*) FILTER (WHERE on_hand != 10)::int as not_ten_count,
      coalesce(sum(on_hand), 0)::numeric as total_stock
    FROM stock_balances
  `;
  console.log('Stock balances AFTER update:');
  console.table(after);

  await sql.end();
}

main().catch((err) => {
  console.error('Failed to set stock quantities:', err);
  process.exit(1);
});
