'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  BookOpen,
  CheckCircle2,
  Printer,
  Lock,
  Percent,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { ESCPOSPrinterController } from '@/lib/hardware/printer';
import { BarcodeScannerListener } from '@/lib/hardware/scanner';
import {
  countPendingCheckouts,
  enqueueCheckout,
  flushPendingCheckouts,
  getTerminalId,
  nextClientSequence,
} from '@/lib/pos/offline-queue';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variant: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  taxRate: number;
}

type CatalogItem = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variant: string;
  unitPrice: number;
  unitCost: number;
  barcode: string;
  stock: number;
};

type HeldSale = {
  id: string;
  orderNumber: string;
  grandTotal: string | number;
  itemCount: number;
  createdAt: string;
};

const FALLBACK_CATALOG: CatalogItem[] = [
  { id: 'prod_1', productId: 'prod_1', name: 'Linen Casual Shirt', variant: 'Size L / Blue', unitPrice: 4500.0, unitCost: 2500.0, barcode: '8901234567890', stock: 31 },
  { id: 'prod_2', productId: 'prod_2', name: 'Oxford Button-Down', variant: 'Size M / White', unitPrice: 5200.0, unitCost: 2800.0, barcode: '8901234567891', stock: 18 },
  { id: 'prod_3', productId: 'prod_3', name: 'Stretch Chino Trousers', variant: '32 / Khaki', unitPrice: 6500.0, unitCost: 3400.0, barcode: '8901234567892', stock: 24 },
  { id: 'prod_4', productId: 'prod_4', name: 'Pique Cotton Polo', variant: 'Size XL / Navy', unitPrice: 3800.0, unitCost: 1900.0, barcode: '8901234567893', stock: 12 },
];

