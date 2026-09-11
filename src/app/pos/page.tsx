'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  UtensilsCrossed,
  Wrench,
  RotateCcw,
  FileText,
  Scan,
  Store,
  Award,
  UserCheck,
  Sparkles,
  Mic,
  MicOff,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { TradeInModal, type TradeInCredit } from '@/components/pos/trade-in-modal';
import { ReturnExchangeModal, type ExchangeCredit } from '@/components/pos/return-exchange-modal';
import { ThermalReceipt } from '@/components/pos/thermal-receipt';
import { ESCPOSPrinterController } from '@/lib/hardware/printer';
import { BarcodeScannerListener } from '@/lib/hardware/scanner';
import { VoiceAssistant } from '@/lib/hardware/voice-assistant';
import { fetchVerticalFlags, DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import {
  RECEIPT_PAPER_PRESETS,
  type ReceiptPaperId,
  readReceiptPaperId,
  receiptPreset,
  writeReceiptPaperId,
} from '@/lib/print/paper-sizes';
import { runPrintJob } from '@/lib/print/run-print-job';
import {
  countPendingCheckouts,
  enqueueCheckout,
  flushPendingCheckouts,
  getTerminalId,
  nextClientSequence,
} from '@/lib/pos/offline-queue';
import { TableServicePanel } from '@/components/restaurant/table-service-panel';
import { convertFromLkr, formatCurrency, type CurrencyCode } from '@/lib/currency/fx-rates';

export interface LoyaltyMember {
  id: string;
  name: string;
  phone: string;
  points: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  totalSpent?: number;
}

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
  const searchParams = useSearchParams();
  const urlMode = searchParams.get('mode');
  const [promoCode, setPromoCode] = useState('');
  const [tradeInCredit, setTradeInCredit] = useState<TradeInCredit | null>(null);
  const [isTradeInModalOpen, setIsTradeInModalOpen] = useState(false);
  const [exchangeCredit, setExchangeCredit] = useState<ExchangeCredit | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [activeHoldId, setActiveHoldId] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [receiptPaper, setReceiptPaper] = useState<ReceiptPaperId>('THERMAL_80');
  const [verticalFlags, setVerticalFlags] = useState<VerticalFlags>(DEFAULT_VERTICAL_FLAGS);
  const [posMode, setPosMode] = useState<'RETAIL' | 'SCANNER' | 'TABLES'>('RETAIL');
  const [touristCurrency, setTouristCurrency] = useState<CurrencyCode>('LKR');
  const [loyaltyMember, setLoyaltyMember] = useState<LoyaltyMember | null>(null);
  const [loyaltyPhoneQuery, setLoyaltyPhoneQuery] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);
  const [isSearchingLoyalty, setIsSearchingLoyalty] = useState(false);
  const [loyaltyMessage, setLoyaltyMessage] = useState('');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<{ type: 'DISCOUNT' | 'VOID' | 'CREDIT' | 'OPEN_DRAWER'; payload?: any } | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [cashTenderInput, setCashTenderInput] = useState<number | ''>('');
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);

  const toggleVoiceSearch = () => {
    if (isVoiceSearchActive) {
      VoiceAssistant.stopListening();
      setIsVoiceSearchActive(false);
      return;
    }
    const started = VoiceAssistant.startListening({
      onStart: () => setIsVoiceSearchActive(true),
      onEnd: () => setIsVoiceSearchActive(false),
      onError: () => setIsVoiceSearchActive(false),
      onResult: (transcript, isFinal) => {
        setSearch(transcript);
        if (isFinal) {
          setIsVoiceSearchActive(false);
          VoiceAssistant.stopListening();
          setAnnouncement(`Filtered catalog for "${transcript}".`);
        }
      },
    });
    if (!started) setIsVoiceSearchActive(false);
  };

  const handleSearchLoyalty = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = loyaltyPhoneQuery.trim();
    if (!q) return;
    setIsSearchingLoyalty(true);
    setLoyaltyMessage('');
    try {
      const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.member) {
        setLoyaltyMember(data.member);
        setLoyaltyPointsToRedeem(0);
        setAnnouncement(`Loyalty member ${data.member.name} attached (${data.member.points} pts available).`);
      } else {
        // Fallback search by q
        const res2 = await fetch(`/api/loyalty?q=${encodeURIComponent(q)}`);
        const data2 = await res2.json();
        if (data2.success && data2.members?.length > 0) {
          setLoyaltyMember(data2.members[0]);
          setLoyaltyPointsToRedeem(0);
          setAnnouncement(`Loyalty member ${data2.members[0].name} attached (${data2.members[0].points} pts).`);
        } else {
          setLoyaltyMessage('No loyalty member found for phone/name.');
        }
      }
    } catch {
      setLoyaltyMessage('Loyalty lookup failed');
    } finally {
      setIsSearchingLoyalty(false);
    }
  };

  const requestOpenDrawer = () => {
    setPinAction({ type: 'OPEN_DRAWER' });
    setEnteredPin('');
    setPinError(false);
    setIsPinModalOpen(true);
  };

  useEffect(() => {
    fetchVerticalFlags().then(setVerticalFlags).catch(() => undefined);
    setReceiptPaper(readReceiptPaperId());

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

  const isElectronicsOrRepairs =
    urlMode === 'electronics' ||
    urlMode === 'mobilerepair' ||
    urlMode === 'repair' ||
    verticalFlags.repairs;

  const grossSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = (grossSubtotal * discountPercent) / 100;
  const tradeInDeduction = tradeInCredit?.creditAmount ?? 0;
  const exchangeDeduction = exchangeCredit?.creditAmount ?? 0;
  const loyaltyDeduction = Math.min(
    loyaltyPointsToRedeem,
    Math.max(0, grossSubtotal - discountAmount - tradeInDeduction - exchangeDeduction)
  );
  const netSubtotal = Math.max(
    0,
    grossSubtotal - discountAmount - tradeInDeduction - exchangeDeduction - loyaltyDeduction
  );
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
      } else if (pinAction?.type === 'OPEN_DRAWER') {
        try {
          ESCPOSPrinterController.openCashDrawerPulse();
        } catch {
          /* optional hardware */
        }
        setAnnouncement('Cash drawer pulse sent. Opened by Manager (PIN 1234).');
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
      setTradeInCredit(null);
      setPromoCode('');
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
    if (tradeInCredit) {
      checkoutPayload.tradeInVoucherNumber = tradeInCredit.voucherNumber;
      checkoutPayload.tradeInCredit = tradeInCredit.creditAmount;
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

      const effectivePaid = selectedTender === 'CASH' ? Number(cashTenderInput || grandTotal) : grandTotal;
      const effectiveChange = Math.max(0, effectivePaid - grandTotal);
      const earnedLoyalty = loyaltyMember ? Math.floor(grandTotal / 100) : 0;

      const finalCompletedOrder = {
        orderNumber: data.order?.orderNumber || orderNumber,
        items: [...cart],
        grossSubtotal,
        discountAmount,
        discountPercent,
        tradeInCredit: tradeInCredit || undefined,
        exchangeCredit: exchangeCredit || undefined,
        taxTotal,
        grandTotal,
        tender: selectedTender,
        amountPaid: effectivePaid,
        changeDue: effectiveChange,
        loyaltyEarned: earnedLoyalty,
        timestamp: new Date(),
      };

      try {
        // Optional hardware raw buffer generation for physical WebUSB/Bluetooth devices
        ESCPOSPrinterController.generateReceiptBuffer({
          storeName: 'Grabber Store',
          branchName: 'Main Counter',
          billNumber: data.order?.orderNumber || orderNumber,
          cashierName: 'Cashier',
          date: new Date().toLocaleString('en-LK'),
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
          amountPaid: effectivePaid,
          changeDue: effectiveChange,
          loyaltyPointsEarned: earnedLoyalty,
        });
      } catch {
        /* optional hardware fallback */
      }

      if (loyaltyMember) {
        if (loyaltyPointsToRedeem > 0) {
          fetch('/api/loyalty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'redeem',
              memberId: loyaltyMember.id,
              points: loyaltyPointsToRedeem,
              orderId: data.order?.orderNumber || orderNumber,
            }),
          }).catch(() => undefined);
        }
        fetch('/api/loyalty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'earn',
            memberId: loyaltyMember.id,
            amountLkr: grandTotal,
            orderId: data.order?.orderNumber || orderNumber,
          }),
        }).catch(() => undefined);
      }

      setCompletedOrder(finalCompletedOrder);
      setIsPaymentModalOpen(false);
      setCart([]);
      setDiscountPercent(0);
      setTradeInCredit(null);
      setPromoCode('');
      setLoyaltyMember(null);
      setLoyaltyPointsToRedeem(0);
      setLoyaltyPhoneQuery('');
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
        {/* POS Mode Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPosMode('RETAIL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                posMode === 'RETAIL'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Counter Retail
            </button>
            <button
              type="button"
              onClick={() => {
                setPosMode('SCANNER');
                barcodeRef.current?.focus();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                posMode === 'SCANNER'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Scan className="h-3.5 w-3.5" />
              Quick Scan
            </button>
            {verticalFlags.restaurant && (
              <button
                type="button"
                onClick={() => setPosMode('TABLES')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                  posMode === 'TABLES'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Tables
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {verticalFlags.restaurant && posMode !== 'TABLES' && (
              <Link
                href="/restaurant"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition"
                title="Open full Restaurant floor"
              >
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
                <span>Floor</span>
              </Link>
            )}
            {verticalFlags.repairs && (
              <Link
                href="/repairs"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-blue-300 hover:bg-zinc-800 transition"
                title="Open Device Repairs Workbench"
              >
                <Wrench className="h-3.5 w-3.5 text-blue-400" />
                <span>Repairs</span>
              </Link>
            )}
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 transition"
              title="Open Quotations & Custom Orders"
            >
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              <span>Quotes</span>
            </Link>

            <div className="flex items-center gap-0.5 bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-800 text-[10px] ml-1">
              {(['LKR', 'USD', 'EUR', 'GBP'] as CurrencyCode[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setTouristCurrency(cur)}
                  className={`px-1.5 py-0.5 rounded-lg font-mono font-bold transition ${
                    touristCurrency === cur
                      ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`Switch POS currency to ${cur}`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {posMode === 'TABLES' && verticalFlags.restaurant && (
          <div className="p-4 rounded-2xl border border-amber-500/20 bg-zinc-950/60">
            <TableServicePanel
              embedded
              cartLines={cart.map((c) => ({
                productId: c.productId,
                name: `${c.name}${c.variant ? ` (${c.variant})` : ''}`,
                qty: c.quantity,
                price: c.unitPrice,
              }))}
              onKotSuccess={() => {
                setCart([]);
                setAnnouncement('Kitchen ticket fired from POS bag');
              }}
            />
          </div>
        )}

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
              placeholder={isVoiceSearchActive ? 'Listening... speak product name...' : 'Search product name or SKU...'}
              className={`w-full pl-9 pr-9 py-2.5 text-sm rounded-xl bg-zinc-900/80 border text-foreground placeholder:text-zinc-500 transition-colors ${
                isVoiceSearchActive ? 'border-rose-500 bg-rose-950/20' : 'border-zinc-800'
              }`}
            />
            <button
              type="button"
              onClick={toggleVoiceSearch}
              title={isVoiceSearchActive ? 'Stop voice listening' : 'Voice product search'}
              className={`absolute right-2 top-2 h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                isVoiceSearchActive
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
              }`}
            >
              {isVoiceSearchActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
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
            <button
              type="button"
              onClick={requestOpenDrawer}
              title="Kick RJ11 Cash Drawer via Printer Pulse (Requires Manager PIN)"
              className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-semibold cursor-pointer min-h-[44px] flex items-center gap-1"
            >
              <Lock className="h-3 w-3 text-amber-400" aria-hidden="true" />
              <span>Drawer</span>
            </button>
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

          {/* Loyalty Rewards Earn & Burn */}
          <div className="py-1.5 px-2 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-400" /> Customer Loyalty
              </span>
              {loyaltyMember && (
                <button
                  type="button"
                  onClick={() => {
                    setLoyaltyMember(null);
                    setLoyaltyPointsToRedeem(0);
                    setLoyaltyPhoneQuery('');
                  }}
                  className="text-[10px] text-zinc-400 hover:text-rose-400 underline"
                >
                  Remove
                </button>
              )}
            </div>

            {!loyaltyMember ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Phone or Name..."
                  value={loyaltyPhoneQuery}
                  onChange={(e) => setLoyaltyPhoneQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchLoyalty();
                    }
                  }}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleSearchLoyalty()}
                  disabled={isSearchingLoyalty || !loyaltyPhoneQuery.trim()}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-medium disabled:opacity-50"
                >
                  {isSearchingLoyalty ? '...' : 'Find'}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-200 truncate max-w-[120px]">{loyaltyMember.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {loyaltyMember.tier} · {loyaltyMember.points} pts
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {loyaltyPointsToRedeem > 0 ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Using {loyaltyPointsToRedeem} pts (-LKR {loyaltyPointsToRedeem})
                      </span>
                      <button
                        type="button"
                        onClick={() => setLoyaltyPointsToRedeem(0)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loyaltyMember.points <= 0}
                      onClick={() => {
                        const maxRedeem = Math.min(loyaltyMember.points, Math.floor(Math.max(0, grossSubtotal - discountAmount - tradeInDeduction)));
                        setLoyaltyPointsToRedeem(maxRedeem);
                      }}
                      className="w-full py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <Sparkles className="h-3 w-3" /> Redeem {Math.min(loyaltyMember.points, Math.floor(Math.max(0, grossSubtotal - discountAmount - tradeInDeduction)))} pts
                    </button>
                  )}
                </div>
              </div>
            )}
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

          {loyaltyDeduction > 0 && (
            <div className="flex justify-between text-amber-400 font-medium text-xs">
              <span>Loyalty Points Burn</span>
              <span>- LKR {loyaltyDeduction.toFixed(2)}</span>
            </div>
          )}

          {tradeInCredit && (
            <div className="flex justify-between text-amber-500 font-medium text-xs">
              <span>Trade-in ({tradeInCredit.deviceModel})</span>
              <span>- LKR {tradeInDeduction.toFixed(2)}</span>
            </div>
          )}

          {exchangeCredit && (
            <div className="flex justify-between text-blue-400 font-medium text-xs">
              <span>Exchange Credit ({exchangeCredit.returnNumber})</span>
              <span>- LKR {exchangeDeduction.toFixed(2)}</span>
            </div>
          )}

          {isElectronicsOrRepairs ? (
            <button
              type="button"
              onClick={() => setIsTradeInModalOpen(true)}
              className="w-full min-h-9 rounded-lg border border-zinc-700 text-[11px] font-bold text-muted-foreground hover:bg-zinc-900 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              <span>{tradeInCredit ? 'Change trade-in' : 'Apply trade-in / buyback'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="w-full min-h-9 rounded-lg border border-zinc-700 text-[11px] font-bold text-muted-foreground hover:bg-zinc-900 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
              <span>{exchangeCredit ? `Exchange Credit (${exchangeCredit.returnNumber})` : 'Process Return / Exchange'}</span>
            </button>
          )}

          <div className="flex justify-between text-muted-foreground">
            <span>VAT (18%)</span>
            <span>LKR {taxTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-baseline text-sm font-bold text-foreground pt-1 border-t border-white/10">
            <div>
              <span>Grand Total</span>
              {touristCurrency !== 'LKR' && (
                <p className="text-[11px] font-mono text-emerald-400 font-semibold">
                  ≈ {formatCurrency(convertFromLkr(grandTotal, touristCurrency), touristCurrency)}
                </p>
              )}
            </div>
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

        {selectedTender === 'CASH' && (
          <div className="space-y-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="flex justify-between items-center">
              <label htmlFor="cash-tendered-input" className="font-semibold text-foreground">
                Cash Amount Tendered (LKR)
              </label>
              <span className="text-[10px] text-muted-foreground">Type or tap quick cash</span>
            </div>
            <input
              id="cash-tendered-input"
              type="number"
              min={grandTotal}
              step="100"
              value={cashTenderInput}
              onChange={(e) => setCashTenderInput(e.target.value ? Number(e.target.value) : '')}
              placeholder={`e.g. ${Math.ceil(grandTotal / 500) * 500}`}
              className="w-full px-3 py-2 text-base font-bold tabular-nums rounded-xl bg-secondary border border-border text-foreground text-right"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setCashTenderInput(grandTotal)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700"
              >
                Exact (LKR {grandTotal.toFixed(0)})
              </button>
              {[1000, 2000, 5000, 10000, 20000]
                .filter((amt) => amt >= grandTotal)
                .map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTenderInput(amt)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 border border-zinc-700"
                  >
                    LKR {amt.toLocaleString()}
                  </button>
                ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-sm font-bold">
              <span className="text-muted-foreground">Change Due to Customer:</span>
              <span className="text-emerald-400 tabular-nums">
                LKR {Math.max(0, (Number(cashTenderInput || grandTotal) - grandTotal)).toFixed(2)}
              </span>
            </div>
          </div>
        )}

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
          <label htmlFor="pos-promo-code" className="text-[10px] text-muted-foreground block mb-1">
            Promo code (optional)
          </label>
          <input
            id="pos-promo-code"
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

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="pos-receipt-paper" className="text-[10px] font-semibold text-muted-foreground">
                  Receipt paper size
                </label>
                <select
                  id="pos-receipt-paper"
                  value={receiptPaper}
                  onChange={(e) => {
                    const id = e.target.value as ReceiptPaperId;
                    setReceiptPaper(id);
                    writeReceiptPaperId(id);
                  }}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {RECEIPT_PAPER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  {receiptPreset(receiptPaper).description}. In Chrome print dialog: More settings → uncheck Headers
                  and footers; set Margins to None.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompletedOrder(null)}
                  className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs"
                >
                  New Sale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset = receiptPreset(receiptPaper);
                    runPrintJob('receipt', {
                      pageSize: `${preset.widthMm}mm auto`,
                      margin: '0',
                    });
                  }}
                  className="flex-1 min-h-11 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-400 cursor-pointer btn-press shadow-lg shadow-emerald-500/20"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Print Receipt ({receiptPreset(receiptPaper).widthMm}mm)</span>
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {branchId && (
        <TradeInModal
          isOpen={isTradeInModalOpen}
          onClose={() => setIsTradeInModalOpen(false)}
          branchId={branchId}
          onApplied={(credit) => {
            setTradeInCredit(credit);
            setAnnouncement(`Trade-in credit LKR ${credit.creditAmount.toLocaleString()} applied.`);
          }}
        />
      )}

      <ReturnExchangeModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        branchId={branchId}
        onApplied={(credit) => {
          setExchangeCredit(credit);
          setAnnouncement(`Exchange credit LKR ${credit.creditAmount.toLocaleString()} applied from bill ${credit.originalOrderNumber}.`);
        }}
      />

      {/* Thermal receipt — width follows selected paper preset */}
      <ThermalReceipt
        widthMm={receiptPreset(receiptPaper).widthMm}
        data={
          completedOrder
            ? {
                orderNumber: completedOrder.orderNumber,
                storeName: 'Grabber Store',
                storeAddress: 'Main Counter, Colombo',
                storePhone: '+94 11 234 5678',
                vatRegNumber: 'VAT-10029384-7000',
                items: completedOrder.items.map((it: CartItem) => ({
                  name: it.name,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  lineTotal: it.unitPrice * it.quantity,
                })),
                grossSubtotal: completedOrder.grossSubtotal,
                discountPercent: completedOrder.discountPercent,
                discountAmount: completedOrder.discountAmount,
                tradeInCredit: completedOrder.tradeInCredit,
                exchangeCredit: completedOrder.exchangeCredit,
                taxTotal: completedOrder.taxTotal,
                grandTotal: completedOrder.grandTotal,
                tender: completedOrder.tender,
                amountPaid: completedOrder.amountPaid,
                changeDue: completedOrder.changeDue,
                loyaltyEarned: completedOrder.loyaltyEarned,
              }
            : null
        }
      />
    </div>
  );
}
