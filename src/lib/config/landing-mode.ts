/**
 * Root `/` landing switch for single-tenant fleet installs.
 *
 * - company  → Grabber marketing site (CompanyLanding) — grabberpoz.com apex only
 * - storefront → Client online shop (StorefrontHome) — every merchant subdomain,
 *   including demo.grabberpoz.com (the demo is a merchant storefront too)
 *
 * Coolify: set LANDING_MODE per app. Host list is the fallback when unset —
 * the demo app serves grabberpoz.com + demo.grabberpoz.com and relies on it.
 */

export type LandingMode = 'company' | 'storefront';

const DEFAULT_COMPANY_HOSTS = [
  'grabberpoz.com',
  'www.grabberpoz.com',
  'grabber-poz-solo.vercel.app',
  'localhost',
  '127.0.0.1',
];

function parseHostList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean);
}

export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return '';
  return hostHeader.trim().toLowerCase().split(':')[0] || '';
}

/** Resolve landing mode for the current request host + env. */
export function resolveLandingMode(hostHeader?: string | null): LandingMode {
  const explicit = (process.env.LANDING_MODE || process.env.NEXT_PUBLIC_LANDING_MODE || '')
    .trim()
    .toLowerCase();
  if (explicit === 'company' || explicit === 'marketing') return 'company';
  if (explicit === 'storefront' || explicit === 'shop' || explicit === 'client') return 'storefront';

  const host = normalizeHost(hostHeader);
  const companyHosts = [
    ...DEFAULT_COMPANY_HOSTS,
    ...parseHostList(process.env.COMPANY_LANDING_HOSTS),
    ...parseHostList(process.env.NEXT_PUBLIC_COMPANY_LANDING_HOSTS),
  ];

  if (host && companyHosts.includes(host)) return 'company';
  // Unknown / client Coolify domain → merchant shop at /
  if (host) return 'storefront';
  return 'company';
}
