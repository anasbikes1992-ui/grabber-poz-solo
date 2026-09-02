import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductPurchasePanel } from '@/components/storefront/product-purchase-panel';
import { getStorefrontProductBySlug, listPublishedProductSlugs } from '@/lib/storefront/catalog-server';
import {
  buildProductMetadata,
  productDescription,
  productJsonLd,
} from '@/lib/storefront/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const rows = await listPublishedProductSlugs(100);
    return rows.map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) return { title: 'Product not found' };

  const description = productDescription({
    name: product.name,
    category: product.category,
    salePrice: product.salePrice,
    inStock: product.stock > 0,
  });

  return buildProductMetadata({
    name: product.name,
    slug: product.slug,
    description,
    salePrice: product.salePrice,
    imageUrl: product.imageUrl,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) notFound();

  const description = productDescription({
    name: product.name,
    category: product.category,
    salePrice: product.salePrice,
    inStock: product.stock > 0,
  });

  const purchaseLines =
    product.variants.length > 0
      ? product.variants.map((v) => ({
          productId: product.id,
          variantId: v.id,
          name: product.name,
          variantLabel: v.name,
          unitPrice: v.salePrice,
          unitCost: v.costPrice,
          stock: v.stock,
          attributesJson: v.attributesJson,
        }))
      : [
          {
            productId: product.id,
            name: product.name,
            variantLabel: product.sku,
            unitPrice: product.salePrice,
            unitCost: product.costPrice,
            stock: product.stock,
          },
        ];

  const jsonLd = productJsonLd({
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description,
    salePrice: product.salePrice,
    imageUrl: product.imageUrl,
    inStock: product.stock > 0,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-emerald-900/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">
            ← Back to store
          </Link>
          <Link href="/shop/login" className="text-sm text-slate-600 hover:text-emerald-800">
            Account
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {product.category || 'Catalog'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-3 text-sm text-slate-600">{description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white p-3 border border-slate-200">
              <dt className="text-slate-500">SKU</dt>
              <dd className="font-mono font-semibold">{product.sku}</dd>
            </div>
            <div className="rounded-2xl bg-white p-3 border border-slate-200">
              <dt className="text-slate-500">Availability</dt>
              <dd className="font-semibold">{product.stock > 0 ? 'In stock' : 'Out of stock'}</dd>
            </div>
          </dl>
          {product.variants.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm">
              {product.variants.map((v) => (
                <li key={v.id} className="flex justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span>{v.name}</span>
                  <span className="font-semibold text-emerald-800">LKR {v.salePrice.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ProductPurchasePanel lines={purchaseLines} />
      </main>
    </div>
  );
}