export default function POSPage() {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const clientUuidRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cuid_${Date.now()}`
  );
  const [catalog, setCatalog] = useState<CatalogItem[]>(FALLBACK_CATALOG);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isFlushingOffline, setIsFlushingOffline] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<'CASH' | 'CARD' | 'CREDIT' | 'SPLIT'>('CASH');
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<{ type: 'DISCOUNT' | 'VOID' | 'CREDIT'; payload?: any } | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.items?.length) {
          setCatalog(
            data.items.map((i: any) => ({
              id: i.id,
              productId: i.productId || i.id,
              variantId: i.variantId,
              name: i.name,
              variant: i.variant || i.sku,
              unitPrice: Number(i.unitPrice),
              unitCost: Number(i.unitCost),
              barcode: i.barcode || i.sku,
              stock: Number(i.stock || 0),
            }))
          );
          if (data.branchId) setBranchId(data.branchId);
        }
      })
      .catch(() => undefined);

    fetch('/api/shifts')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && (data.openShift?.id || data.shifts?.[0]?.id)) {
          setActiveShiftId(data.openShift?.id || data.shifts[0].id);
        }
      })
      .catch(() => undefined);

    countPendingCheckouts()
      .then(setPendingOfflineCount)
      .catch(() => undefined);

    flushPendingCheckouts()
      .then((r) => {
        setPendingOfflineCount(r.remaining);
        if (r.flushed > 0) {
          setAnnouncement(`Synced ${r.flushed} offline sale(s) to server.`);
        }
      })
      .catch(() => undefined);

    const onOnline = () => {
      flushPendingCheckouts()
        .then((r) => {
          setPendingOfflineCount(r.remaining);
          if (r.flushed > 0) setAnnouncement(`Back online — synced ${r.flushed} sale(s).`);
        })
        .catch(() => undefined);
    };
    window.addEventListener('online', onOnline);

    const loadHolds = () => {
      fetch('/api/pos/holds')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setHeldSales(data.holds || []);
        })
        .catch(() => undefined);
    };
    loadHolds();

    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    const listener = new BarcodeScannerListener((code) => {
      const found = catalog.find((i) => i.barcode === code);
      if (found) {
        addToCart(found);
      } else {
        setAnnouncement(`Unknown barcode ${code}`);
      }
    });
    listener.attach();
    return () => listener.detach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const grossSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = (grossSubtotal * discountPercent) / 100;
  const netSubtotal = grossSubtotal - discountAmount;
  const taxTotal = Math.round(netSubtotal * 0.18 * 100) / 100;
  const grandTotal = netSubtotal + taxTotal;

  const addToCart = (item: CatalogItem) => {
    setAnnouncement(`${item.name}, ${item.variant}, LKR ${item.unitPrice.toFixed(2)}, added to sale.`);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          variant: item.variant,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          quantity: 1,
          taxRate: 18,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      if (target) {
        const updated = next.find((i) => i.id === id);
        if (!updated) setAnnouncement(`${target.name} removed from sale.`);
        else setAnnouncement(`${target.name}, quantity ${updated.quantity}.`);
      }
      return next;
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    const found = catalog.find((i) => i.barcode === code);
    if (found) {
      addToCart(found);
    } else {
      setAnnouncement(code ? `No product found for barcode ${code}.` : 'Enter a barcode to scan.');
    }
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const requestDiscount = (pct: number) => {
    if (pct > 15) {
      setPinAction({ type: 'DISCOUNT', payload: pct });
      setEnteredPin('');
      setPinError(false);
      setIsPinModalOpen(true);
    } else {
      setDiscountPercent(pct);
    }
  };

  const requestVoidCart = () => {
    setPinAction({ type: 'VOID' });
    setEnteredPin('');
    setPinError(false);
    setIsPinModalOpen(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default Manager PIN is 1234
    if (enteredPin === '1234') {
      if (pinAction?.type === 'DISCOUNT') {
        setDiscountPercent(pinAction.payload);
      } else if (pinAction?.type === 'VOID') {
        setCart([]);
        setDiscountPercent(0);
        setActiveHoldId(null);
      }
      setIsPinModalOpen(false);
      setPinAction(null);
    } else {
      setPinError(true);
    }
  };

  const refreshHeldSales = async () => {
    const res = await fetch('/api/pos/holds');
    const data = await res.json();
    if (data.success) setHeldSales(data.holds || []);
  };

  const handleHoldSale = async () => {
    if (!branchId || cart.length === 0) return;
    try {
      const res = await fetch('/api/pos/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          shiftId: activeShiftId,
          discountTotal: discountAmount,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            name: c.name,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            unitCost: c.unitCost,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Hold failed');
      setCart([]);
      setDiscountPercent(0);
      setPromoCode('');
      setActiveHoldId(null);
      setAnnouncement(`Sale held as ${data.hold?.orderNumber || 'draft'}.`);
      await refreshHeldSales();
    } catch (err) {
      setAnnouncement((err as Error).message);
    }
  };

  const handleResumeHold = async (holdId: string) => {
    try {
      const res = await fetch(`/api/pos/holds?id=${encodeURIComponent(holdId)}`);
      const data = await res.json();
      if (!data.success || !data.hold) throw new Error(data.error || 'Hold not found');

      const { order, lines } = data.hold;
      const subtotal = Number(order.subtotal || 0);
      const discountTotal = Number(order.discountTotal || 0);
      const restored: CartItem[] = lines.map((line: any) => ({
        id: line.variantId || line.productId,
        productId: line.productId,
        variantId: line.variantId || undefined,
        name: line.name || 'Product',
        variant: line.variantLabel || 'Standard',
        unitPrice: Number(line.unitPrice),
        unitCost: Number(line.unitCost),
        quantity: line.quantity,
        taxRate: 18,
      }));

      setCart(restored);
      setDiscountPercent(subtotal > 0 ? Math.round((discountTotal / subtotal) * 100) : 0);
      setActiveHoldId(holdId);
      setIsHoldModalOpen(false);
      setAnnouncement(`Resumed hold ${order.orderNumber}. Complete sale to finalize.`);
    } catch (err) {
      setAnnouncement((err as Error).message);
    }
  };

  const handleFlushOffline = async () => {
    setIsFlushingOffline(true);
    try {
      const r = await flushPendingCheckouts();
      setPendingOfflineCount(r.remaining);
      if (r.flushed > 0) {
        setAnnouncement(`Flushed ${r.flushed} offline sale(s).`);
      } else if (r.failed > 0) {
        setAnnouncement(`Flush failed for ${r.failed} sale(s). Still offline or server error.`);
      } else {
        setAnnouncement('No offline sales to flush.');
      }
    } catch {
      setAnnouncement('Offline flush unavailable in this browser.');
    } finally {
      setIsFlushingOffline(false);
    }
  };

  const handleCompleteSale = async () => {
    setCheckoutError(null);
    setIsCheckingOut(true);
    const orderNumber = `POS-${Date.now().toString().slice(-6)}`;
    const orderData = {
      orderNumber,
      items: [...cart],
      grossSubtotal,
      discountAmount,
      discountPercent,
      taxTotal,
      grandTotal,
      tender: selectedTender,
      timestamp: new Date(),
    };

    const checkoutPayload: Record<string, unknown> = {
      channel: 'POS',
      branchId,
      fulfillmentLocationId: branchId,
      shiftId: activeShiftId || undefined,
      items: cart.map((c) => ({
        productId: c.productId,
        variantId: c.variantId,
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        unitCost: c.unitCost,
      })),
      paymentMethod: selectedTender,
      amount: grandTotal,
      discountTotal: discountAmount,
      clientUuid: clientUuidRef.current,
      idempotencyKey: `pos_${clientUuidRef.current}`,
      terminalId: getTerminalId(),
      clientSequence: nextClientSequence(),
      orderNumber,
    };

    if (selectedTender === 'SPLIT') {
      checkoutPayload.payments = [
        { method: 'CASH', amount: splitCash },
        { method: 'CARD', amount: splitCard },
      ];
    }

    if (promoCode.trim()) {
      checkoutPayload.promoCode = promoCode.trim();
    }

    try {
      if (!branchId || cart.some((c) => String(c.productId).startsWith('prod_'))) {
        throw new Error('Run POST /api/seed first so catalog products have real UUIDs + branchId.');
      }
      let res: Response;
      try {
        res = await fetch('/api/pos/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkoutPayload),
        });
      } catch {
        await enqueueCheckout(checkoutPayload);
        const n = await countPendingCheckouts();
        setPendingOfflineCount(n);
        setCheckoutError('Network error — sale queued offline. Will retry on reconnect.');
        setAnnouncement(`Sale queued offline (${n} pending).`);
        setIsPaymentModalOpen(false);
        setCart([]);
        setDiscountPercent(0);
        clientUuidRef.current =
          typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cuid_${Date.now()}`;
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Checkout failed');

      try {
        ESCPOSPrinterController.generateReceiptBuffer({
          storeName: 'Grabber Store',
          branchName: 'Main Counter',
          billNumber: data.order?.orderNumber || orderNumber,
          cashierName: 'Cashier',
          date: new Date().toLocaleString(),
          items: cart.map((c) => ({
            name: c.name,
            qty: c.quantity,
            unitPrice: c.unitPrice,
            totalPrice: c.unitPrice * c.quantity,
          })),
          subtotal: grossSubtotal,
          vatAmount: taxTotal,
          grandTotal,
          tenderMethod: selectedTender,
          amountPaid: grandTotal,
          changeDue: 0,
        });
        ESCPOSPrinterController.printBrowserReceipt({
          storeName: 'Grabber Store',
          branchName: 'Main',
          billNumber: orderNumber,
          cashierName: 'Cashier',
          date: new Date().toLocaleString(),
          items: cart.map((c) => ({
            name: c.name,
            qty: c.quantity,
            unitPrice: c.unitPrice,
            totalPrice: c.unitPrice * c.quantity,
          })),
          subtotal: grossSubtotal,
          vatAmount: taxTotal,
          grandTotal,
          tenderMethod: selectedTender,
          amountPaid: grandTotal,
          changeDue: 0,
        });
      } catch {
        /* optional hardware */
      }

      setCompletedOrder(orderData);
      setIsPaymentModalOpen(false);
      setCart([]);
      setDiscountPercent(0);
      setPromoCode('');
      if (activeHoldId) {
        await fetch(`/api/pos/holds?id=${encodeURIComponent(activeHoldId)}`, { method: 'DELETE' });
        setActiveHoldId(null);
        await refreshHeldSales();
      }
      clientUuidRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cuid_${Date.now()}`;
      setAnnouncement(`Sale completed. Total LKR ${grandTotal.toFixed(2)}. Tender ${selectedTender}.`);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Checkout failed';
      setCheckoutError(msg);
      setAnnouncement(msg);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <h1 className="sr-only">Counter POS</h1>

      {/* Left 7 Cols: Catalog & Barcode Scanner */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Search & Scanner Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="pos-search" className="sr-only">
              Search products by name or SKU
            </label>
            <input
              id="pos-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground placeholder:text-zinc-500"
            />
          </div>

          <form onSubmit={handleBarcodeSubmit} className="relative w-48">
            <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="pos-barcode" className="sr-only">
              Scan or enter barcode
            </label>
            <input
              id="pos-barcode"
              ref={barcodeRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-barcode-listener="true"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground placeholder:text-zinc-500 glow-border-emerald"
            />
          </form>
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
          {catalog.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addToCart(item)}
              className="p-3.5 rounded-2xl glass-card glass-card-hover text-left flex flex-col justify-between group"
            >
              <div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    item.stock < 15
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Stock: {item.stock}
                </span>
                <h3 className="font-semibold text-xs text-foreground mt-2 group-hover:text-emerald-400 transition-colors duration-200">
                  {item.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">{item.variant}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="font-bold text-xs text-foreground tabular-nums">
                  LKR {item.unitPrice.toFixed(2)}
                </span>
                <span
                  className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm"
                  aria-hidden="true"
                >
                  +
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right 5 Cols: Cart & Checkout Summary */}
      <div className="lg:col-span-5 flex flex-col rounded-2xl glass-card glow-border-emerald p-4 h-full">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="font-bold text-sm text-foreground">Current Sale</h2>
            <p className="text-[11px] text-muted-foreground">Colombo Main Counter · Reg-01</p>
          </div>
          <div className="flex items-center gap-2">
            {heldSales.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHoldModalOpen(true)}
                className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold cursor-pointer min-h-[44px] flex items-center gap-1"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {heldSales.length} held
              </button>
            )}
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={handleFlushOffline}
                disabled={isFlushingOffline}
                className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold cursor-pointer min-h-[44px]"
              >
                {isFlushingOffline ? 'Syncing…' : `Flush ${pendingOfflineCount} offline`}
              </button>
            )}
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => void handleHoldSale()}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer min-h-[44px]"
            >
              <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hold Sale</span>
            </button>
          )}
          {cart.length > 0 && (
            <button
              type="button"
              onClick={requestVoidCart}
              className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium cursor-pointer min-h-[44px]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Void Sale (PIN)</span>
            </button>
          )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <Barcode className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-xs">Scan an item or select from catalog</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.variant} &bull; LKR {item.unitPrice.toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="h-11 w-11 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs" aria-label={`Quantity ${item.quantity}`}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="h-11 w-11 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="font-bold w-16 text-right text-foreground">
                    LKR {(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals, Discount Selector & Checkout Button */}
        <div className="pt-3 border-t border-border space-y-2 text-xs">
          {/* Quick Discount Presets */}
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /> Discount:
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label="Discount percent">
              {[0, 5, 10, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  role="radio"
                  aria-checked={discountPercent === pct}
                  aria-label={
                    pct === 0
                      ? 'No discount'
                      : `${pct}% discount${pct > 15 ? ', requires manager PIN' : ''}`
                  }
                  onClick={() => requestDiscount(pct)}
                  className={`min-h-[44px] min-w-[44px] px-2 rounded-lg text-[11px] font-bold border transition-all duration-200 ease-expo cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-glow-em'
                      : 'bg-zinc-900 text-foreground border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {pct === 0 ? '0%' : `${pct}%`}
                  {pct > 15 ? (
                    <Lock className="inline h-3 w-3 ml-0.5" aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Gross Subtotal</span>
            <span>LKR {grossSubtotal.toFixed(2)}</span>
          </div>

          {discountPercent > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Discount ({discountPercent}%)</span>
              <span>- LKR {discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-muted-foreground">
            <span>VAT (18%)</span>
            <span>LKR {taxTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-white/10">
            <span>Grand Total</span>
            <span className="text-emerald-400 text-base tabular-nums">LKR {grandTotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full mt-2 min-h-12 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-em hover:bg-emerald-400 transition-all duration-200 ease-expo btn-press disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <span>Proceed to Payment</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">LKR {grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title="Manager PIN Required"
        as="form"
        onSubmit={handleVerifyPin}
        className="max-w-xs"
      >
        <div className="flex items-center gap-1.5 font-bold text-destructive -mt-1">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Security gate</span>
        </div>

        <p className="text-muted-foreground text-[11px]">
          {pinAction?.type === 'DISCOUNT' &&
            `Authorizing high discount (${pinAction.payload}% > 15% threshold).`}
          {pinAction?.type === 'VOID' && 'Authorizing cart void & cancellation.'}
        </p>

        <div>
          <label htmlFor="manager-pin" className="text-muted-foreground block mb-1 font-medium">
            Enter 4-Digit Manager PIN
          </label>
          <input
            id="manager-pin"
            type="password"
            maxLength={4}
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={enteredPin}
            onChange={(e) => {
              setEnteredPin(e.target.value);
              setPinError(false);
            }}
            placeholder="••••"
            aria-invalid={pinError}
            aria-describedby={pinError ? 'pin-error' : undefined}
            className="w-full text-center tracking-[0.5em] text-xl font-bold py-2 rounded-xl bg-secondary border border-border text-foreground"
          />
          {pinError && (
            <p id="pin-error" role="alert" className="text-destructive font-bold text-[10px] mt-1 text-center">
              Invalid Manager PIN
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full min-h-11 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press"
        >
          Authorize Action
        </button>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Select Payment Tender"
        className="max-w-md"
      >
        <div className="text-center py-2 bg-secondary/50 rounded-xl border border-border/40">
          <p className="text-xs text-muted-foreground">Total Amount Due</p>
          <p className="text-2xl font-bold text-primary">LKR {grandTotal.toFixed(2)}</p>
        </div>

        <fieldset className="grid grid-cols-2 gap-2.5 border-0 p-0 m-0" role="radiogroup" aria-label="Select payment tender">
          <legend className="sr-only">Select payment tender</legend>
          {(
            [
              { id: 'CASH' as const, label: 'Cash Tender', Icon: Banknote },
              { id: 'CARD' as const, label: 'Card Terminal', Icon: CreditCard },
              { id: 'CREDIT' as const, label: 'Polim Potha (AR)', Icon: BookOpen },
              { id: 'SPLIT' as const, label: 'Split Payment', Icon: Banknote },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selectedTender === id}
              onClick={() => {
                setSelectedTender(id);
                if (id === 'SPLIT') {
                  const half = Math.round((grandTotal / 2) * 100) / 100;
                  setSplitCash(half);
                  setSplitCard(Math.round((grandTotal - half) * 100) / 100);
                }
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all duration-200 cursor-pointer min-h-[44px] ${
                selectedTender === id
                  ? 'border-emerald-400 border-2 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 hover:bg-zinc-900'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </fieldset>

        {selectedTender === 'SPLIT' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Cash amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={splitCash}
                onChange={(e) => setSplitCash(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Card amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={splitCard}
                onChange={(e) => setSplitCard(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border"
              />
            </div>
            {Math.abs(splitCash + splitCard - grandTotal) > 0.01 && (
              <p role="alert" className="col-span-2 text-[10px] text-destructive">
                Split total must equal LKR {grandTotal.toFixed(2)}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">Promo code (optional)</label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="e.g. WELCOME500"
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono text-xs uppercase"
          />
        </div>

        {checkoutError && (
          <p role="alert" className="text-[11px] text-destructive font-medium">
            {checkoutError}
          </p>
        )}
        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={isCheckingOut || (selectedTender === 'SPLIT' && Math.abs(splitCash + splitCard - grandTotal) > 0.01)}
          className="w-full min-h-12 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-glow-em hover:bg-emerald-400 transition-all duration-200 btn-press cursor-pointer disabled:opacity-50"
        >
          {isCheckingOut ? 'Processing…' : 'Complete Sale & Print Thermal Bill'}
        </button>
      </Modal>

      <Modal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        title="Held Sales"
        className="max-w-md"
      >
        <div className="space-y-2 text-xs">
          {heldSales.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No held sales.</p>
          ) : (
            heldSales.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl border border-border flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-foreground">{h.orderNumber}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {h.itemCount} items · {new Date(h.createdAt).toLocaleString('en-LK')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary tabular-nums">
                    LKR {Number(h.grandTotal).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleResumeHold(h.id)}
                    className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold"
                  >
                    Resume
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!completedOrder}
        onClose={() => setCompletedOrder(null)}
        title="Sale Completed Successfully"
        className="max-w-sm"
      >
        {completedOrder && (
          <>
            <div className="text-center space-y-1 pb-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" aria-hidden="true" />
              <p className="font-mono text-[10px] text-muted-foreground">{completedOrder.orderNumber}</p>
            </div>

            <div className="p-4 bg-secondary/60 rounded-xl font-mono text-[11px] space-y-2 border border-border/40">
              <div className="text-center border-b border-border/50 pb-2">
                <p className="font-bold text-xs text-foreground">GRABBER FLAGSHIP STORE</p>
                <p className="text-[10px] text-muted-foreground">123 Galle Road, Colombo 03</p>
                <p className="text-[10px] text-muted-foreground">VAT: VAT-987654321-7000</p>
              </div>

              <div className="space-y-1 py-1">
                {completedOrder.items.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate pr-2">
                      {item.quantity}x {item.name}
                    </span>
                    <span>LKR {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-2 space-y-1 font-semibold">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>LKR {completedOrder.grossSubtotal.toFixed(2)}</span>
                </div>
                {completedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({completedOrder.discountPercent}%)</span>
                    <span>- LKR {completedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (18%)</span>
                  <span>LKR {completedOrder.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-foreground font-bold text-xs pt-1 border-t border-border">
                  <span>TOTAL PAID</span>
                  <span className="text-primary">LKR {completedOrder.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Tender</span>
                  <span>{completedOrder.tender}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold"
              >
                New Sale
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setCompletedOrder(null);
                }}
                className="flex-1 min-h-11 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-400 cursor-pointer btn-press"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Print Bill</span>
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
