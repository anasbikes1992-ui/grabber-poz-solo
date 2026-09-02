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
type PayMethod = 'COD' | 'PAYHERE';

export default function ShopCheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>('COD');
  const [payhereReady, setPayhereReady] = useState(false);
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
    fetch('/api/payments/payhere/init')
      .then((r) => r.json())
      .then((d) => setPayhereReady(Boolean(d.configured)));
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  useEffect(() => {
    if (!cart.length) {
      setAutoDiscount(0);
      return;
    }
    fetch('/api/promotions/evaluate-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtotal, itemCount, channel: 'STOREFRONT' }),
    })
      .then((r) => r.json())
      .then((d) => setAutoDiscount(d.autoApply?.discountTotal || 0))
      .catch(() => setAutoDiscount(0));
  }, [subtotal, itemCount, cart.length]);

  const estimatedTotal = useMemo(() => {
    const taxable = Math.max(0, subtotal - autoDiscount);
    return taxable + Math.round(taxable * 0.18 * 100) / 100;
  }, [subtotal, autoDiscount]);

  function submitPayHereForm(payhere: { checkoutUrl: string; fields: Record<string, string> }) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payhere.checkoutUrl;
    for (const [key, value] of Object.entries(payhere.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

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

      if (payMethod === 'PAYHERE') {
        const res = await fetch('/api/payments/payhere/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientUuid,
            promoCode: promoCode.trim() || undefined,
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
        if (!data.success) throw new Error(data.error || 'PayHere init failed');
        localStorage.removeItem('grabber_store_bag');
        setCart([]);
        if (data.payhere) submitPayHereForm(data.payhere);
        else setMsg(`Order ${data.orderNumber} created — PayHere stub (configure keys on Vercel).`);
        return;
      }

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
          <Link href="/" className="text-sm font-semibold text-emerald-800">
            ← Back to store
          </Link>
          <h1 className="font-bold">Checkout</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {!shopper && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <Link href="/shop/login" className="font-semibold text-emerald-800 underline">
              Sign in
            </Link>{' '}
            to place an order.
          </p>
        )}
        <ul className="space-y-3">
          {cart.map((l) => (
            <li key={l.id} className="flex justify-between rounded-xl border bg-white p-4 text-sm">
              <span>
                {l.qty}× {l.name}
              </span>
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
        {autoDiscount > 0 && (
          <p className="text-xs text-emerald-700">
            Auto discount applied: LKR {autoDiscount.toLocaleString()} (cart rule)
          </p>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Payment method</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPayMethod('COD')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                payMethod === 'COD' ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-200'
              }`}
            >
              Cash on Delivery
            </button>
            {payhereReady && (
              <button
                type="button"
                onClick={() => setPayMethod('PAYHERE')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                  payMethod === 'PAYHERE' ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-200'
                }`}
              >
                Pay online (PayHere)
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Estimated total</span>
          <span>LKR {estimatedTotal.toLocaleString()}</span>
        </div>
        <button
          type="button"
          disabled={busy || !cart.length}
          onClick={() => void placeOrder()}
          className="w-full rounded-full bg-emerald-700 py-3 text-white font-semibold disabled:opacity-40"
        >
          {busy ? 'Processing…' : payMethod === 'PAYHERE' ? 'Pay with PayHere' : 'Place COD order'}
        </button>
        {msg && (
          <p className="text-sm text-emerald-800" role="status">
            {msg}
          </p>
        )}
      </main>
    </div>
  );
}
