/**
 * Dynamic Vertical Seeder for Grabber POZ Solo
 * 
 * Usage:
 *   npx tsx scripts/seed-vertical.ts --preset=restaurant --store="Cinnamon Bistro"
 *   npx tsx scripts/seed-vertical.ts --preset=mobilerepair --store="QuickFix Mobile"
 *   npx tsx scripts/seed-vertical.ts --preset=fashion --store="Velvet & Linen"
 *   npx tsx scripts/seed-vertical.ts --preset=wholesale --store="Lanka Traders"
 *   npx tsx scripts/seed-vertical.ts --preset=grocery --store="Green Mart"
 */
import { config as loadEnv } from 'dotenv';
import { runDynamicSeed } from '../src/lib/setup/dynamic-seed';
import { VERTICAL_PRESETS, type VerticalPresetId } from '../src/lib/config/vertical-presets';

const envArg = process.argv.find((a) => a.startsWith('--env-file='));
if (envArg) {
  loadEnv({ path: envArg.split('=')[1], override: true });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const presetArg = process.argv.find((a) => a.startsWith('--preset='))?.split('=')[1] || process.argv[2];
const storeArg = process.argv.find((a) => a.startsWith('--store='))?.split('=')[1] || process.argv[3];

const presetId: VerticalPresetId = (presetArg && presetArg in VERTICAL_PRESETS)
  ? (presetArg as VerticalPresetId)
  : 'fashion';

const storeName = storeArg || (VERTICAL_PRESETS[presetId]?.exampleMerchant ?? 'Grabber Store');

console.log(`\n🌱 Seeding Vertical: [${presetId.toUpperCase()}] — "${storeName}"`);
console.log(`   Preset Description: ${VERTICAL_PRESETS[presetId]?.description}`);

try {
  const result = await runDynamicSeed({
    storeName,
    preset: presetId,
    slug: presetId,
    ownerEmail: `owner@${presetId}.grabber.local`,
    ownerPin: '1234',
  });

  console.log(`\n✅ Successfully seeded [${presetId}] vertical!`);
  console.log(`   • Products Catalog: ${result.catalogCount} items`);
  console.log(`   • Business Profile: "${storeName}"`);
  if (result.restaurantFloor) {
    console.log(`   • Restaurant Tables: ${result.restaurantFloor.count} dining tables seeded`);
  }
  if (result.mobilerepair) {
    console.log(`   • Repair Services: ${result.mobilerepair.catalogRows} repair matrix rows`);
  }
  console.log(`   • Storefront Theme: Configured for ${presetId}\n`);
} catch (error: any) {
  console.error(`\n❌ Seeding failed:`, error.message || error);
  process.exit(1);
}
