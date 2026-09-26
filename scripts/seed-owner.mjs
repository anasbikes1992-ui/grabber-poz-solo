import { randomUUID, scryptSync, randomBytes } from 'crypto';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL or POSTGRES_URL is required.');
  process.exit(1);
}
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_TEMP_PIN = process.env.OWNER_TEMP_PIN;
const OWNER_NAME = process.env.OWNER_NAME || 'Owner';
if (!OWNER_EMAIL || !OWNER_TEMP_PIN) {
  console.error('OWNER_EMAIL and OWNER_TEMP_PIN are required.');
  process.exit(1);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  console.log('Connecting to database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  const sql = postgres(DATABASE_URL);

  const email = OWNER_EMAIL;
  const hashedPin = hashPassword(OWNER_TEMP_PIN);
  const name = OWNER_NAME;
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
    console.log(`User ${email} updated successfully with role ${role}.`);
  } else {
    console.log(`Creating new owner user ${email}...`);
    const newId = randomUUID();
    await sql`
      INSERT INTO users (id, email, name, role, active, hashed_pin, created_at, updated_at)
      VALUES (${newId}, ${email}, ${name}, ${role}, true, ${hashedPin}, NOW(), NOW())
    `;
    console.log(`User ${email} created successfully (id: ${newId}) with role ${role}.`);
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
