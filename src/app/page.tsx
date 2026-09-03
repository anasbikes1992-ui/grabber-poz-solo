import type { Metadata } from 'next';
import { CompanyLanding } from '@/components/company/CompanyLanding';

export const metadata: Metadata = {
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

export default function HomePage() {
  return <CompanyLanding />;
}
