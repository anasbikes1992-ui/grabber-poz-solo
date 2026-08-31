'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/ui/brand-logo';

type Shopper = { id: string; name: string; phone: string | null; email: string | null };

export default function ShopAccountPage() {
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/auth/shopper');
      const data = (await res.json()) as { authenticated?: boolean; customer?: Shopper };
      setShopper(data.authenticated && data.customer ? data.customer : null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!shopper) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p>Sign in to view your account.</p>
        <Link href="/shop/login?next=/shop/account" className="text-emerald-800 font-semibold underline">
          Customer sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="inline-flex">
            <BrandLogo size="md" showTagline={false} showSoloBadge={false} />
          </Link>
          <Link href="/" className="text-sm font-medium text-emerald-800">
            Continue shopping
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-slate-900">My account</h1>
        <dl className="mt-8 space-y-4 rounded-3xl border bg-white p-6">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</dt>
            <dd className="mt-1 text-lg font-medium">{shopper.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</dt>
            <dd className="mt-1">{shopper.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="mt-1">{shopper.email ?? '—'}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-slate-500">
          Orders placed online appear in staff Ops under the same customer record.
        </p>
      </main>
    </div>
  );
}
