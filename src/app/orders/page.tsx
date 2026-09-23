'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, RefreshCw, ArrowLeft, Filter, FileText, ChevronDown } from 'lucide-react';

type Order = {
  id: string;
  receiptNo: string;
  customerName: string;
  customerMobile: string;
  total: number;
  channel: string;
  orderStatus: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items?: Array<{
    name: string;
    sku?: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    discountAmount: number;
    lineTotal: number;
  }>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (channel !== 'all') params.set('channel', channel);
      if (status !== 'all') params.set('status', status);
      const query = params.toString();
      const res = await fetch(`/api/orders${query ? `?${query}` : ''}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }, [channel, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(id: string, preset: string) {
    setActionBusy(id);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, preset }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" /> Order Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Storefront, WhatsApp, POS & manual channels</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-2 cursor-pointer btn-press"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-zinc-500" />
        {['all', 'POS', 'STOREFRONT', 'WHATSAPP'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              channel === c ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            {c === 'all' ? 'All Channels' : c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Status</span>
        {['all', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              status === s ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="p-4 rounded-2xl glass-card border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">{o.receiptNo}</div>
                <div className="text-xs text-zinc-400">
                  {o.customerName} - {o.channel} - {o.paymentMethod}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {new Date(o.createdAt).toLocaleString('en-LK')}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">{o.orderStatus}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">{o.paymentStatus}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">
                    {o.items?.length || 0} line(s)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                  {o.fulfillmentStatus}
                </span>
                <span className="font-extrabold text-emerald-400 tabular-nums">LKR {o.total.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                  className="min-h-9 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-[10px] font-bold inline-flex items-center gap-1"
                  aria-expanded={expandedOrderId === o.id}
                >
                  Breakdown
                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedOrderId === o.id ? 'rotate-180' : ''}`} />
                </button>
                <Link
                  href={`/api/orders/${encodeURIComponent(o.receiptNo)}/invoice`}
                  target="_blank"
                  className="min-h-9 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold inline-flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> Invoice
                </Link>
                {o.channel !== 'POS' && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled' && (
                  <div className="flex gap-1">
                    {o.paymentStatus === 'pending' && (
                      <button
                        type="button"
                        disabled={actionBusy === o.id}
                        onClick={() => void transition(o.id, 'mark_paid')}
                        className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold"
                      >
                        Mark Paid
                      </button>
                    )}
                    {o.orderStatus === 'confirmed' && (
                      <button
                        type="button"
                        disabled={actionBusy === o.id}
                        onClick={() => void transition(o.id, 'process')}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold"
                      >
                        Process
                      </button>
                    )}
                    {['confirmed', 'processing', 'packed', 'shipped'].includes(o.orderStatus) && (
                      <button
                        type="button"
                        disabled={actionBusy === o.id}
                        onClick={() => void transition(o.id, 'deliver')}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"
                      >
                        Deliver
                      </button>
                    )}
                    {!['delivered', 'cancelled'].includes(o.orderStatus) && (
                      <button
                        type="button"
                        disabled={actionBusy === o.id}
                        onClick={() => void transition(o.id, 'cancel')}
                        className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {expandedOrderId === o.id && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">Invoice breakdown</h2>
                  <span className="text-[10px] font-bold text-zinc-500">{o.items?.length || 0} item line(s)</span>
                </div>
                {o.items?.length ? (
                  <div className="space-y-2">
                    {o.items.map((item, idx) => (
                      <div
                        key={`${o.id}-${idx}`}
                        className="grid gap-2 rounded-xl bg-zinc-900/70 p-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{item.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {[item.variant, item.sku].filter(Boolean).join(' - ') || 'Standard item'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-right font-mono text-[11px] text-zinc-300 sm:grid-cols-4">
                          <span>Qty {item.quantity}</span>
                          <span>Unit {item.unitPrice.toLocaleString()}</span>
                          <span>VAT {item.taxAmount.toLocaleString()}</span>
                          <span className="font-extrabold text-emerald-400">LKR {item.lineTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-zinc-900/70 p-3 text-xs text-zinc-500">
                    No item details found for this order. Older imported orders may only have totals.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && orders.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No orders yet. Sales from POS, storefront, and WhatsApp appear here.
          </p>
        )}
      </div>
    </div>
  );
}
