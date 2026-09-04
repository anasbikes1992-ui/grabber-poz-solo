'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Plus, CheckCircle2, AlertCircle, Truck, Package, Clock, XCircle, Building2, Warehouse } from 'lucide-react';

type Transfer = {
  id: string;
  transferNumber: string;
  fromLocationType: 'BRANCH' | 'WAREHOUSE';
  fromLocationId: string;
  toLocationType: 'BRANCH' | 'WAREHOUSE';
  toLocationId: string;
  status: string;
  createdAt: string;
  lines: Array<{
    id: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    receivedQty?: number | null;
    varianceQty?: number | null;
  }>;
};

type LocationOption = { id: string; name: string; code: string; type: 'BRANCH' | 'WAREHOUSE' };
type ProductOption = { id: string; name: string; sku: string; price: number };

export default function TransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [fromLocId, setFromLocId] = useState('');
  const [toLocId, setToLocId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [trRes, brRes, whRes, prodRes] = await Promise.all([
        fetch('/api/inventory/transfer'),
        fetch('/api/branches').catch(() => null),
        fetch('/api/warehouses').catch(() => null),
        fetch('/api/pos/catalog').catch(() => null),
      ]);

      const trData = await trRes.json();
      if (trData.success) setTransfers(trData.transfers || []);

      const locs: LocationOption[] = [];
      if (brRes) {
        const brData = await brRes.json();
        if (brData.success && Array.isArray(brData.branches)) {
          locs.push(...brData.branches.map((b: any) => ({ id: b.id, name: b.name, code: b.code, type: 'BRANCH' as const })));
        }
      }
      if (whRes) {
        const whData = await whRes.json();
        if (whData.success && Array.isArray(whData.warehouses)) {
          locs.push(...whData.warehouses.map((w: any) => ({ id: w.id, name: w.name, code: w.code, type: 'WAREHOUSE' as const })));
        }
      }
      setLocations(locs);

      if (prodRes) {
        const prodData = await prodRes.json();
        if (prodData.success && Array.isArray(prodData.products)) {
          setProducts(prodData.products);
          if (prodData.products.length > 0 && !selectedProductId) {
            setSelectedProductId(prodData.products[0].id);
          }
        }
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to load transfer data' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!fromLocId || !toLocId) {
      setMsg({ type: 'error', text: 'Select both origin and destination locations' });
      return;
    }
    if (fromLocId === toLocId) {
      setMsg({ type: 'error', text: 'Origin and destination must be different' });
      return;
    }
    if (!selectedProductId || quantity < 1) {
      setMsg({ type: 'error', text: 'Select a valid product and quantity' });
      return;
    }

    const fromLoc = locations.find((l) => l.id === fromLocId);
    const toLoc = locations.find((l) => l.id === toLocId);
    if (!fromLoc || !toLoc) return;

    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          fromLocationType: fromLoc.type,
          fromLocationId: fromLoc.id,
          toLocationType: toLoc.type,
          toLocationId: toLoc.id,
          items: [{ productId: selectedProductId, quantity: Number(quantity) }],
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMsg({ type: 'error', text: data.error || 'Failed to create transfer' });
        return;
      }

      setMsg({ type: 'success', text: `Transfer #${data.transfer.transferNumber} created in DRAFT status` });
      setShowModal(false);
      setQuantity(1);
      void loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Transfer request failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function dispatch(id: string) {
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', transferId: id }),
      });
      const data = await res.json();
      setMsg(
        data.success
          ? { type: 'success', text: 'Transfer dispatched — stock marked IN_TRANSIT' }
          : { type: 'error', text: data.error || 'Dispatch failed' },
      );
      void loadData();
    } catch {
      setMsg({ type: 'error', text: 'Dispatch failed' });
    }
  }

  async function receive(tr: Transfer) {
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          transferId: tr.id,
          items: tr.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            receivedQty: l.receivedQty ?? l.quantity,
          })),
        }),
      });
      const data = await res.json();
      setMsg(
        data.success
          ? { type: 'success', text: 'Transfer received & verified at destination' }
          : { type: 'error', text: data.error || 'Receive failed' },
      );
      void loadData();
    } catch {
      setMsg({ type: 'error', text: 'Receive failed' });
    }
  }

  async function cancel(id: string) {
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', transferId: id }),
      });
      const data = await res.json();
      setMsg(
        data.success
          ? { type: 'success', text: 'Transfer cancelled' }
          : { type: 'error', text: data.error || 'Cancel failed' },
      );
      void loadData();
    } catch {
      setMsg({ type: 'error', text: 'Cancel failed' });
    }
  }

  function getLocationLabel(id: string) {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return id.slice(0, 8);
    return `${loc.name} (${loc.type === 'WAREHOUSE' ? 'Warehouse' : 'Branch'})`;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/inventory"
            className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-emerald-400" /> Stock Movements & Transfers
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Dispatch and receive inventory across retail branches and storage warehouses with full variance tracking.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border border-red-800 text-red-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Transfers List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-sm">Loading transfers...</div>
      ) : transfers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Truck className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-white font-semibold">No Transfers Recorded</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Transfer inventory between warehouses and retail counters with traceable dispatch and receive handovers.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Create Transfer Draft
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((tr) => (
            <div
              key={tr.id}
              className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">{tr.transferNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      tr.status === 'RECEIVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : tr.status === 'IN_TRANSIT'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : tr.status === 'CANCELLED'
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {tr.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>From: <strong className="text-zinc-200">{getLocationLabel(tr.fromLocationId)}</strong></span>
                  <span>→</span>
                  <span>To: <strong className="text-zinc-200">{getLocationLabel(tr.toLocationId)}</strong></span>
                </div>

                <div className="text-[11px] text-zinc-500">
                  {tr.lines.length} item(s) • Total Qty: {tr.lines.reduce((s, l) => s + l.quantity, 0)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(tr.status === 'DRAFT' || tr.status === 'REQUESTED') && (
                  <>
                    <button
                      type="button"
                      onClick={() => void dispatch(tr.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
                    >
                      Dispatch Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancel(tr.id)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {tr.status === 'IN_TRANSIT' && (
                  <button
                    type="button"
                    onClick={() => void receive(tr)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                  >
                    Receive & Verify
                  </button>
                )}

                {tr.status === 'RECEIVED' && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Received
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" /> New Stock Transfer
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Source Location (Deducted on Dispatch) <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={fromLocId}
                  onChange={(e) => setFromLocId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select origin...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type === 'WAREHOUSE' ? 'Warehouse' : 'Branch'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Destination Location (Added on Receive) <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={toLocId}
                  onChange={(e) => setToLocId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select destination...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.type === 'WAREHOUSE' ? 'Warehouse' : 'Branch'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Product to Transfer <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Quantity <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Draft Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
