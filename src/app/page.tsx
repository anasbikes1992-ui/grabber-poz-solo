import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import { resolveLandingMode } from '@/lib/config/landing-mode';

const COMPANY_METADATA: Metadata = {
  title: 'Grabber POZ | The All-in-One Retail & Commerce OS for Sri Lanka',
  description:
    'Run your shop counter, touch POS, barcodes, inventory, customer credit (Polim Potha), online store, and Sri Lankan payment gateways from one connected standalone system.',
  keywords: [
    'POS Sri Lanka',
    'retail POS Sri Lanka',
    'inventory management Sri Lanka',
    'online store Sri Lanka',
    'retail management software Sri Lanka',
    'Polim Potha software',
    'POS and online store Sri Lanka',
  ],
  openGraph: {
    title: 'Grabber POZ — Retail & Commerce OS for Sri Lanka',
    description:
      'High-speed touch POS, Polim Potha credit ledger, multi-branch inventory, and integrated Sri Lankan payment gateways.',
    type: 'website',
  },
};

const STOREFRONT_METADATA: Metadata = {
  title: 'Online Store | Grabber Commerce',
  description:
    'Browse our live inventory catalog, add items to bag, and order online with fast delivery.',
};

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const mode = resolveLandingMode(h.get('host') || h.get('x-forwarded-host'));
  return mode === 'storefront' ? STOREFRONT_METADATA : COMPANY_METADATA;
}

export default async function HomePage() {
  const h = await headers();
  const mode = resolveLandingMode(h.get('host') || h.get('x-forwarded-host'));

  // Dynamic import so only one landing graph ships per mode
  if (mode === 'storefront') {
    const [{ StorefrontHome }, cms] = await Promise.all([
      import('@/components/storefront/storefront-home'),
      readStorefrontConfig(),
    ]);
    return <StorefrontHome cms={cms} />;
  }

  const { CompanyLanding } = await import('@/components/company/CompanyLanding');
  return <CompanyLanding />;
}
