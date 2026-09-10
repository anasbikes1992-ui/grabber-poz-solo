'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Tag,
  MapPin,
  Phone,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

type CartLine = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  unitCost?: number;
  qty: number;
};

type Shopper = { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null };
type PayMethod = 'COD' | 'PAYHERE';

export default function ShopCheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>('COD');
  const [payhereReady, setPayhereReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNumber: string;
    grandTotal: number;
    paymentMethod: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams(window.location.search);
    const recover = params.get('recover');
    if (recover) {
      fetch(`/api/storefront/abandon-cart?token=${encodeURIComponent(recover)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.cart?.length) {
            setCart(d.cart as CartLine[]);
            localStorage.setItem('grabber_store_bag', JSON.stringify(d.cart));
            if (d.promoCode) setPromoCode(d.promoCode);
          }
        })
        .catch(() => undefined);
    }

    fetch('/api/auth/shopper')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.customer) {
          setShopper(d.customer);
          setContactName(d.customer.name || '');
          const p = d.customer.phone || '';
          if (p && !p.startsWith('email:')) {
            setContactPhone(p);
          }
          if (d.customer.address) {
            setDeliveryAddress(d.customer.address);
          }
        }
      })
      .catch(() => undefined);

    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((d) => setBranchId(d.branchId || null))
      .catch(() => undefined);

    fetch('/api/payments/payhere/init')
      .then((r) => r.json())
      .then((d) => setPayhereReady(Boolean(d.configured)))
      .catch(() => undefined);
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

  // Cart abandonment tracking
  useEffect(() => {
    const phone = contactPhone.replace(/\D/g, '');
    if (!phone || phone.length < 9 || !cart.length) return;

    const timer = window.setTimeout(() => {
      void fetch('/api/storefront/abandon-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          customerId: shopper?.id,
          promoCode: 'COMEBACK5',
          cart: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            unitPrice: l.unitPrice,
            qty: l.qty,
          })),
        }),
      });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [contactPhone, cart, shopper?.id]);

  const taxAmount = useMemo(() => {
    const taxable = Math.max(0, subtotal - autoDiscount);
    return Math.round(taxable * 0.18 * 100) / 100;
  }, [subtotal, autoDiscount]);

  const estimatedTotal = useMemo(() => {
    const taxable = Math.max(0, subtotal - autoDiscount);
    return taxable + taxAmount;
  }, [subtotal, autoDiscount, taxAmount]);

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
      setErrorMsg('Please sign in first to complete your order.');
      return;
    }
    if (!cart.length) {
      setErrorMsg('Your shopping bag is empty.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.startsWith('email:')) {
      setErrorMsg('Please enter a valid mobile number for delivery updates.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
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
        if (!data.success) throw new Error(data.error || 'PayHere initialization failed');
        localStorage.removeItem('grabber_store_bag');
        setCart([]);
        if (data.payhere) {
          submitPayHereForm(data.payhere);
        } else {
          setPlacedOrder({
            orderNumber: data.orderNumber || 'WEB-PENDING',
            grandTotal: estimatedTotal,
            paymentMethod: 'PAYHERE',
          });
        }
        return;
      }

      let utmJson: Record<string, string> | undefined;
      let campaignId: string | undefined;
      try {
        const storedUtm = sessionStorage.getItem('grabber_utm');
        if (storedUtm) utmJson = JSON.parse(storedUtm);
        const storedCamp = sessionStorage.getItem('grabber_campaign_id');
        if (storedCamp) campaignId = storedCamp;
      } catch {
        /* ignore */
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
          campaignId,
          utmJson,
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryNotes: deliveryNotes.trim() || undefined,
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
      const orderNum = data.orderNumber || data.order?.orderNumber || 'WEB-CONFIRMED';
      setPlacedOrder({
        orderNumber: orderNum,
        grandTotal: estimatedTotal,
        paymentMethod: 'Cash on Delivery',
      });
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const copyOrderNumber = () => {
    if (!placedOrder) return;
    navigator.clipboard.writeText(placedOrder.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
          <BrandLogo size="sm" showTagline={false} showSoloBadge={false} />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">256-bit Encrypted Checkout</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Success Confirmation Card */}
        {placedOrder ? (
          <div role="status" tabIndex={-1} className="mx-auto max-w-xl text-center py-10 outline-none">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glow-em">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Order Placed Successfully
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Thank you for your order!
            </h1>
            <p className="mt-2 text-sm text-zinc-300 max-w-md mx-auto">
              We have received your order and our fulfillment team is preparing it for dispatch.
            </p>

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Order Reference</p>
                  <p className="font-mono text-lg font-bold text-emerald-400 mt-0.5">{placedOrder.orderNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={copyOrderNumber}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <span className="text-zinc-400 block">Payment Method</span>
                  <span className="font-semibold text-zinc-200 mt-0.5 block">{placedOrder.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Amount Due</span>
                  <span className="font-semibold text-zinc-200 mt-0.5 block">LKR {placedOrder.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/track/${placedOrder.orderNumber}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-all shadow-glow-em cursor-pointer"
              >
                <span>Live Order Tracking</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Return to Shop
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Quick Guest vs Login banner */}
            {!shopper && (
              <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <User className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Checking out as Guest. Have an account?</span>
                </div>
                <Link
                  href="/shop/login?next=/shop/checkout"
                  className="inline-flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Sign In
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form Details */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Contact & Delivery Info */}
                <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Customer & Delivery Information</h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="checkout-name" className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        Full Name <span className="text-rose-400" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="checkout-name"
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        aria-required="true"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. John Perera"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="checkout-phone" className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        WhatsApp / SMS Phone (for dispatch & courier OTP){' '}
                        <span className="text-rose-400" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        name="tel"
                        autoComplete="tel"
                        required
                        aria-required="true"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="07XXXXXXXX or +947XXXXXXXX"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                      <p id="checkout-phone-hint" className="mt-1 text-[10px] text-zinc-400">
                        Use 07XXXXXXXX or +947XXXXXXXX
                      </p>
                    </div>

                    <div>
                      <label htmlFor="checkout-address" className="text-[11px] font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-zinc-400" aria-hidden /> Delivery Address
                      </label>
                      <textarea
                        id="checkout-address"
                        name="street-address"
                        autoComplete="street-address"
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Street address, Apartment / Suite, City..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="checkout-notes" className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        Delivery Notes (Optional)
                      </label>
                      <input
                        id="checkout-notes"
                        type="text"
                        name="delivery-notes"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Ring bell or leave at security desk"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Payment Method */}
                <fieldset className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-5 space-y-4">
                  <legend className="sr-only">Payment Method</legend>
                  <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Payment Method</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={payMethod === 'COD'}
                      onClick={() => setPayMethod('COD')}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        payMethod === 'COD'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-glow-em'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${payMethod === 'COD' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-200">Cash on Delivery</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Pay in cash upon doorstep delivery</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={payMethod === 'PAYHERE'}
                      disabled={!payhereReady}
                      aria-disabled={!payhereReady}
                      onClick={() => {
                        if (payhereReady) setPayMethod('PAYHERE');
                      }}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        payMethod === 'PAYHERE'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-glow-em'
                          : !payhereReady
                          ? 'border-zinc-800/50 bg-zinc-950/30 opacity-60 cursor-not-allowed'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${payMethod === 'PAYHERE' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-zinc-200">Visa / Mastercard / Frimi</p>
                          {!payhereReady && <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Gateway off</span>}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Instant secure payment via PayHere</p>
                      </div>
                    </button>
                  </div>
                </fieldset>

                {/* 3. Promo Code */}
                <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-5 space-y-3">
                  <label htmlFor="checkout-promo" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-amber-400" aria-hidden /> Have a Coupon or Voucher Code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="checkout-promo"
                      name="promo-code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME500"
                      aria-describedby="checkout-promo-hint"
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-mono uppercase text-zinc-200 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPromoCode(promoCode.trim())}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p id="checkout-promo-hint" className="text-[10px] text-zinc-400">
                    Optional promo or voucher code
                  </p>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-5 space-y-4 sticky top-20">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-white">Order Summary</h2>
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">{itemCount} items</span>
                  </div>

                  {/* Cart Items List */}
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-zinc-800/40">
                    {cart.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">Your shopping bag is empty.</p>
                    ) : (
                      cart.map((l) => (
                        <div key={l.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="pr-3">
                            <p className="font-semibold text-zinc-200 line-clamp-1">{l.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Qty: {l.qty} × LKR {l.unitPrice.toLocaleString()}</p>
                          </div>
                          <span className="font-mono font-bold text-zinc-300 shrink-0">
                            LKR {(l.unitPrice * l.qty).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 border-t border-zinc-800/80 pt-3 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span className="font-mono text-zinc-200">LKR {subtotal.toLocaleString()}</span>
                    </div>

                    {autoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Promotion Discount
                        </span>
                        <span className="font-mono">- LKR {autoDiscount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-zinc-400">
                      <span>VAT (18% inclusive)</span>
                      <span className="font-mono text-zinc-300">LKR {taxAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-zinc-400">
                      <span>Standard Courier Delivery</span>
                      <span className="text-emerald-400 font-semibold">FREE</span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-zinc-800 pt-3 text-sm font-bold text-white">
                      <span>Total Amount</span>
                      <span className="text-base text-emerald-400 font-mono">
                        LKR {estimatedTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={busy || !cart.length}
                    onClick={() => void placeOrder()}
                    className="w-full min-h-12 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-em hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <span>{busy ? 'Processing Checkout...' : payMethod === 'PAYHERE' ? 'Proceed to Online Payment' : 'Confirm Cash on Delivery Order'}</span>
                  </button>

                  <p className="text-[10px] text-center text-zinc-500 pt-1">
                    By placing this order, you agree to our Terms of Service & Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
