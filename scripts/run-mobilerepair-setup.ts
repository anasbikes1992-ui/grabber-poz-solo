/**
 * Run MobileRepair DB setup (catalog, phones, vertical preset).
 * Usage: npx tsx scripts/run-mobilerepair-setup.ts [--env-file=.env.prod.txt]
 */
import { config as loadEnv } from 'dotenv';
import { db } from '../src/db/index';
import { runMobileRepairSetup } from '../src/lib/repairs/mobilerepair-setup';

const envArg = process.argv.find((a) => a.startsWith('--env-file='));
if (envArg) {
  loadEnv({ path: envArg.split('=')[1], override: true });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const storeName = process.argv.find((a) => a.startsWith('--store='))?.split('=')[1] || 'MobileRepair Shop';

const result = await runMobileRepairSetup(db, { storeName });
console.log(JSON.stringify({ success: true, ...result }, null, 2));
