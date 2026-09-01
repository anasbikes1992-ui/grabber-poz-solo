import { Suspense } from 'react';
import RepairRequestWizardPage from './request-inner';

export const metadata = {
  title: 'Repair Request · Grabber',
  description: 'Submit a device repair request with guided intake and transparent estimates.',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="storefront min-h-screen p-8 text-center">Loading…</div>}>
      <RepairRequestWizardPage />
    </Suspense>
  );
}
