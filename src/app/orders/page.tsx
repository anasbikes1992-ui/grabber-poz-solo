'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, RefreshCw, ArrowLeft, Filter } from 'lucide-react';

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
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = channel !== 'all' ? `?channel=${channel}` : '';
      const res = await fetch(`/api/orders${q}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }, [channel]);

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

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">{o.receiptNo}</div>
              <div className="text-xs text-zinc-400">
                {o.customerName} · {o.channel} · {o.paymentMethod}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {new Date(o.createdAt).toLocaleString('en-LK')}
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">{o.orderStatus}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase">{o.paymentStatus}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                {o.fulfillmentStatus}
              </span>
              <span className="font-extrabold text-emerald-400 tabular-nums">LKR {o.total.toLocaleString()}</span>
              {o.channel !== 'POS' && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled' && (
                <div className="flex gap-1">
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
