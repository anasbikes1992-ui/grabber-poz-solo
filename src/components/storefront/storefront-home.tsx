'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function StorefrontHome({ cms }: { cms: StorefrontConfig }) {
  const hero = cms.blocks.find((b) => b.type === 'HERO');
  const announcement = cms.blocks.find((b) => b.type === 'ANNOUNCEMENT');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/auth/shopper');
    const data = (await res.json()) as { authenticated?: boolean; customer?: Shopper };
    setShopper(data.authenticated && data.customer ? data.customer : null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [catRes] = await Promise.all([fetch('/api/pos/catalog'), refreshSession()]);
        if (!catRes.ok) throw new Error('Catalog unavailable');
        const data = (await catRes.json()) as { items?: CatalogItem[]; branchId?: string };
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
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#ffffff_100%)] text-slate-900"
      style={{ ['--store-primary' as string]: cms.theme.primaryColor }}
    >
      {announcement?.type === 'ANNOUNCEMENT' && (
        <div className="bg-emerald-700 text-white text-center text-xs font-semibold py-2 px-4">
          {announcement.text}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex">
            <BrandLogo size="md" showTagline={false} showSoloBadge={false} />
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="Store">
            {shopper ? (
              <>
                <Link
                  href="/shop/account"
                  className="rounded-full px-3 py-1.5 font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  Hi, {shopper.name.split(' ')[0]}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/shop/login"
                className="rounded-full bg-emerald-700 px-4 py-1.5 font-semibold text-white hover:bg-emerald-800"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/login?next=/app"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50"
            >
              Staff
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-emerald-900/5">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.12),transparent_50%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Online store</p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {hero?.type === 'HERO' ? hero.title : 'Shop Grabber'}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-600">
                {hero?.type === 'HERO' ? hero.subtitle : 'Browse live inventory and place COD orders online.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#catalog"
                  className="inline-flex rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
                >
                  Browse products
                </a>
                {!shopper && (
                  <Link
                    href="/shop/login"
                    className="inline-flex rounded-full border border-emerald-800/20 bg-white/80 px-6 py-3 text-sm font-semibold text-emerald-900 hover:bg-white"
                  >
                    Create account
                  </Link>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-emerald-900/10 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your bag</p>
              <p className="mt-2 font-display text-3xl font-bold text-emerald-900">{money(totals.subtotal)}</p>
              <p className="mt-1 text-sm text-slate-500">{totals.itemCount} item(s)</p>
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => void checkout()}
                className="mt-5 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {busy ? 'Loading…' : shopper ? 'Go to checkout' : 'Sign in to checkout'}
              </button>
              {msg && <p className="mt-3 text-sm text-emerald-800" role="status">{msg}</p>}
            </div>
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Catalog</h2>
              <p className="mt-1 text-sm text-slate-500">Live stock from your Grabber inventory.</p>
            </div>
            <label className="block w-full max-w-sm text-sm">
              <span className="sr-only">Search products</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm outline-none ring-emerald-500/30 focus:ring-2"
              />
            </label>
          </div>

          {loadErr && (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadErr}. Run seed / check DATABASE_URL for live products.
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {item.slug ? (
                      <Link href={`/products/${item.slug}`} className="hover:text-emerald-800 hover:underline">
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{item.variant || item.sku}</p>
                  <p className="mt-3 font-display text-xl font-bold text-emerald-800">
                    {money(Number(item.unitPrice))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={item.stock <= 0}
                  onClick={() => addToCart(item)}
                  className="mt-4 rounded-full bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  Add to bag
                </button>
                {item.slug && (
                  <Link
                    href={`/products/${item.slug}`}
                    className="mt-2 block text-center text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    View product page
                  </Link>
                )}
              </article>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Bag details</h3>
              <ul className="mt-4 space-y-3">
                {cart.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">{l.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border"
                        onClick={() => setQty(l.id, l.qty - 1)}
                        aria-label={`Decrease ${l.name}`}
                      >
                        −
                      </button>
                      <span className="w-6 text-center">{l.qty}</span>
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border"
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

      <footer className="border-t border-slate-200 bg-white/60 py-8 text-center text-sm text-slate-500">
        <p>
          Staff &amp; admin?{' '}
          <Link href="/login?next=/app" className="font-semibold text-emerald-800 hover:underline">
            Open backend login
          </Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Grabber Business OS</p>
      </footer>
    </div>
  );
}
