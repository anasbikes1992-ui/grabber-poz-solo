import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { readConfigJson } from '@/lib/config/business-settings';
import { DEFAULT_VERTICAL_FLAGS } from '@/lib/config/vertical-flags';
import RepairRequestWizardPage from './request-inner';

export const metadata = {
  title: 'Repair Request · Grabber',
  description: 'Submit a device repair request with guided intake and transparent estimates.',
};

export default async function Page() {
  const cfg = await readConfigJson();
  const flags = { ...DEFAULT_VERTICAL_FLAGS, ...((cfg.verticalFlags as Record<string, boolean>) || {}) };
  if (!flags.repairs) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="storefront min-h-screen p-8 text-center">Loading…</div>}>
      <RepairRequestWizardPage />
    </Suspense>
  );
}
