import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { ProductPurchasePanel } from '@/components/storefront/product-purchase-panel';
import { ProductWishlistButton } from '@/components/storefront/product-wishlist-button';
import { ProductReviews } from '@/components/storefront/product-reviews';
import { readStorefrontConfig } from '@/lib/config/storefront-config';
import {
  getStorefrontProductBySlug,
  listPublishedProductSlugs,
  listRelatedStorefrontProducts,
} from '@/lib/storefront/catalog-server';
import {
  buildProductMetadata,
  productDescription,
  productJsonLd,
} from '@/lib/storefront/seo';
import { storefrontStockLabel } from '@/lib/storefront/stock-label';

type Props = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const description =
    product.metaDescription ||
    product.description ||
    productDescription({
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

  const [cms, relatedProducts] = await Promise.all([
    readStorefrontConfig(),
    listRelatedStorefrontProducts(product, 8),
  ]);

  const description =
    product.description ||
    product.metaDescription ||
    productDescription({
      name: product.name,
      category: product.category,
      salePrice: product.salePrice,
      inStock: product.stock > 0,
    });

  const purchaseLines =
    product.variants.length > 0
      ? product.variants.map((variant) => ({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantLabel: variant.name,
          unitPrice: variant.salePrice,
          unitCost: variant.costPrice,
          stock: variant.stock,
          attributesJson: variant.attributesJson,
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

  const attributeRows = product.variants.flatMap((variant) =>
    Object.entries(variant.attributesJson || {}).map(([key, value]) => ({
      key,
      value,
      variant: variant.name,
    })),
  );
  const uniqueAttributeRows = attributeRows.filter(
    (row, index, rows) =>
      rows.findIndex((candidate) => candidate.key === row.key && candidate.value === row.value) === index,
  );

  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.salePrice))
    : product.salePrice;
  const maxPrice = product.variants.length
    ? Math.max(...product.variants.map((variant) => variant.salePrice))
    : product.salePrice;
  const priceLabel =
    minPrice === maxPrice
      ? `LKR ${minPrice.toLocaleString('en-LK')}`
      : `LKR ${minPrice.toLocaleString('en-LK')} - ${maxPrice.toLocaleString('en-LK')}`;

  const variantGroups = new Map<string, string[]>();
  for (const variant of product.variants) {
    for (const [key, value] of Object.entries(variant.attributesJson || {})) {
      const values = variantGroups.get(key) || [];
      if (value && !values.includes(value)) {
        values.push(value);
        variantGroups.set(key, values);
      }
    }
  }
  const variantGroupEntries = Array.from(variantGroups.entries()).slice(0, 4);
  const heroImage = product.imageUrl || relatedProducts.find((item) => item.imageUrl)?.imageUrl || null;
  const thumbnailImages = [heroImage, ...relatedProducts.map((item) => item.imageUrl)].filter(Boolean).slice(0, 3);

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
    <StorefrontShell cms={cms}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="bg-[var(--sf-background)] text-[var(--sf-foreground)]">
        <section className="border-b border-[var(--sf-border)] bg-[var(--sf-muted)]/35">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs font-semibold sm:px-6">
            <Link href="/shop" className="text-[var(--sf-secondary)] hover:text-[var(--sf-accent)]">
              Back to store
            </Link>
            <span className="mx-2 text-[var(--sf-border)]">/</span>
            <span className="text-[var(--sf-secondary)]">{product.category || 'Catalog'}</span>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.74fr)] lg:items-start lg:py-10">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-lg shadow-[var(--sf-primary)]/5">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={product.name}
                  className="aspect-[4/3] max-h-[560px] w-full object-contain p-6"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[var(--sf-muted)] text-center text-sm font-semibold text-[var(--sf-secondary)]">
                  Product image coming soon
                </div>
              )}
            </div>
            {thumbnailImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {thumbnailImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl as string} alt="" className="aspect-square w-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--sf-accent)]">
                {product.category || 'Catalog'}
              </p>
              <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--sf-foreground)] sm:text-4xl">
                {product.name}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--sf-secondary)]">{description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-[var(--sf-primary)] px-3 py-1.5 text-[var(--sf-on-primary)]">
                  {priceLabel}
                </span>
                <span className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-1.5">
                  {storefrontStockLabel(product.stock)}
                </span>
                <span className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-1.5 font-mono">
                  {product.sku}
                </span>
              </div>
            </div>

            {variantGroupEntries.length > 0 && (
              <section className="rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-4">
                <h2 className="font-display text-lg font-bold">Choose your options</h2>
                <div className="mt-4 space-y-4">
                  {variantGroupEntries.map(([name, values]) => (
                    <div key={name}>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--sf-secondary)]">{name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {values.map((value) => (
                          <span
                            key={`${name}-${value}`}
                            className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-background)] px-3 py-1.5 text-xs font-semibold"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ProductPurchasePanel lines={purchaseLines} />
            <ProductWishlistButton productId={product.id} />
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-5 shadow-sm lg:col-span-2">
            <h2 className="font-display text-xl font-bold">Product options & details</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Available options', product.variants.length > 0 ? `${product.variants.length} variants` : 'Standard product'],
                ['Order notes', 'Custom text, event date, delivery or pickup'],
                ['Stock status', storefrontStockLabel(product.stock)],
                ['Need help?', 'WhatsApp the store after adding to bag'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[var(--sf-muted)]/45 p-4">
                  <p className="text-xs font-semibold uppercase text-[var(--sf-secondary)]">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
            {product.variants.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--sf-border)]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-[var(--sf-muted)]/45 px-3 py-2 text-xs font-bold uppercase text-[var(--sf-secondary)]">
                  <span>Variant</span>
                  <span>Availability</span>
                  <span>Price</span>
                </div>
                {product.variants.slice(0, 16).map((variant) => (
                  <div key={variant.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-[var(--sf-border)] px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-semibold">{variant.name}</span>
                    <span className="font-semibold text-[var(--sf-secondary)]">{storefrontStockLabel(variant.stock)}</span>
                    <span className="font-bold text-[var(--sf-accent)]">LKR {variant.salePrice.toLocaleString('en-LK')}</span>
                  </div>
                ))}
              </div>
            )}
            {uniqueAttributeRows.length > 0 && (
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {uniqueAttributeRows.slice(0, 8).map((row) => (
                  <div key={`${row.key}-${row.value}`} className="flex justify-between rounded-xl border border-[var(--sf-border)] px-3 py-2">
                    <dt className="text-[var(--sf-secondary)]">{row.key}</dt>
                    <dd className="font-semibold">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <aside className="rounded-2xl border border-[var(--sf-accent)]/20 bg-[var(--sf-accent)]/10 p-5 shadow-sm">
            <h2 className="font-display text-xl font-bold">Quick FAQ</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-semibold">Can I customize this?</p>
                <p className="text-[var(--sf-secondary)]">Add names, themes, dates, or notes in the order panel.</p>
              </div>
              <div>
                <p className="font-semibold">Can I pick up?</p>
                <p className="text-[var(--sf-secondary)]">Choose pickup or delivery before adding the item to your bag.</p>
              </div>
              <div>
                <p className="font-semibold">Is stock live?</p>
                <p className="text-[var(--sf-secondary)]">Availability is connected to the store inventory and confirmed at checkout.</p>
              </div>
            </div>
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <section className="border-y border-[var(--sf-border)] bg-[var(--sf-muted)]/30">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--sf-accent)]">Complete the setup</p>
                  <h2 className="mt-1 font-display text-2xl font-black">You may also like</h2>
                </div>
                <Link href="/shop#catalog" className="text-sm font-bold text-[var(--sf-accent)] hover:underline">
                  Browse all
                </Link>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    className="group rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--sf-accent)]"
                  >
                    <div className="overflow-hidden rounded-2xl bg-[var(--sf-background)]">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="aspect-square w-full object-contain p-4 transition group-hover:scale-105" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-xs text-[var(--sf-secondary)]">No image</div>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-bold">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--sf-secondary)]">{item.category || 'Related item'}</p>
                    <p className="mt-2 font-display text-lg font-black text-[var(--sf-accent)]">
                      LKR {item.salePrice.toLocaleString('en-LK')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <ProductReviews productId={product.id} />
        </div>
      </main>
    </StorefrontShell>
  );
}
