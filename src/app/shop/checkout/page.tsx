'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type CartLine = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  unitCost?: number;
  qty: number;
};

type Shopper = { id: string; name: string };

export default function ShopCheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    fetch('/api/auth/shopper')
      .then((r) => r.json())
      .then((d) => setShopper(d.authenticated ? d.customer : null));
    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((d) => setBranchId(d.branchId || null));
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);

  async function placeOrder() {
    if (!shopper) {
      setMsg('Please sign in first.');
      return;
    }
    if (!cart.length) {
      setMsg('Your bag is empty.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const clientUuid = crypto.randomUUID?.() || `web_${Date.now()}`;
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'STOREFRONT',
          branchId,
          customerId: shopper.id,
          paymentMethod: 'COD',
          promoCode: promoCode.trim() || undefined,
          clientUuid,
          idempotencyKey: `web_${clientUuid}`,
          items: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            quantity: l.qty,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Checkout failed');
      localStorage.removeItem('grabber_store_bag');
      setCart([]);
      setMsg(`Order ${data.orderNumber || data.order?.orderNumber} placed. We'll prepare it for you.`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-emerald-800">← Back to store</Link>
          <h1 className="font-bold">Checkout</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {!shopper && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <Link href="/shop/login" className="font-semibold text-emerald-800 underline">Sign in</Link> to place a COD order.
          </p>
        )}
        <ul className="space-y-3">
          {cart.map((l) => (
            <li key={l.id} className="flex justify-between rounded-xl border bg-white p-4 text-sm">
              <span>{l.qty}× {l.name}</span>
              <span className="font-semibold">LKR {(l.unitPrice * l.qty).toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Promo code</label>
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border px-3 py-2 text-sm font-mono uppercase"
            placeholder="WELCOME500"
          />
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Subtotal</span>
          <span>LKR {subtotal.toLocaleString()}</span>
        </div>
        <p className="text-xs text-slate-500">Payment: Cash on Delivery (COD). VAT calculated at checkout.</p>
        <button
          type="button"
          disabled={busy || !cart.length}
          onClick={() => void placeOrder()}
          className="w-full rounded-full bg-emerald-700 py-3 text-white font-semibold disabled:opacity-40"
        >
          {busy ? 'Placing order…' : 'Place COD order'}
        </button>
        {msg && <p className="text-sm text-emerald-800" role="status">{msg}</p>}
      </main>
    </div>
  );
}
