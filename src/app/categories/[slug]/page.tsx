import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryWithProducts } from '@/lib/storefront/catalog-server';
import { buildCategoryMetadata, categoryJsonLd } from '@/lib/storefront/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryWithProducts(slug);
  if (!data) return { title: 'Category Not Found | Grabber Store' };

  return buildCategoryMetadata({
    name: data.category.name,
    slug: data.category.slug,
    imageUrl: data.category.imageUrl,
    productCount: data.products.length,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCategoryWithProducts(slug);
  if (!data) notFound();

  const jsonLd = categoryJsonLd({
    name: data.category.name,
    slug: data.category.slug,
    products: data.products.map((p) => ({
      name: p.name,
      slug: p.slug,
      salePrice: Number(p.salePrice),
      imageUrl: p.imageUrl,
    })),
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b bg-white px-4 py-6 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="hover:text-emerald-700 hover:underline">
                Home
              </Link>
              <span>/</span>
              <Link href="/shop" className="hover:text-emerald-700 hover:underline">
                Shop
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">{data.category.name}</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {data.category.name}
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {data.products.length} {data.products.length === 1 ? 'Product' : 'Products'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p) => (
            <article
              key={p.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div>
                {p.imageUrl ? (
                  <div className="aspect-square w-full mb-4 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full mb-4 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    No image available
                  </div>
                )}

                <h2 className="font-semibold text-slate-900 text-sm line-clamp-2">
                  <Link
                    href={`/products/${p.slug}`}
                    className="hover:text-emerald-700 transition"
                  >
                    {p.name}
                  </Link>
                </h2>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-base font-bold text-emerald-800">
                  LKR {Number(p.salePrice).toLocaleString()}
                </p>
                <Link
                  href={`/products/${p.slug}`}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  View
                </Link>
              </div>
            </article>
          ))}

          {data.products.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <p className="text-base font-semibold text-slate-800">No products found in this category</p>
              <p className="text-xs text-slate-400 mt-1">Check back soon or explore other departments.</p>
              <Link
                href="/shop"
                className="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
