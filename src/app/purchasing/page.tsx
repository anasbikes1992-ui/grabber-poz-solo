'use client';

import React, { useState } from 'react';
import { Truck, Plus, CheckCircle2, FileText, X } from 'lucide-react';

export default function PurchasingPage() {
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poStatus, setPOStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');

  const purchaseOrders = [
    { poNumber: 'PO-2026-001', supplier: 'Lanka Textiles Ltd', warehouse: 'Central Colombo Warehouse', items: '100x Linen Casual Shirt', total: 250000, status: 'RECEIVED', date: 'Today' },
    { poNumber: 'PO-2026-002', supplier: 'Ceylon Garments Co.', warehouse: 'Central Colombo Warehouse', items: '50x Oxford Button-Down', total: 140000, status: 'APPROVED', date: 'Yesterday' },
  ];

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    setPOStatus('SUCCESS');
    setTimeout(() => {
      setIsPOModalOpen(false);
      setPOStatus('IDLE');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Purchasing & Supplier AP</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purchase orders, Goods Receipt Notes (GRN), landed cost tracking, and supplier credit balance journals.
          </p>
        </div>

        <button
          onClick={() => setIsPOModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-2 shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* PO Overview List */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-sm text-foreground">Purchase Orders & GRN Receiving</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2.5 font-medium">PO Number</th>
                <th className="pb-2.5 font-medium">Supplier</th>
                <th className="pb-2.5 font-medium">Destination WH</th>
                <th className="pb-2.5 font-medium">Ordered Items</th>
                <th className="pb-2.5 font-medium text-right">Total Cost</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {purchaseOrders.map((po) => (
                <tr key={po.poNumber} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 font-mono font-semibold text-foreground">{po.poNumber}</td>
                  <td className="py-3 text-foreground font-medium">{po.supplier}</td>
                  <td className="py-3 text-muted-foreground">{po.warehouse}</td>
                  <td className="py-3 text-muted-foreground">{po.items}</td>
                  <td className="py-3 text-right font-bold text-foreground">LKR {po.total.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      po.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Creation Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePO} className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Create Purchase Order</h3>
              <button type="button" onClick={() => setIsPOModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Select Supplier</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Lanka Textiles Ltd (Net 30 Days)</option>
                  <option>Ceylon Garments Co. (Net 15 Days)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Destination Warehouse</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Central Colombo Warehouse (WH-01)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Items & Unit Cost</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue="Linen Casual Shirt (L / Blue)"
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
                  />
                  <input
                    type="number"
                    defaultValue={50}
                    min={1}
                    className="w-16 px-2 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold text-center"
                  />
                  <input
                    type="number"
                    defaultValue={2500}
                    className="w-24 px-2 py-2 rounded-xl bg-secondary border border-border text-foreground font-bold text-right"
                  />
                </div>
              </div>
            </div>

            {poStatus === 'SUCCESS' ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center gap-2 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>PO Created & Supplier AP Account Linked!</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.99]"
              >
                Issue Purchase Order
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
