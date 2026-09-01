'use client';

import Link from 'next/link';
import { MessageCircle, Wrench } from 'lucide-react';
import type { StorefrontBlock, StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { blocksForSlot } from '@/lib/config/storefront-config.shared';
import { whatsappHref } from '@/lib/storefront/theme-vars';

type FeaturedCatalogItem = {
  id: string;
  slug?: string;
  name: string;
  unitPrice: number;
  stock: number;
  variant?: string;
  productId?: string;
  sku?: string;
  barcode?: string | null;
};

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

function MidBannerBlock({ block }: { block: Extract<StorefrontBlock, { type: 'MID_BANNER' }> }) {
  return (
    <section className="border-y border-[var(--sf-border)] bg-[var(--sf-muted)]/50">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--sf-foreground)]">{block.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--sf-secondary)]">{block.body}</p>
        </div>
        {block.ctaHref && block.ctaLabel && (
          <Link
            href={block.ctaHref}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
          >
            {block.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

function VerticalPromoBlock({ block }: { block: Extract<StorefrontBlock, { type: 'VERTICAL_PROMO' }> }) {
  return (
    <section className="border-y border-[var(--sf-border)] bg-white/70">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-accent)]">{block.vertical}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-[var(--sf-foreground)]">{block.title}</h2>
          <p className="mt-2 text-sm text-[var(--sf-secondary)]">{block.body}</p>
        </div>
        <Link
          href={block.href}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--sf-repair)] bg-[var(--sf-repair-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--sf-repair)] transition-colors duration-200 hover:bg-white"
        >
          <Wrench className="h-4 w-4" aria-hidden />
          Learn more
        </Link>
      </div>
    </section>
  );
}

export function StorefrontMidBlocks({ cms }: { cms: StorefrontConfig }) {
  const midBlocks = blocksForSlot(cms.blocks, 'MID');
  if (!midBlocks.length) return null;
  return (
    <>
      {midBlocks.map((block) => {
        if (block.type === 'MID_BANNER') return <MidBannerBlock key={block.id} block={block} />;
        if (block.type === 'VERTICAL_PROMO') return <VerticalPromoBlock key={block.id} block={block} />;
        return null;
      })}
    </>
  );
}

export function StorefrontFeaturedSection({
  cms,
  catalog,
  onAdd,
}: {
  cms: StorefrontConfig;
  catalog: FeaturedCatalogItem[];
  onAdd: (item: FeaturedCatalogItem) => void;
}) {
  const featured = blocksForSlot(cms.blocks, 'PRE_CATALOG').find((b) => b.type === 'FEATURED');
  if (!featured || featured.type !== 'FEATURED') return null;

  const picks = featured.productSlugs.length
    ? catalog.filter((c) => c.slug && featured.productSlugs.includes(c.slug))
    : catalog.slice(0, 3);

  if (!picks.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="font-display text-2xl font-bold text-[var(--sf-foreground)]">{featured.title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {picks.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-[var(--sf-border)] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <h3 className="font-semibold text-[var(--sf-foreground)]">{item.name}</h3>
            <p className="mt-1 text-xs text-[var(--sf-secondary)]">{item.variant}</p>
            <p className="mt-3 font-display text-lg font-bold text-[var(--sf-accent)]">{money(Number(item.unitPrice))}</p>
            <button
              type="button"
              disabled={item.stock <= 0}
              onClick={() => onAdd(item)}
              className="mt-4 min-h-11 w-full cursor-pointer rounded-full bg-[var(--sf-primary)] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add to bag
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StorefrontFooterCta({ cms }: { cms: StorefrontConfig }) {
  const footer = blocksForSlot(cms.blocks, 'FOOTER').find((b) => b.type === 'FOOTER_CTA');
  if (!footer || footer.type !== 'FOOTER_CTA') return null;

  const wa = whatsappHref(cms.theme.whatsappNumber, 'Hi, I need help with my order.');

  return (
    <section className="border-t border-[var(--sf-border)] bg-[var(--sf-primary)] text-[var(--sf-on-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="font-display text-xl font-bold">{footer.title}</h2>
          <p className="mt-2 max-w-lg text-sm opacity-90">{footer.body}</p>
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--sf-primary)] transition-opacity duration-200 hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {footer.whatsappLabel || 'WhatsApp'}
          </a>
        )}
      </div>
    </section>
  );
}
