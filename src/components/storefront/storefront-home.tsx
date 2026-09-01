'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { StorefrontConfig } from '@/lib/config/storefront-config';

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
  const hero = cms.blocks.find((b) => b.type === 'HERO');
  const announcement = cms.blocks.find((b) => b.type === 'ANNOUNCEMENT');
  const reduceMotion = useReducedMotion();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [q, setQ] = useState('');
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
        const [healthRes, catRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/pos/catalog'),
          refreshSession(),
        ]);
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        (p.barcode ?? '').toLowerCase().includes(needle),
    );
  }, [catalog, q]);

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

  async function signOut() {
    await fetch('/api/auth/shopper', { method: 'DELETE' });
    setShopper(null);
  }

  return (
    <div
      data-surface="storefront"
      className="storefront min-h-screen bg-[var(--sf-background)] text-[var(--sf-foreground)]"
      style={{ ['--store-primary' as string]: cms.theme.primaryColor }}
    >
      {announcement?.type === 'ANNOUNCEMENT' && (
        <div className="bg-[var(--sf-primary)] text-[var(--sf-on-primary)] text-center text-xs font-semibold py-2 px-4">
          {announcement.text}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-[var(--sf-border)] bg-[var(--sf-background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex cursor-pointer">
            <BrandLogo size="md" showTagline={false} showSoloBadge={false} />
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="Store">
            {shopper ? (
              <>
                <Link
                  href="/shop/account"
                  className="inline-flex min-h-11 items-center rounded-full px-3 py-1.5 font-medium text-[var(--sf-primary)] hover:bg-[var(--sf-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                >
                  Hi, {shopper.name.split(' ')[0]}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 py-1.5 text-[var(--sf-secondary)] hover:bg-[var(--sf-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/shop/login"
                className="inline-flex min-h-11 items-center rounded-full bg-[var(--sf-accent)] px-4 py-1.5 font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--sf-border)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(161,98,7,0.08),transparent_50%)]" />
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
                {hero?.type === 'HERO' ? hero.title : 'Shop Grabber'}
              </motion.h1>
              <motion.p
                variants={reduceMotion ? undefined : heroItem}
                className="mt-4 max-w-xl text-lg text-[var(--sf-secondary)]"
              >
                {hero?.type === 'HERO' ? hero.subtitle : 'Browse live inventory and place COD orders online.'}
              </motion.p>
              <motion.div
                variants={reduceMotion ? undefined : heroItem}
                className="mt-8 flex flex-wrap gap-3"
              >
                <a
                  href="#catalog"
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                >
                  Browse products
                </a>
                {!shopper && (
                  <Link
                    href="/shop/login"
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-white/80 px-6 py-3 text-sm font-semibold text-[var(--sf-primary)] transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
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
              className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-secondary)]">Your bag</p>
              <p className="mt-2 font-display text-3xl font-bold text-[var(--sf-primary)]">{money(totals.subtotal)}</p>
              <p className="mt-1 text-sm text-[var(--sf-secondary)]">{totals.itemCount} item(s)</p>
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => void checkout()}
                className="mt-5 w-full min-h-11 cursor-pointer rounded-full bg-[var(--sf-primary)] py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
              >
                {busy ? 'Loading…' : shopper ? 'Go to checkout' : 'Sign in to checkout'}
              </button>
              {msg && (
                <p className="mt-3 text-sm text-[var(--sf-accent)]" role="status">
                  {msg}
                </p>
              )}
            </motion.div>
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--sf-foreground)]">Catalog</h2>
              <p className="mt-1 text-sm text-[var(--sf-secondary)]">Live stock from your Grabber inventory.</p>
            </div>
            <label className="block w-full max-w-sm text-sm">
              <span className="sr-only">Search products</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="w-full min-h-11 rounded-2xl border border-[var(--sf-border)] bg-white px-4 py-2.5 shadow-sm outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[var(--sf-ring)]/30"
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
                className="flex flex-col justify-between rounded-3xl border border-[var(--sf-border)] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div>
                  <h3 className="font-semibold text-[var(--sf-foreground)]">
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}`}
                        className="cursor-pointer hover:text-[var(--sf-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--sf-secondary)]">{item.variant || item.sku}</p>
                  <p className="mt-3 font-display text-xl font-bold text-[var(--sf-accent)]">
                    {money(Number(item.unitPrice))}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sf-secondary)]">
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={item.stock <= 0}
                  onClick={() => addToCart(item)}
                  className="mt-4 min-h-11 cursor-pointer rounded-full bg-[var(--sf-accent)] py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                >
                  Add to bag
                </button>
                {item.slug && (
                  <Link
                    href={`/products/${item.slug}`}
                    className="mt-2 block cursor-pointer text-center text-xs font-semibold text-[var(--sf-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                  >
                    View product page
                  </Link>
                )}
              </motion.article>
            ))}
          </motion.div>

          {cart.length > 0 && (
            <div className="mt-10 rounded-3xl border border-[var(--sf-border)] bg-white p-5">
              <h3 className="font-semibold text-[var(--sf-foreground)]">Bag details</h3>
              <ul className="mt-4 space-y-3">
                {cart.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--sf-foreground)]">{l.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                        onClick={() => setQty(l.id, l.qty - 1)}
                        aria-label={`Decrease ${l.name}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{l.qty}</span>
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
                        onClick={() => setQty(l.id, l.qty + 1)}
                        aria-label={`Increase ${l.name}`}
                      >
                        +
                      </button>
                      <span className="w-24 text-right font-semibold">{money(Number(l.unitPrice) * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--sf-border)] bg-white/60 py-8 text-center text-sm text-[var(--sf-secondary)]">
        <p>© {new Date().getFullYear()} Grabber Business OS</p>
      </footer>
    </div>
  );
}
