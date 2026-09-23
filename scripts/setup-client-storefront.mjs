/**
 * GRABBER BUSINESS OS PRO — Client business profile + storefront setup.
 *
 * Usage:
 *   node scripts/setup-client-storefront.mjs --manifest clients/client-002.json --dry-run
 *   node scripts/setup-client-storefront.mjs --manifest clients/client-002.json
 */
import fs from 'fs';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { resolveDatabaseUrl, postgresClientOptions } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const dryRun = args.includes('--dry-run');
const manifestPath = getArg('--manifest') || 'clients/client-002.json';

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const enabledVerticalPacks = Array.isArray(manifest.enabledVerticalPacks)
  ? manifest.enabledVerticalPacks
  : [manifest.verticalPack || 'retail_wholesale'];

const storefront = {
  theme: {
    presetId: 'party-pop',
    storeName: manifest.businessName,
    primaryColor: '#E11D48',
    accentColor: '#2563EB',
    secondaryColor: '#FB7185',
    backgroundColor: '#FFF1F2',
    foregroundColor: '#881337',
    mutedColor: '#FFE4E6',
    borderColor: '#FECDD3',
    onPrimaryColor: '#FFFFFF',
    fontFamily: 'Rubik, Nunito Sans',
    heroStyle: 'bold',
    heroGradient:
      'radial-gradient(circle at 15% 20%, rgba(251,113,133,0.30), transparent 30%), radial-gradient(circle at 85% 8%, rgba(37,99,235,0.18), transparent 28%), linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 48%, #EFF6FF 100%)',
    cardStyle: 'elevated',
    colorScheme: 'light',
  },
  blocks: [
    {
      id: 'tps_announcement',
      type: 'ANNOUNCEMENT',
      text: 'Party supplies, balloons, candles, banners and themed décor — ready for pickup or COD delivery.',
      ctaText: 'Shop party picks',
      ctaUrl: '/shop#catalog',
      slot: 'TOP',
      enabled: true,
    },
    {
      id: 'tps_hero_slider',
      type: 'HERO_SLIDER',
      slot: 'HERO',
      enabled: true,
      autoplayMs: 6500,
      slides: [
        {
          title: 'Make every party pop',
          subtitle: 'Balloons, themes, banners, candles and tableware for birthdays, baby showers and celebrations.',
          imageUrl: '/uploads/clients/thepartystore/products/Balloon%20Bouquet%201.jpg',
          ctaLabel: 'Browse catalog',
          ctaHref: '/shop#catalog',
        },
        {
          title: 'Birthday setups in one place',
          subtitle: 'Shop age balloons, sashes, cake toppers, table décor and photo props from one live POS catalog.',
          imageUrl: '/uploads/clients/thepartystore/products/Birthday%20Package%201.jpg',
          ctaLabel: 'Find birthday items',
          ctaHref: '/shop#catalog',
        },
        {
          title: 'Baby shower & theme party essentials',
          subtitle: 'From Baby Shark to Unicorn, Barbie, Avengers and custom color themes — pick, pack and celebrate.',
          imageUrl: '/uploads/clients/thepartystore/products/Baby%20Shower%20Decoration%20Package%201.jpg',
          ctaLabel: 'Shop themes',
          ctaHref: '/shop#catalog',
        },
      ],
    },
    {
      id: 'tps_mid_banner',
      type: 'MID_BANNER',
      title: 'Build the full setup, not just one item',
      body: 'Use categories to combine balloons, cups, plates, napkins, banners, candles and photo props for a complete event basket.',
      ctaLabel: 'Start with balloons',
      ctaHref: '/shop#catalog',
      imageUrl: '/uploads/clients/thepartystore/products/Balloon%20Arch%201.jpg',
      slot: 'MID',
      enabled: true,
    },
    {
      id: 'tps_featured',
      type: 'FEATURED',
      title: 'Popular party essentials',
      productSlugs: [],
      slot: 'PRE_CATALOG',
      enabled: true,
    },
    {
      id: 'tps_footer',
      type: 'FOOTER_CTA',
      title: 'Need help matching a theme?',
      body: 'Send your event date, color theme and budget. ThePartyStore team can help you pick a complete setup.',
      whatsappLabel: 'Ask on WhatsApp',
      slot: 'FOOTER',
      enabled: true,
    },
  ],
};

const verticalFlags = {
  grocery: false,
  fashion: false,
  electronics: false,
  restaurant: false,
  hardware: false,
  generalRetail: true,
  pharmacy: false,
  rental: false,
  autoParts: false,
  appointments: false,
  repairs: false,
  wholesale: false,
};

const profile = {
  name: manifest.businessName,
  legalName: manifest.legalName,
  currency: manifest.currency || 'LKR',
  timezone: manifest.timezone || 'Asia/Colombo',
  receiptHeader: `${manifest.businessName}\nParty supplies • Balloons • Gifts`,
  receiptFooter:
    'Thank you for shopping with ThePartyStore. Please keep this bill for exchanges. Inflated balloons, opened packs and customized items are not exchangeable.',
};

if (dryRun) {
  console.log(JSON.stringify({ profile, storefront, verticalFlags, enabledVerticalPacks }, null, 2));
  process.exit(0);
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error('Database URL missing in environment (.env / .env.local).');
  process.exit(1);
}

const sql = postgres(url, postgresClientOptions(url));

try {
  const [existingProfile] = await sql`SELECT id FROM business_profile LIMIT 1`;
  if (existingProfile) {
    await sql`
      UPDATE business_profile
      SET name = ${profile.name},
          legal_name = ${profile.legalName},
          currency = ${profile.currency},
          timezone = ${profile.timezone},
          receipt_header = ${profile.receiptHeader},
          receipt_footer = ${profile.receiptFooter},
          updated_at = now()
      WHERE id = ${existingProfile.id}
    `;
  } else {
    await sql`
      INSERT INTO business_profile (name, legal_name, currency, timezone, receipt_header, receipt_footer)
      VALUES (${profile.name}, ${profile.legalName}, ${profile.currency}, ${profile.timezone}, ${profile.receiptHeader}, ${profile.receiptFooter})
    `;
  }

  const configRows = await sql`SELECT id, config_json FROM business_config`;
  const existingConfig = configRows[0];
  const nextConfig = {
    ...((existingConfig?.config_json || {})),
    planMode: 'pro',
    verticalPacks: enabledVerticalPacks,
    storefront,
    verticalFlags,
  };

  if (existingConfig) {
    await sql`
      UPDATE business_config
      SET vertical = 'general-retail',
          enable_variants = true,
          enable_credit_sales = true,
          enable_delivery = true,
          config_json = ${sql.json(nextConfig)},
          updated_at = now()
    `;
  } else {
    await sql`
      INSERT INTO business_config (vertical, enable_variants, enable_credit_sales, enable_delivery, config_json)
      VALUES ('general-retail', true, true, true, ${sql.json(nextConfig)})
    `;
  }

  console.log(`ThePartyStore profile and storefront config applied.`);
} finally {
  await sql.end({ timeout: 2 });
}
