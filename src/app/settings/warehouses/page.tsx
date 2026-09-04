'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Warehouse, ArrowLeft, Plus, Building2, MapPin, Package, CheckCircle2, AlertCircle } from 'lucide-react';

type WarehouseItem = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  active: boolean;
  branchId: string | null;
  branchName: string | null;
  totalOnHand: number;
  totalReserved: number;
  uniqueSkus: number;
  createdAt: string;
};

type BranchItem = {
  id: string;
  name: string;
  code: string;
};

export default function WarehousesSettingsPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [branchId, setBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [whRes, brRes] = await Promise.all([
        fetch('/api/warehouses'),
        fetch('/api/branches').catch(() => null),
      ]);

      const whData = await whRes.json();
      if (whData.success) setWarehouses(whData.warehouses || []);

      if (brRes) {
        const brData = await brRes.json();
        if (brData.success) setBranches(brData.branches || []);
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to load warehouses data' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !code) {
      setMsg({ type: 'error', text: 'Name and Code are required' });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          address: address || null,
          branchId: branchId || null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMsg({ type: 'error', text: data.error || 'Failed to create warehouse' });
        return;
      }

      setMsg({ type: 'success', text: `Warehouse "${name}" created successfully` });
      setName('');
      setCode('');
      setAddress('');
      setBranchId('');
      setShowModal(false);
      void loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error submitting request' });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(wh: WarehouseItem) {
    try {
      const res = await fetch('/api/warehouses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wh.id,
          active: !wh.active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWarehouses((prev) =>
          prev.map((w) => (w.id === wh.id ? { ...w, active: !w.active } : w)),
        );
      }
    } catch {
      // silently fail toggle
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/settings"
            className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-emerald-400" /> Warehouses & Storage Hubs
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage physical warehouses, central distribution facilities, and linked retail branches.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" /> Add Warehouse
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

      {/* Warehouses Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-sm">Loading warehouses...</div>
      ) : warehouses.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Warehouse className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-white font-semibold">No Warehouses Configured</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Create central or regional warehouses to track inventory separately from retail counter shops and execute stock transfers.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Create First Warehouse
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{w.name}</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      {w.code}
                    </span>
                  </div>
                  {w.branchName ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Linked Branch: {w.branchName}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 mt-1 block">Central Distribution Hub</span>
                  )}
                </div>

                <button
                  onClick={() => toggleActive(w)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    w.active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {w.active ? 'Active' : 'Inactive'}
                </button>
              </div>

              {w.address && (
                <div className="flex items-start gap-1.5 text-xs text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                  <span>{w.address}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-center">
                <div className="p-2 rounded-xl bg-zinc-950/40">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">SKUs</div>
                  <div className="text-sm font-bold text-white mt-0.5">{w.uniqueSkus}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950/40">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">On Hand</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{w.totalOnHand}</div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-950/40">
                  <div className="text-[10px] text-zinc-500 uppercase font-semibold">Reserved</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{w.totalReserved}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-emerald-400" /> New Warehouse
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Warehouse Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Warehouse, Pettah Depot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Warehouse Code <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-01, DEPOT-MAIN"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm uppercase font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Linked Retail Branch (Optional)
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">None (Standalone Central Warehouse)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Optional link if this warehouse acts as back-room storage for a specific retail branch.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 104 Main Street, Colombo 11"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                  {submitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
