import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryWithProducts } from '@/lib/storefront/catalog-server';

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCategoryWithProducts(slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-emerald-800">← Store home</Link>
          <h1 className="font-bold">{data.category.name}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.products.map((p) => (
          <article key={p.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">
              <Link href={`/products/${p.slug}`} className="hover:text-emerald-800 hover:underline">
                {p.name}
              </Link>
            </h2>
            <p className="mt-2 text-emerald-800 font-bold">LKR {Number(p.salePrice).toLocaleString()}</p>
          </article>
        ))}
        {data.products.length === 0 && (
          <p className="text-sm text-slate-500 col-span-full">No products in this category yet.</p>
        )}
      </main>
    </div>
  );
}
