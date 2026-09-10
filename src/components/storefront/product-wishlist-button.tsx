'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

type Props = { productId: string };

export function ProductWishlistButton({ productId }: Props) {
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/storefront/wishlist');
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 401) {
          setNeedAuth(false);
          return;
        }
        if (data.success) {
          setWished((data.items || []).some((i: { productId: string }) => i.productId === productId));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function toggle() {
    setBusy(true);
    setNeedAuth(false);
    try {
      const res = await fetch('/api/storefront/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: 'toggle' }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setNeedAuth(true);
        return;
      }
      if (!data.success) throw new Error(data.error);
      setWished(Boolean(data.wished));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        aria-pressed={wished}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
          wished
            ? 'border-rose-300 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
        } disabled:opacity-50`}
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} aria-hidden />
        {wished ? 'Saved to wishlist' : 'Add to wishlist'}
      </button>
      {needAuth && (
        <p className="text-xs text-slate-600">
          <Link href="/shop/login" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>{' '}
          to save items.
        </p>
      )}
    </div>
  );
}
