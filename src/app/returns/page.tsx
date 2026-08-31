'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalBillNumber: string;
  customerName: string;
  item: string;
  sku: string;
  qty: number;
  refundAmount: number;
  reason: string;
  condition: 'RESELLABLE' | 'DEFECTIVE' | 'DAMAGED';
  refundType: 'STORE_CREDIT' | 'CASH_REFUND';
  date: string;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([
    {
      id: 'ret_1',
      returnNumber: 'RET-2026-401',
      originalBillNumber: 'POS-2026-8902',
      customerName: 'Roshan Fernando',
      item: 'Linen Casual Shirt (Blue/L)',
      sku: 'LNN-SHT-BLU-L',
      qty: 1,
      refundAmount: 4500.0,
      reason: 'Size exchange needed (Too large)',
      condition: 'RESELLABLE',
      refundType: 'STORE_CREDIT',
      date: 'Today, 11:30 AM',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [billNum, setBillNum] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [item, setItem] = useState('');
  const [refundAmount, setRefundAmount] = useState(4500);
  const [condition, setCondition] = useState<'RESELLABLE' | 'DEFECTIVE' | 'DAMAGED'>('RESELLABLE');
  const [refundType, setRefundType] = useState<'STORE_CREDIT' | 'CASH_REFUND'>('STORE_CREDIT');
  const [reason, setReason] = useState('Customer changed mind / Wrong size');
  const [submitStatus, setSubmitStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lookupBusy, setLookupBusy] = useState(false);

  const resetForm = () => {
    setOrderId('');
    setBillNum('');
    setCustomerName('');
    setItem('');
    setRefundAmount(4500);
    setCondition('RESELLABLE');
    setRefundType('STORE_CREDIT');
    setReason('Customer changed mind / Wrong size');
    setSubmitStatus('IDLE');
    setSubmitError(null);
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleLookupOrder = async () => {
    const q = (billNum || orderId).trim();
    if (!q) {
      setSubmitError('Enter a bill number or order UUID to look up.');
      return;
    }
    setLookupBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/orders/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Order not found');
      setOrderId(data.order.id);
      setBillNum(data.order.orderNumber);
      setRefundAmount(Number(data.order.grandTotal));
      if (data.items?.[0]) {
        setItem(`Line item ×${data.items[0].quantity}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupBusy(false);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let resolvedOrderId = orderId.trim();
    if (!resolvedOrderId && billNum.trim()) {
      const res = await fetch(`/api/orders/lookup?q=${encodeURIComponent(billNum.trim())}`);
      const data = await res.json();
      if (!data.success) {
        setSubmitStatus('ERROR');
        setSubmitError(data.error || 'Could not resolve bill number to order UUID');
        return;
      }
      resolvedOrderId = data.order.id;
      setOrderId(resolvedOrderId);
    }
    if (!resolvedOrderId) {
      setSubmitStatus('ERROR');
      setSubmitError('Look up a bill number or enter an order UUID first.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitStatus('IDLE');

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: resolvedOrderId,
          returnNumber: billNum ? `RET-${billNum}` : undefined,
          reason: `${reason}${refundType === 'STORE_CREDIT' ? ' · Store credit' : ' · Cash refund'}`,
          restockApproved: condition === 'RESELLABLE',
          refundAmount: Number(refundAmount),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Return processing failed');

      const newR: ReturnRecord = {
        id: data.return?.id || `ret_${Date.now()}`,
        returnNumber: data.return?.returnNumber || `RET-${Date.now().toString().slice(-6)}`,
        originalBillNumber: billNum || data.order?.orderNumber || resolvedOrderId,
        customerName,
        item,
        sku: 'RET-SKU',
        qty: 1,
        refundAmount: Number(refundAmount),
        reason,
        condition,
        refundType,
        date: 'Just now',
      };
      setReturns((prev) => [newR, ...prev]);
      setSubmitStatus('SUCCESS');
      setTimeout(() => {
        setIsModalOpen(false);
        resetForm();
      }, 1200);
    } catch (err) {
      setSubmitStatus('ERROR');
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Return failed. Use the order UUID from a completed POS checkout.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <span>Returns & Exchange Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                INVENTORY RESTOCKING
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Original receipt validation, condition grading (Resellable vs Defective), and store credit issuance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Process Customer Return</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl glass-card space-y-1">
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Total Returns (MTD)</p>
          <p className="text-xl font-extrabold text-foreground font-mono tabular-nums">{returns.length} Items</p>
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-1">
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Store Credit Issued</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            LKR {returns.reduce((s, r) => s + (r.refundType === 'STORE_CREDIT' ? r.refundAmount : 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-1">
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Restock Rate</p>
          <p className="text-xl font-extrabold text-emerald-400">
            {returns.filter((r) => r.condition === 'RESELLABLE').length}/{returns.length || 1} Resellable
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl glass-card space-y-4 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-muted-foreground">
                <th className="pb-2.5 font-medium">Return #</th>
                <th className="pb-2.5 font-medium">Original POS Bill</th>
                <th className="pb-2.5 font-medium">Customer</th>
                <th className="pb-2.5 font-medium">Returned Item</th>
                <th className="pb-2.5 font-medium text-right">Refund Amount</th>
                <th className="pb-2.5 font-medium text-right">Condition</th>
                <th className="pb-2.5 font-medium text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/60 transition-colors duration-200">
                  <td className="py-3 font-mono font-bold text-foreground">{r.returnNumber}</td>
                  <td className="py-3 font-mono text-emerald-400">{r.originalBillNumber}</td>
                  <td className="py-3 text-foreground font-semibold">{r.customerName}</td>
                  <td className="py-3 text-muted-foreground">
                    <p>{r.item}</p>
                    <p className="text-[10px] text-zinc-500">{r.reason}</p>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-foreground tabular-nums">
                    LKR {r.refundAmount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {r.condition}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-zinc-900 text-zinc-300 border border-zinc-800">
                      {r.refundType.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsModalOpen(false);
        }}
        title="Process Customer Return & Exchange"
        as="form"
        onSubmit={handleProcessReturn}
        className="max-w-md"
      >
        <p className="text-[11px] text-muted-foreground -mt-2">
          Enter a POS bill number (e.g. POS-…) and look it up, or paste the order UUID from checkout.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="return-bill-num" className="text-muted-foreground block mb-1 font-medium">
                Original Receipt / Bill #
              </label>
              <input
                id="return-bill-num"
                type="text"
                value={billNum}
                onChange={(e) => setBillNum(e.target.value)}
                placeholder="POS-…"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                disabled={lookupBusy}
                onClick={handleLookupOrder}
                className="min-h-10 px-3 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 disabled:opacity-50"
              >
                {lookupBusy ? 'Looking up…' : 'Look up order'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="return-order-id" className="text-muted-foreground block mb-1 font-medium">
              Order UUID {orderId ? '' : '(auto-filled by lookup)'}
            </label>
            <input
              id="return-order-id"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Resolved after lookup or paste UUID"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground font-mono text-[11px]"
            />
          </div>

          <div>
              <label htmlFor="return-customer" className="text-muted-foreground block mb-1 font-medium">
                Customer Name
              </label>
              <input
                id="return-customer"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground"
              />
          </div>

          <div>
            <label htmlFor="return-item" className="text-muted-foreground block mb-1 font-medium">
              Product Item
            </label>
            <input
              id="return-item"
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="return-refund" className="text-muted-foreground block mb-1 font-medium">
                Refund Value (Rs)
              </label>
              <input
                id="return-refund"
                type="number"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono font-bold"
              />
            </div>
            <div>
              <label htmlFor="return-condition" className="text-muted-foreground block mb-1 font-medium">
                Graded Condition
              </label>
              <select
                id="return-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ReturnRecord['condition'])}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground cursor-pointer"
              >
                <option value="RESELLABLE">Resellable (Auto-Restock)</option>
                <option value="DEFECTIVE">Defective (Return to Vendor)</option>
                <option value="DAMAGED">Damaged (Write-off)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="return-settlement" className="text-muted-foreground block mb-1 font-medium">
              Refund Settlement Method
            </label>
            <select
              id="return-settlement"
              value={refundType}
              onChange={(e) => setRefundType(e.target.value as ReturnRecord['refundType'])}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-foreground cursor-pointer"
            >
              <option value="STORE_CREDIT">Store Credit Voucher (Recommended)</option>
              <option value="CASH_REFUND">Direct Cash Refund (Drawer Deduction)</option>
            </select>
          </div>
        </div>

        {submitStatus === 'ERROR' && submitError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2 text-[11px]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        {submitStatus === 'SUCCESS' ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center gap-2 font-bold text-xs">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Return Posted — Stock & GL Updated</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-11 py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-glow-em hover:bg-emerald-400 transition-all duration-200 cursor-pointer btn-press disabled:opacity-50"
          >
            {isSubmitting ? 'Processing Return…' : 'Approve Return & Print Credit Voucher'}
          </button>
        )}
      </Modal>
    </div>
  );
}
