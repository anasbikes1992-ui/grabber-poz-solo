'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import {
  StorefrontFeaturedSection,
  StorefrontFooterCta,
  StorefrontMidBlocks,
} from '@/components/storefront/storefront-blocks';
import type { StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { blocksForSlot } from '@/lib/config/storefront-config.shared';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { whatsappHref } from '@/lib/storefront/theme-vars';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CartFloatingBar } from '@/components/storefront/CartFloatingBar';

type CatalogItem = {
  id: string;
  productId: string;
  variantId?: string;
  slug?: string;
  name: string;
  sku: string;
  barcode: string | null;
  unitPrice: number;
  unitCost?: number;
  stock: number;
  variant?: string;
  taxRate?: number;
  imageUrl?: string | null;
  description?: string | null;
  category?: string;
  categoryId?: string | null;
};

type CartLine = CatalogItem & { qty: number; productId: string };

type Shopper = { id: string; name: string; phone: string | null; email: string | null };

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

const heroStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const gridStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export function StorefrontHome({ cms }: { cms: StorefrontConfig }) {
  const heroBlock = blocksForSlot(cms.blocks, 'HERO').find((b) => b.type === 'HERO');
  const hero = heroBlock?.type === 'HERO' ? heroBlock : undefined;
  const reduceMotion = useReducedMotion();
  const [verticalFlags, setVerticalFlags] = useState<VerticalFlags>(DEFAULT_VERTICAL_FLAGS);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'name_asc' | 'stock_desc'>('default');
  const [serverHits, setServerHits] = useState<Array<{ id: string; slug: string; name: string; sku: string; barcode: string | null; salePrice: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const motionProps = reduceMotion
    ? {}
    : { initial: 'hidden' as const, animate: 'show' as const, variants: heroStagger };

  const gridMotionProps = reduceMotion
    ? {}
    : { initial: 'hidden' as const, animate: 'show' as const, variants: gridStagger };

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/auth/shopper');
    const data = (await res.json()) as { authenticated?: boolean; customer?: Shopper };
    setShopper(data.authenticated && data.customer ? data.customer : null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [healthRes, catRes, pubRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/pos/catalog'),
          fetch('/api/storefront/public'),
          refreshSession(),
        ]);
        const pub = (await pubRes.json()) as { verticalFlags?: VerticalFlags };
        if (pub.verticalFlags) setVerticalFlags({ ...DEFAULT_VERTICAL_FLAGS, ...pub.verticalFlags });
        const health = (await healthRes.json()) as { db?: string };
        if (health.db === 'not_configured') {
          throw new Error('Database not connected on server — add DATABASE_URL on Vercel');
        }
        if (!catRes.ok) {
          const errBody = (await catRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error || 'Catalog unavailable');
        }
        const data = (await catRes.json()) as { items?: CatalogItem[]; branchId?: string };
        if (!data.items?.length) {
          setLoadErr('Store is connected but empty — run POST /api/seed once.');
        }
        setCatalog(data.items ?? []);
        setBranchId(data.branchId ?? null);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : 'Could not load store');
      }
    })();
  }, [refreshSession]);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setServerHits([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void fetch(`/api/storefront/search?q=${encodeURIComponent(needle)}`)
        .then((r) => r.json())
        .then((d) => setServerHits(d.products || []))
        .catch(() => setServerHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Derive categories list with counts
  const categoriesList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of catalog) {
      const cat = item.category || 'Uncategorized';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const list = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return [{ name: 'ALL', count: catalog.length }, ...list];
  }, [catalog]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list: CatalogItem[] = [];

    if (needle.length >= 2 && serverHits.length > 0) {
      list = serverHits.map((hit) => {
        const inCat = catalog.find((c) => c.slug === hit.slug || c.productId === hit.id);
        if (inCat) return inCat;
        return {
          id: hit.id,
          productId: hit.id,
          slug: hit.slug,
          name: hit.name,
          sku: hit.sku,
          barcode: hit.barcode,
          unitPrice: hit.salePrice,
          stock: 0,
          variant: hit.sku,
          category: 'Uncategorized',
        } satisfies CatalogItem;
      });
    } else if (needle) {
      list = catalog.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle) ||
          (p.barcode ?? '').toLowerCase().includes(needle) ||
          (p.category ?? '').toLowerCase().includes(needle),
      );
    } else {
      list = catalog;
    }

    // Filter by Category Pill
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => (p.category || 'Uncategorized') === selectedCategory);
    }

    // Sort
    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => Number(a.unitPrice) - Number(b.unitPrice));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => Number(b.unitPrice) - Number(a.unitPrice));
    } else if (sortBy === 'name_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stock_desc') {
      sorted.sort((a, b) => b.stock - a.stock);
    }

    return sorted;
  }, [catalog, q, serverHits, selectedCategory, sortBy]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + Number(l.unitPrice) * l.qty, 0);
    return { subtotal, itemCount: cart.reduce((s, l) => s + l.qty, 0) };
  }, [cart]);

  function persistBag(next: CartLine[]) {
    setCart(next);
    localStorage.setItem('grabber_store_bag', JSON.stringify(next));
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
  }, []);

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      const next = existing
        ? prev.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { ...item, productId: item.productId || item.id, qty: 1 }];
      persistBag(next);
      return next;
    });
    setMsg(null);
    setCartDrawerOpen(true);
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persistBag(next);
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = prev
        .map((l) => (l.id === id ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0);
      persistBag(next);
      return next;
    });
  }

  async function checkout() {
    if (!shopper) {
      setMsg('Sign in to place an online order.');
      return;
    }
    if (cart.length === 0) {
      setMsg('Your bag is empty.');
      return;
    }
    window.location.href = '/shop/checkout';
  }

  const waOrder = whatsappHref(cms.theme.whatsappNumber, 'Hi, I would like to place an order.');

  return (
    <StorefrontShell cms={cms} verticalFlags={verticalFlags} onOpenBag={() => setCartDrawerOpen(true)}>
      <div>
        <section className="storefront-hero relative overflow-hidden border-b border-[var(--sf-border)]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--sf-hero-gradient)' }}
            aria-hidden
          />
          {hero?.heroMediaType === 'video' && hero.heroMediaUrl && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40" aria-hidden>
              <video
                className="h-full w-full object-cover"
                src={hero.heroMediaUrl}
                poster={hero.heroMediaPosterUrl}
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          )}
          {hero?.heroMediaType === 'image' && hero.heroMediaUrl && (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${hero.heroMediaUrl})` }}
              aria-hidden
            />
          )}
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-20">
            <motion.div {...motionProps}>
              <motion.p
                variants={reduceMotion ? undefined : heroItem}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sf-accent)]"
              >
                Online store
              </motion.p>
              <motion.h1
                variants={reduceMotion ? undefined : heroItem}
                className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--sf-foreground)] sm:text-5xl"
              >
                {hero?.title || 'Shop Grabber'}
              </motion.h1>
              <motion.p
                variants={reduceMotion ? undefined : heroItem}
                className="mt-4 max-w-xl text-lg text-[var(--sf-secondary)]"
              >
                {hero?.subtitle || 'Browse live inventory and place COD orders online.'}
              </motion.p>
              <motion.div
                variants={reduceMotion ? undefined : heroItem}
                className="mt-8 flex flex-wrap gap-3"
              >
                <a
                  href="#catalog"
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-6 py-3 text-sm font-semibold text-[var(--sf-on-accent)] shadow-md transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                >
                  {hero?.ctaLabel || 'Browse products'}
                </a>
                {verticalFlags.repairs && (
                  <Link
                    href={hero?.secondaryCtaHref || '/shop/repairs'}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-repair)] bg-[var(--sf-repair-muted)] px-6 py-3 text-sm font-semibold text-[var(--sf-repair)] transition-colors duration-200 hover:bg-[var(--sf-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                  >
                    {hero?.secondaryCtaLabel || 'Device repairs'}
                  </Link>
                )}
                {waOrder && (
                  <a
                    href={waOrder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-6 py-3 text-sm font-semibold text-[var(--sf-primary)] transition-colors duration-200 hover:opacity-90"
                  >
                    WhatsApp order
                  </a>
                )}
                {!shopper && (
                  <Link
                    href="/shop/login"
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-6 py-3 text-sm font-semibold text-[var(--sf-primary)] transition-colors duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                  >
                    Create account
                  </Link>
                )}
              </motion.div>
            </motion.div>
            <motion.div
              variants={reduceMotion ? undefined : heroItem}
              initial={reduceMotion ? undefined : 'hidden'}
              animate={reduceMotion ? undefined : 'show'}
              className="storefront-hero-card rounded-3xl border border-[var(--sf-surface-border)] bg-[var(--sf-surface)] p-6 shadow-xl backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-secondary)]">Your bag</p>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--sf-accent)]/10 text-[var(--sf-accent)] text-xs font-bold font-mono">
                  {totals.itemCount} item(s)
                </span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-[var(--sf-primary)]">{money(totals.subtotal)}</p>
              <p className="mt-1 text-xs text-[var(--sf-secondary)]">Live prices & inventory synced</p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(true)}
                  className="w-full min-h-11 cursor-pointer rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] py-2.5 text-xs font-bold text-[var(--sf-primary)] hover:bg-[var(--sf-muted)] transition-colors"
                >
                  View Bag
                </button>
                <button
                  type="button"
                  disabled={busy || cart.length === 0}
                  onClick={() => void checkout()}
                  className="w-full min-h-11 cursor-pointer rounded-full bg-[var(--sf-primary)] py-2.5 text-xs font-bold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Loading…' : shopper ? 'Checkout' : 'Sign in'}
                </button>
              </div>
              {msg && (
                <p className="mt-3 text-sm text-[var(--sf-accent)]" role="status">
                  {msg}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        <StorefrontMidBlocks cms={cms} />

        <StorefrontFeaturedSection
          cms={cms}
          catalog={filtered}
          onAdd={(item) =>
            addToCart({
              ...item,
              productId: item.productId || item.id,
              sku: item.sku || item.id,
              barcode: item.barcode ?? null,
            })
          }
        />

        {/* MAIN CATALOG SECTION */}
        <section id="catalog" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-6">
            {/* Title & Live Search / Sort Bar */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--sf-foreground)]">Store Catalog</h2>
                <p className="mt-1 text-sm text-[var(--sf-secondary)]">
                  Live inventory synced from POS · {catalog.length} items available
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:max-w-xl">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name, SKU, category…"
                    className="w-full min-h-11 rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] pl-4 pr-10 py-2.5 text-sm shadow-sm outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[var(--sf-ring)]"
                  />
                  {q ? (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-3 top-3 text-xs font-bold text-[var(--sf-secondary)] hover:text-[var(--sf-foreground)]"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Sort products"
                  className="min-h-11 rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-3.5 py-2.5 text-xs font-semibold text-[var(--sf-foreground)] shadow-sm outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--sf-ring)]"
                >
                  <option value="default">Featured / Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="stock_desc">In Stock First</option>
                </select>
              </div>
            </div>

            {/* Category Navigation Pills */}
            {categoriesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[var(--sf-accent)] text-[var(--sf-on-accent)] shadow-md shadow-[var(--sf-accent)]/20 scale-105'
                          : 'bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[var(--sf-foreground)] hover:bg-[var(--sf-muted)] hover:border-[var(--sf-accent)]/40'
                      }`}
                    >
                      <span>{cat.name === 'ALL' ? 'All Products' : cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[var(--sf-muted)] text-[var(--sf-secondary)]'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loadErr && (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadErr}. Check <a href="/api/health" className="underline">/api/health</a> or seed demo data.
            </p>
          )}

          {/* Product Grid */}
          {filtered.length === 0 ? (
            <div className="mt-12 p-12 text-center rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-surface)] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--sf-muted)] mx-auto flex items-center justify-center text-lg">
                🔍
              </div>
              <h3 className="text-base font-bold text-[var(--sf-foreground)]">No matching products found</h3>
              <p className="text-xs text-[var(--sf-secondary)] max-w-sm mx-auto">
                We couldn&apos;t find anything matching &quot;{q}&quot; in category &quot;{selectedCategory}&quot;.
              </p>
              {(q || selectedCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setSelectedCategory('ALL');
                  }}
                  className="mt-2 inline-flex min-h-9 items-center px-4 py-1.5 rounded-full bg-[var(--sf-accent)] text-xs font-bold text-[var(--sf-on-accent)] shadow-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <motion.div
              {...gridMotionProps}
              className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filtered.map((item) => (
                <motion.article
                  key={item.id}
                  variants={reduceMotion ? undefined : gridItem}
                  className="group flex flex-col justify-between rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-surface)] overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:border-[var(--sf-accent)]/50 hover:-translate-y-1"
                >
                  <div>
                    {/* Image / Thumbnail Container */}
                    <div className="relative aspect-square w-full bg-[var(--sf-muted)]/50 overflow-hidden flex items-center justify-center border-b border-[var(--sf-border)]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-[var(--sf-secondary)] opacity-60">
                          <span className="text-3xl">🛍️</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {item.category || 'Product'}
                          </span>
                        </div>
                      )}

                      {/* Floating Category Badge */}
                      {item.category && item.category !== 'Uncategorized' && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold text-white tracking-wide shadow-sm">
                          {item.category}
                        </div>
                      )}

                      {/* Stock Badge */}
                      <div className="absolute top-3 right-3">
                        {item.stock > 3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold shadow-sm backdrop-blur">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            In Stock ({item.stock})
                          </span>
                        ) : item.stock > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-bold shadow-sm backdrop-blur">
                            Low Stock ({item.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/80 text-white text-[10px] font-bold shadow-sm backdrop-blur">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--sf-muted)] text-[var(--sf-secondary)] text-[10px] font-mono font-medium truncate">
                          {item.variant || item.sku}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[var(--sf-foreground)] line-clamp-2 min-h-10 group-hover:text-[var(--sf-accent)] transition-colors">
                        {item.slug ? (
                          <Link
                            href={`/products/${item.slug}`}
                            className="cursor-pointer hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h3>

                      <p className="font-display text-xl font-black text-[var(--sf-accent)]">
                        {money(Number(item.unitPrice))}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 space-y-2">
                    <button
                      type="button"
                      disabled={item.stock <= 0}
                      onClick={() => addToCart(item)}
                      className="w-full min-h-11 cursor-pointer rounded-2xl bg-[var(--sf-accent)] py-2.5 text-xs font-bold text-[var(--sf-on-accent)] shadow-sm transition-all duration-200 hover:opacity-95 transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {item.stock > 0 ? '+ Add to Bag' : 'Out of Stock'}
                    </button>
                    {item.slug && (
                      <Link
                        href={`/products/${item.slug}`}
                        className="block text-center text-xs font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-accent)] hover:underline"
                      >
                        View Details &rarr;
                      </Link>
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}

          {/* Slide-Over Cart Drawer & Floating Bag Bar */}
          <CartDrawer
            isOpen={cartDrawerOpen}
            onClose={() => setCartDrawerOpen(false)}
            items={cart}
            onUpdateQty={setQty}
            onRemoveItem={removeFromCart}
            whatsappPhone={cms.theme.whatsappNumber}
          />
          <CartFloatingBar
            itemCount={totals.itemCount}
            subtotal={totals.subtotal}
            onOpenDrawer={() => setCartDrawerOpen(true)}
          />
        </section>

        <StorefrontFooterCta cms={cms} />

        <footer className="border-t border-[var(--sf-border)] bg-[var(--sf-muted)]/40 py-8 text-center text-sm text-[var(--sf-secondary)]">
          <p>© {new Date().getFullYear()} Grabber Business OS</p>
        </footer>
      </div>
    </StorefrontShell>
  );
}
