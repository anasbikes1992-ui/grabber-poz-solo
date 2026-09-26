/**
 * Demo recovery seed for demo.grabberpoz.com.
 *
 * Usage:
 *   npm run demo:seed -- --env-file=.env.demo
 *   tsx scripts/setup-demo-storefront.ts --env-file=.env.demo --preset=fashion
 */
import { config as loadEnv } from 'dotenv';
import { generateRandomPin } from '../src/lib/auth/session';
import { runDynamicSeed } from '../src/lib/setup/dynamic-seed';
import { VERTICAL_PRESETS, type VerticalPresetId } from '../src/lib/config/vertical-presets';

const envArg = process.argv.find((arg) => arg.startsWith('--env-file='));
if (envArg) {
  loadEnv({ path: envArg.split('=')[1], override: true });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const presetArg = process.argv.find((arg) => arg.startsWith('--preset='))?.split('=')[1];
const preset: VerticalPresetId = presetArg && presetArg in VERTICAL_PRESETS ? (presetArg as VerticalPresetId) : 'fashion';
const storeName = process.argv.find((arg) => arg.startsWith('--store='))?.split('=')[1] || 'Grabber Demo';

console.log(`Seeding demo storefront: ${storeName} (${preset})`);

try {
  const result = await runDynamicSeed({
    storeName,
    preset,
    slug: 'demo',
    ownerEmail: 'owner@demo.grabber.local',
    ownerPin: generateRandomPin(),
    demoMode: true,
  });

  console.log(`Demo seed complete: ${result.catalogCount} catalog item(s).`);
  console.log('Required host env: LANDING_MODE=storefront, NEXT_PUBLIC_DEMO_THEME_PICKER=1');
  console.log('Smoke: open /shop, a product detail page, and /shop/checkout.');
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Demo seed failed: ${message}`);
  process.exit(1);
}
