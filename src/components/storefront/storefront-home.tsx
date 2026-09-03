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
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalog;
    if (needle.length >= 2 && serverHits.length > 0) {
      return serverHits.map((hit) => {
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
        } satisfies CatalogItem;
      });
    }
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        (p.barcode ?? '').toLowerCase().includes(needle),
    );
  }, [catalog, q, serverHits]);

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
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
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

        <section id="catalog" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--sf-foreground)]">Catalog</h2>
              <p className="mt-1 text-sm text-[var(--sf-secondary)]">Live stock from your Grabber inventory.</p>
              {searching && q.trim().length >= 2 && (
                <p className="mt-1 text-xs text-[var(--sf-secondary)]">Searching catalog…</p>
              )}
            </div>
            <label className="block w-full max-w-sm text-sm">
              <span className="sr-only">Search products</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="w-full min-h-11 rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-surface)] px-4 py-2.5 shadow-sm outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[var(--sf-ring)]/30"
              />
            </label>
          </div>

          {loadErr && (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadErr}. Check <a href="/api/health" className="underline">/api/health</a> or seed demo data.
            </p>
          )}

          <motion.div
            {...gridMotionProps}
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <motion.article
                key={item.id}
                variants={reduceMotion ? undefined : gridItem}
                className="group flex flex-col justify-between rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-surface)] p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-[var(--sf-accent)]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--sf-muted)] text-[var(--sf-secondary)] text-[10px] font-mono font-medium">
                      {item.variant || item.sku}
                    </span>
                    {item.stock > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        In Stock ({item.stock})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Sold Out
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-[var(--sf-foreground)] group-hover:text-[var(--sf-accent)] transition-colors">
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

                  <p className="mt-3 font-display text-2xl font-black text-[var(--sf-accent)]">
                    {money(Number(item.unitPrice))}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    disabled={item.stock <= 0}
                    onClick={() => addToCart(item)}
                    className="w-full min-h-11 cursor-pointer rounded-2xl bg-[var(--sf-accent)] py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:opacity-95 transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
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
