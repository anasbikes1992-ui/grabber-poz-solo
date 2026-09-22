import postgres from 'postgres';
import { verifyPin, encodeSession } from '../src/lib/auth/session.ts';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:uDICQ4PfPnsUpHJbzK3vIJi0B9bgpHtc0GmD2OKW2iKkheD4iRcV33jMwAtJrMJJ@109.123.246.84:15432/thepartystore';

async function testAuth() {
  const sql = postgres(DATABASE_URL);
  const [user] = await sql`SELECT id, email, name, role, active, hashed_pin FROM users WHERE email = 'anasazeez1992@gmail.com'`;
  console.log('Testing auth for user:', user?.email, 'Role:', user?.role, 'Active:', user?.active);

  if (!user) {
    throw new Error('User not found!');
  }

  const isValid = verifyPin('Aa123456', user.hashed_pin);
  console.log('Password verification for "Aa123456":', isValid ? 'SUCCESS' : 'FAILED');

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
