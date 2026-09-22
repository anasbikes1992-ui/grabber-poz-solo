import { scryptSync, randomBytes } from 'crypto';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:uDICQ4PfPnsUpHJbzK3vIJi0B9bgpHtc0GmD2OKW2iKkheD4iRcV33jMwAtJrMJJ@109.123.246.84:15432/thepartystore';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  console.log('Connecting to database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  const sql = postgres(DATABASE_URL);

  const email = 'anasazeez1992@gmail.com';
  const rawPassword = 'Aa123456';
  const hashedPin = hashPassword(rawPassword);
  const name = 'Anas Azeez';
  const role = 'OWNER';

  // Check if user already exists
  const existing = await sql`SELECT id, email, role, active FROM users WHERE email = ${email}`;

  if (existing.length > 0) {
    console.log(`User ${email} exists (id: ${existing[0].id}). Updating credentials...`);
    await sql`
      UPDATE users 
      SET 
        hashed_pin = ${hashedPin},
        role = ${role},
        active = true,
        name = ${name},
        updated_at = NOW()
      WHERE email = ${email}
    `;
    console.log(`User ${email} updated successfully with role ${role} and password ${rawPassword}.`);
  } else {
    console.log(`Creating new owner user ${email}...`);
    const newId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, email, name, role, active, hashed_pin, created_at, updated_at)
      VALUES (${newId}, ${email}, ${name}, ${role}, true, ${hashedPin}, NOW(), NOW())
    `;
    console.log(`User ${email} created successfully (id: ${newId}) with role ${role} and password ${rawPassword}.`);
  }

  // Also check other owner users
  const allOwners = await sql`SELECT id, email, name, role, active FROM users WHERE role = 'OWNER'`;
  console.log('Current OWNER accounts in database:');
  console.table(allOwners);

  await sql.end();
}

main().catch((err) => {
  console.error('Failed to seed owner user:', err);
  process.exit(1);
});
