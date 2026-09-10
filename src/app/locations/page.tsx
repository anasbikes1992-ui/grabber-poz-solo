import type { Metadata } from 'next';
import Link from 'next/link';
import { listLocationPages, locationPathSlug } from '@/lib/seo/location-pages';
import { siteBaseUrl } from '@/lib/storefront/seo';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Store Locations | Grabber',
    description: 'Find Grabber retail branches across Sri Lanka — address, phone, and directions.',
    alternates: { canonical: `${siteBaseUrl()}/locations` },
  };
}

export default async function LocationsIndexPage() {
  const pages = await listLocationPages();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-4 py-6 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-1">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700 hover:underline">
              Home
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Locations</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">Our branches</h1>
          <p className="text-sm text-slate-600">Visit us in-store for pickup, repairs, and counter service.</p>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {pages.map((p) => (
          <article key={p.branchId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              <Link href={`/locations/${locationPathSlug(p)}`} className="hover:text-emerald-700">
                {p.h1}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-slate-600">{p.addressText}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              <a href={`tel:${p.phone.replace(/\s+/g, '')}`} className="hover:underline">
                {p.phone}
              </a>
            </p>
            <Link
              href={`/locations/${locationPathSlug(p)}`}
              className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline"
            >
              Branch details →
            </Link>
          </article>
        ))}
      </main>
    </div>
  );
}
