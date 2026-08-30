'use client';

import React, { useState } from 'react';
import { Boxes, ArrowRightLeft, History, Plus, CheckCircle2, X } from 'lucide-react';

export default function InventoryPage() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStatus, setTransferStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');

  const stockBalances = [
    { location: 'Colombo Main Branch', type: 'BRANCH', product: 'Linen Casual Shirt (L / Blue)', onHand: 31, reserved: 0, available: 31 },
    { location: 'Central Colombo Warehouse', type: 'WAREHOUSE', product: 'Linen Casual Shirt (L / Blue)', onHand: 45, reserved: 0, available: 45 },
    { location: 'Kandy Retail Outlet', type: 'BRANCH', product: 'Linen Casual Shirt (L / Blue)', onHand: 15, reserved: 0, available: 15 },
    { location: 'Colombo Main Branch', type: 'BRANCH', product: 'Oxford Button-Down (M / White)', onHand: 18, reserved: 2, available: 16 },
    { location: 'Central Colombo Warehouse', type: 'WAREHOUSE', product: 'Oxford Button-Down (M / White)', onHand: 50, reserved: 0, available: 50 },
  ];

  const recentMovements = [
    { id: 'mov_101', type: 'TRANSFER_IN', delta: '+15', location: 'Kandy Retail Outlet', ref: 'TRF-2026-002', date: '10 mins ago' },
    { id: 'mov_100', type: 'TRANSFER_OUT', delta: '-15', location: 'Central Colombo Warehouse', ref: 'TRF-2026-002', date: '10 mins ago' },
    { id: 'mov_99', type: 'RETURN', delta: '+1', location: 'Colombo Main Branch', ref: 'RET-2026-001', date: '25 mins ago' },
    { id: 'mov_98', type: 'SALE', delta: '-2', location: 'Colombo Main Branch', ref: 'POS-2026-1001', date: '40 mins ago' },
    { id: 'mov_97', type: 'TRANSFER_IN', delta: '+40', location: 'Colombo Main Branch', ref: 'TRF-2026-001', date: '2 hours ago' },
    { id: 'mov_96', type: 'PURCHASE_RECEIPT', delta: '+100', location: 'Central Colombo Warehouse', ref: 'GRN-2026-001', date: '3 hours ago' },
  ];

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferStatus('SUCCESS');
    setTimeout(() => {
      setIsTransferModalOpen(false);
      setTransferStatus('IDLE');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Physical Inventory & Stock Ledgers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable movement ledger with multi-location on-hand, reserved, and available balance counters.
          </p>
        </div>

        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* Stock Balances Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Location Stock Balances</h3>
          </div>
          <span className="text-xs text-muted-foreground">Updated in Real-Time</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Location</th>
                <th className="pb-2.5 font-medium">Type</th>
                <th className="pb-2.5 font-medium">Product / Variant</th>
                <th className="pb-2.5 font-medium text-right">On-Hand</th>
                <th className="pb-2.5 font-medium text-right">Reserved</th>
                <th className="pb-2.5 font-medium text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stockBalances.map((b, idx) => (
                <tr key={idx} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-semibold text-foreground">{b.location}</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      b.type === 'WAREHOUSE' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{b.product}</td>
                  <td className="py-3 text-right font-bold text-foreground">{b.onHand}</td>
                  <td className="py-3 text-right text-muted-foreground">{b.reserved}</td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{b.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Ledger Audit Table */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-sm text-foreground">Immutable Movement Ledger (Audit Trail)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">Movement Type</th>
                <th className="pb-2.5 font-medium text-right">Delta</th>
                <th className="pb-2.5 font-medium">Location</th>
                <th className="pb-2.5 font-medium">Reference Doc</th>
                <th className="pb-2.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentMovements.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      m.delta.startsWith('+') ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span>{m.type}</span>
                  </td>
                  <td className={`py-3 text-right font-bold ${
                    m.delta.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {m.delta}
                  </td>
                  <td className="py-3 text-muted-foreground">{m.location}</td>
                  <td className="py-3 font-mono text-[11px] text-foreground">{m.ref}</td>
                  <td className="py-3 text-right text-muted-foreground">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inter-Location Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteTransfer} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Initiate Stock Transfer</h3>
              <button type="button" onClick={() => setIsTransferModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Source Location</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Central Colombo Warehouse (WH-01)</option>
                  <option>Colombo Main Branch (BR-01)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Destination Location</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Colombo Main Branch (BR-01)</option>
                  <option>Kandy Retail Outlet (BR-02)</option>
                  <option>Central Colombo Warehouse (WH-01)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Product & Quantity</label>
                <div className="flex gap-2">
                  <select className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                    <option>Linen Casual Shirt (Size L / Blue)</option>
                    <option>Oxford Button-Down (Size M / White)</option>
                  </select>
                  <input
                    type="number"
                    defaultValue={10}
                    min={1}
                    className="w-20 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {transferStatus === 'SUCCESS' ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Transfer Dispatched & Ledger Updated!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Dispatch Stock Transfer
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
