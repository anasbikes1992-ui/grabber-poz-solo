import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getLocationBySlug,
  listLocationSlugs,
  locationPathSlug,
} from '@/lib/seo/location-pages';
import { siteBaseUrl } from '@/lib/storefront/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await listLocationSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLocationBySlug(slug);
  if (!page) return { title: 'Location not found' };
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `${siteBaseUrl()}/locations/${locationPathSlug(page)}` },
  };
}

export default async function LocationPage({ params }: Props) {
  const { slug } = await params;
  const page = await getLocationBySlug(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(page.schema) }}
      />
      <header className="border-b bg-white px-4 py-6 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-1">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-emerald-700 hover:underline">
              Home
            </Link>
            <span>/</span>
            <Link href="/locations" className="hover:text-emerald-700 hover:underline">
              Locations
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">{page.city}</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">{page.h1}</h1>
          <p className="text-sm text-slate-600">{page.metaDescription}</p>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Visit us</h2>
          <p className="mt-3 text-base text-slate-800">{page.addressText}</p>
          <p className="mt-2 text-sm">
            Phone:{' '}
            <a className="font-semibold text-emerald-800 hover:underline" href={`tel:${page.phone.replace(/\s+/g, '')}`}>
              {page.phone}
            </a>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Shop online
            </Link>
            <Link
              href="/locations"
              className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              All locations
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
