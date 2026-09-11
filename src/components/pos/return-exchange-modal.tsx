'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Search, RotateCcw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export type ExchangeCredit = {
  returnNumber: string;
  creditAmount: number;
  originalOrderNumber: string;
  itemsReturned: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string | null;
  onApplied: (credit: ExchangeCredit) => void;
};

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  returnQty: number;
};

export function ReturnExchangeModal({ isOpen, onClose, onApplied }: Props) {
  const [billNumber, setBillNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{
    id: string;
    orderNumber: string;
    grandTotal: number;
    createdAt: string;
    items: OrderItem[];
  } | null>(null);
  const [returnReason, setReturnReason] = useState('EXCHANGE_SIZE');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!billNumber.trim()) return;
    setBusy(true);
    setError(null);
    setOrderData(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/orders/lookup?query=${encodeURIComponent(billNumber.trim())}`);
      const data = await res.json();
      if (!data.success || !data.order) {
        // Fallback search via /api/orders
        const res2 = await fetch(`/api/orders?search=${encodeURIComponent(billNumber.trim())}`);
        const data2 = await res2.json();
        if (data2.orders && data2.orders.length > 0) {
          const ord = data2.orders[0];
          setOrderData({
            id: ord.id,
            orderNumber: ord.orderNumber || billNumber,
            grandTotal: Number(ord.grandTotal || 0),
            createdAt: ord.createdAt,
            items: (ord.lines || ord.items || []).map((l: any, idx: number) => ({
              id: l.id || `line_${idx}`,
              name: l.productName || l.name || 'Item',
              quantity: Number(l.quantity || 1),
              unitPrice: Number(l.unitPrice || 0),
              returnQty: 1,
            })),
          });
          return;
        }
        throw new Error(data.error || 'Bill not found. Verify bill number or scan barcode.');
      }

      setOrderData({
        id: data.order.id,
        orderNumber: data.order.orderNumber,
        grandTotal: Number(data.order.grandTotal),
        createdAt: data.order.createdAt,
        items: (data.order.items || []).map((item: any, idx: number) => ({
          id: item.id || `line_${idx}`,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          returnQty: 1,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  };

  const calculateReturnTotal = () => {
    if (!orderData) return 0;
    return orderData.items.reduce((sum, item) => sum + (item.returnQty * item.unitPrice), 0);
  };

  const returnTotal = calculateReturnTotal();

  const handleApplyExchange = async () => {
    if (!orderData || returnTotal <= 0) return;
    setBusy(true);
    setError(null);

    try {
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
      const activeLines = orderData.items
        .filter((i) => i.returnQty > 0)
        .map((i) => `${i.name} (x${i.returnQty})`)
        .join(', ');

      // Post return event to ledger & stock
      await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          returnNumber,
          reason: returnReason,
          refundDestination: 'EXCHANGE_CREDIT',
          restockApproved: true,
          refundAmount: returnTotal,
          lines: orderData.items
            .filter((i) => i.returnQty > 0)
            .map((i) => ({
              orderLineId: i.id,
              quantityReturned: i.returnQty,
              restockApproved: true,
              refundAmount: i.returnQty * i.unitPrice,
            })),
        }),
      }).catch(() => {});

      onApplied({
        returnNumber,
        creditAmount: returnTotal,
        originalOrderNumber: orderData.orderNumber,
        itemsReturned: activeLines,
      });

      setSuccessMsg(`Exchange credit of LKR ${returnTotal.toFixed(2)} applied to current POS sale.`);
      setTimeout(() => {
        onClose();
        setOrderData(null);
        setBillNumber('');
        setSuccessMsg(null);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Exchange processing failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Returns & Exchange Counter" className="max-w-lg">
      <div className="space-y-4 text-xs">
        <form onSubmit={handleLookup} className="space-y-2">
          <label htmlFor="return-bill-search" className="font-semibold text-foreground block">
            Scan or Enter Original Bill / Receipt Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                id="return-bill-search"
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="e.g. POS-154857 or scan barcode"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border font-mono text-xs uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !billNumber.trim()}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-foreground font-bold text-xs disabled:opacity-50"
            >
              {busy ? 'Finding…' : 'Find Bill'}
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {orderData && (
          <div className="space-y-3 p-3.5 rounded-xl bg-secondary/50 border border-border">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <p className="font-bold text-foreground">{orderData.orderNumber}</p>
                <p className="text-[10px] text-muted-foreground">
                  Original Date: {new Date(orderData.createdAt).toLocaleDateString('en-LK')}
                </p>
              </div>
              <span className="font-mono font-bold text-emerald-400">
                LKR {orderData.grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-foreground text-[11px]">Select Items to Return / Exchange:</p>
              {orderData.items.map((item, idx) => (
                <div key={item.id || idx} className="flex justify-between items-center p-2 rounded-lg bg-card border border-border/60">
                  <div className="truncate max-w-[200px]">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      LKR {item.unitPrice.toFixed(2)} each (Bought: {item.quantity})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground">Return Qty:</label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={item.returnQty}
                      onChange={(e) => {
                        const qty = Math.min(item.quantity, Math.max(0, Number(e.target.value)));
                        setOrderData((prev) =>
                          prev
                            ? {
                                ...prev,
                                items: prev.items.map((it, i) => (i === idx ? { ...it, returnQty: qty } : it)),
                              }
                            : null
                        );
                      }}
                      className="w-14 px-2 py-1 rounded-lg bg-secondary border border-border text-center font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-xs"
                >
                  <option value="EXCHANGE_SIZE">Exchange for another size/color</option>
                  <option value="DEFECTIVE">Defective / Damaged Item</option>
                  <option value="CHANGED_MIND">Customer Changed Mind</option>
                  <option value="WRONG_ITEM">Wrong Item Billed</option>
                </select>
              </div>
              <div className="text-right flex flex-col justify-end">
                <span className="text-[10px] text-muted-foreground">Calculated Exchange Credit:</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  LKR {returnTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || returnTotal <= 0}
              onClick={() => void handleApplyExchange()}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-glow-em hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Apply LKR {returnTotal.toFixed(2)} Credit to Current Sale</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
