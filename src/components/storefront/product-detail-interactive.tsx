'use client';

import { useMemo, useState, useEffect } from 'react';
import { ProductPurchasePanel, type PurchaseLine } from './product-purchase-panel';
import { ProductWishlistButton } from './product-wishlist-button';
import { storefrontStockLabel } from '@/lib/storefront/stock-label';

export type GalleryThumbnail = {
  url: string;
  label?: string;
  variantId?: string;
};

type Props = {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    imageUrl: string | null;
    description: string;
    stock: number;
    priceLabel: string;
  };
  purchaseLines: PurchaseLine[];
  relatedImages: string[];
  variantGroupEntries: [string, string[]][];
};

export function ProductDetailInteractive({
  product,
  purchaseLines,
  relatedImages,
  variantGroupEntries,
}: Props) {
  const initialLine = purchaseLines[0];
  const initialSelectedId = initialLine?.variantId || initialLine?.productId || '';
  const initialImage = initialLine?.imageUrl || product.imageUrl || relatedImages[0] || null;

  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [activeImage, setActiveImage] = useState<string | null>(initialImage);

  const selectedLine = useMemo(
    () => purchaseLines.find((l) => (l.variantId || l.productId) === selectedId) || purchaseLines[0],
    [purchaseLines, selectedId],
  );

  // Auto-switch hero image when selected variant changes
  const handleVariantSelect = (id: string) => {
    setSelectedId(id);
    const line = purchaseLines.find((l) => (l.variantId || l.productId) === id);
    if (line?.imageUrl) {
      setActiveImage(line.imageUrl);
    } else if (product.imageUrl) {
      setActiveImage(product.imageUrl);
    }
  };

  // Build unified thumbnail gallery list with variant links
  const galleryThumbnails = useMemo(() => {
    const list: GalleryThumbnail[] = [];
    const seenUrls = new Set<string>();

    if (product.imageUrl) {
      list.push({ url: product.imageUrl, label: 'Main' });
      seenUrls.add(product.imageUrl);
    }

    for (const line of purchaseLines) {
      if (line.imageUrl && !seenUrls.has(line.imageUrl)) {
        list.push({
          url: line.imageUrl,
          label: line.variantLabel,
          variantId: line.variantId || line.productId,
        });
        seenUrls.add(line.imageUrl);
      }
    }

    for (const img of relatedImages) {
      if (img && !seenUrls.has(img)) {
        list.push({ url: img, label: 'Gallery' });
        seenUrls.add(img);
      }
    }

    return list;
  }, [product.imageUrl, purchaseLines, relatedImages]);

  const activeThumbnail = galleryThumbnails.find((t) => t.url === activeImage);

  return (
    <section className="mx-auto grid max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.74fr)] lg:items-start lg:py-10">
      {/* Left Column: Interactive Image Gallery */}
      <div className="space-y-4">
        <div className="group relative overflow-hidden rounded-[1.5rem] border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-lg shadow-[var(--sf-primary)]/5 transition-all">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={selectedLine?.variantLabel ? `${product.name} - ${selectedLine.variantLabel}` : product.name}
              className="aspect-[4/3] max-h-[560px] w-full object-contain p-6 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-[var(--sf-muted)] text-center text-sm font-semibold text-[var(--sf-secondary)]">
              Product image coming soon
            </div>
          )}

          {/* Active Variant / Photo Tag Overlay */}
          {activeThumbnail?.label && activeThumbnail.label !== 'Main' && (
            <div className="absolute bottom-4 left-4 rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 px-3 py-1 text-xs font-semibold text-[var(--sf-foreground)] shadow-sm backdrop-blur">
              {activeThumbnail.label}
            </div>
          )}
        </div>

        {/* Thumbnail Selector Strip */}
        {galleryThumbnails.length > 1 && (
          <div className="flex flex-wrap gap-2.5">
            {galleryThumbnails.map((thumb, index) => {
              const isActive = thumb.url === activeImage;
              return (
                <button
                  key={`${thumb.url}-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveImage(thumb.url);
                    if (thumb.variantId) {
                      setSelectedId(thumb.variantId);
                    }
                  }}
                  className={`group relative h-20 w-20 overflow-hidden rounded-2xl border p-1.5 transition ${
                    isActive
                      ? 'border-[var(--sf-accent)] ring-2 ring-[var(--sf-accent)]/40 shadow-sm'
                      : 'border-[var(--sf-border)] bg-[var(--sf-surface)] opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb.url} alt="" className="h-full w-full object-contain" />
                  {thumb.label && (
                    <span className="sr-only">{thumb.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Title, Metadata, Dynamic Options & Purchase Panel */}
      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--sf-accent)]">
            {product.category || 'Catalog'}
          </p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--sf-foreground)] sm:text-4xl">
            {product.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--sf-secondary)]">{product.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[var(--sf-primary)] px-3 py-1.5 text-[var(--sf-on-primary)]">
              {selectedLine
                ? `LKR ${selectedLine.unitPrice.toLocaleString('en-LK')}`
                : product.priceLabel}
            </span>
            <span className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-1.5">
              {storefrontStockLabel(selectedLine ? selectedLine.stock : product.stock)}
            </span>
            <span className="rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3 py-1.5 font-mono">
              {selectedLine?.variantLabel || product.sku}
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
                    {values.map((value) => {
                      // Check if there's a variant matching this attribute value
                      const matchingLine = purchaseLines.find(
                        (l) => l.attributesJson && Object.values(l.attributesJson).includes(value),
                      );
                      const isOptionActive =
                        selectedLine?.attributesJson &&
                        Object.values(selectedLine.attributesJson).includes(value);

                      return (
                        <button
                          key={`${name}-${value}`}
                          type="button"
                          onClick={() => {
                            if (matchingLine) {
                              handleVariantSelect(matchingLine.variantId || matchingLine.productId);
                            }
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            isOptionActive
                              ? 'border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[var(--sf-on-accent)] shadow-sm'
                              : 'border-[var(--sf-border)] bg-[var(--sf-background)] text-[var(--sf-foreground)] hover:border-[var(--sf-accent)]'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <ProductPurchasePanel
          lines={purchaseLines}
          selectedId={selectedId}
          onSelectedIdChange={handleVariantSelect}
        />
        <ProductWishlistButton productId={product.id} />
      </div>
    </section>
  );
}
