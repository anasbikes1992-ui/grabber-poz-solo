import postgres from 'postgres';
import { verifyPin, encodeSession } from '../src/lib/auth/session.ts';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL or POSTGRES_URL is required.');
  process.exit(1);
}
const AUTH_TEST_EMAIL = process.env.AUTH_TEST_EMAIL;
const AUTH_TEST_PIN = process.env.AUTH_TEST_PIN;
if (!AUTH_TEST_EMAIL || !AUTH_TEST_PIN) {
  console.error('AUTH_TEST_EMAIL and AUTH_TEST_PIN are required.');
  process.exit(1);
}

async function testAuth() {
  const sql = postgres(DATABASE_URL);
  const [user] = await sql`SELECT id, email, name, role, active, hashed_pin FROM users WHERE email = ${AUTH_TEST_EMAIL}`;
  console.log('Testing auth for user:', user?.email, 'Role:', user?.role, 'Active:', user?.active);

  if (!user) {
    throw new Error('User not found!');
  }

  const isValid = verifyPin(AUTH_TEST_PIN, user.hashed_pin);
  console.log('PIN/password verification:', isValid ? 'SUCCESS' : 'FAILED');

  const invalidTest = verifyPin('wrongpassword', user.hashed_pin);
  console.log('Negative test with wrong password:', !invalidTest ? 'REJECTED (Correct)' : 'ERROR (Unexpectedly passed)');

  if (isValid) {
    const token = encodeSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustRotateCredentials: false,
    });
    console.log('Session token generated successfully:', token.slice(0, 30) + '...');
  }

  await sql.end();
}

testAuth().catch(console.error);
