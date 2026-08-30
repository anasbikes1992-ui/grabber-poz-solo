'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Plus, Search, CheckCircle2, ArrowLeft, AlertCircle, Printer, X } from 'lucide-react';

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
  const [billNum, setBillNum] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [item, setItem] = useState('');
  const [refundAmount, setRefundAmount] = useState(4500);
  const [condition, setCondition] = useState<'RESELLABLE' | 'DEFECTIVE' | 'DAMAGED'>('RESELLABLE');
  const [refundType, setRefundType] = useState<'STORE_CREDIT' | 'CASH_REFUND'>('STORE_CREDIT');
  const [reason, setReason] = useState('Customer changed mind / Wrong size');

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const newR: ReturnRecord = {
      id: `ret_${Date.now()}`,
      returnNumber: `RET-2026-${Math.floor(100 + Math.random() * 900)}`,
      originalBillNumber: billNum,
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
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span>🔄 Returns & Exchange Desk</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                INVENTORY RESTOCKING
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Original receipt validation, condition grading (Resellable vs Defective), and store credit issuance.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 hover:from-amber-300 hover:to-orange-300 transition-all self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Process Customer Return</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Returns (MTD)</p>
          <p className="text-xl font-extrabold text-white font-mono">1 Item</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Store Credit Issued</p>
          <p className="text-xl font-extrabold text-cyan-400 font-mono">LKR 4,500.00</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-1">
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Restock Rate</p>
          <p className="text-xl font-extrabold text-emerald-400">100% (Resellable)</p>
        </div>
      </div>

      {/* Returns Table */}
      <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-4 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-2.5 font-medium">Return #</th>
                <th className="pb-2.5 font-medium">Original POS Bill</th>
                <th className="pb-2.5 font-medium">Customer</th>
                <th className="pb-2.5 font-medium">Returned Item</th>
                <th className="pb-2.5 font-medium text-right">Refund Amount</th>
                <th className="pb-2.5 font-medium text-right">Condition</th>
                <th className="pb-2.5 font-medium text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 font-mono font-bold text-white">{r.returnNumber}</td>
                  <td className="py-3 font-mono text-cyan-400">{r.originalBillNumber}</td>
                  <td className="py-3 text-white font-semibold">{r.customerName}</td>
                  <td className="py-3 text-slate-300">
                    <p>{r.item}</p>
                    <p className="text-[10px] text-slate-500">{r.reason}</p>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    LKR {r.refundAmount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400">
                      {r.condition}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-400">
                      {r.refundType.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleProcessReturn} className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm text-white">Process Customer Return & Exchange</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Original Receipt / Bill # *</label>
                  <input
                    type="text"
                    required
                    value={billNum}
                    onChange={(e) => setBillNum(e.target.value)}
                    placeholder="POS-2026-..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Product Item *</label>
                <input
                  type="text"
                  required
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Refund Value (Rs)</label>
                  <input
                    type="number"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-cyan-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Graded Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  >
                    <option value="RESELLABLE">Resellable (Auto-Restock)</option>
                    <option value="DEFECTIVE">Defective (Return to Vendor)</option>
                    <option value="DAMAGED">Damaged (Write-off)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Refund Settlement Method</label>
                <select
                  value={refundType}
                  onChange={(e) => setRefundType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                >
                  <option value="STORE_CREDIT">Store Credit Voucher (Recommended)</option>
                  <option value="CASH_REFUND">Direct Cash Refund (Drawer Deduction)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-black font-extrabold text-xs shadow-md shadow-amber-400/20 hover:from-amber-300 hover:to-orange-300 transition-all"
            >
              Approve Return & Print Credit Voucher
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
