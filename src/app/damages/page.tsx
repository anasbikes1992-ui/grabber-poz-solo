'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus, Search, Trash2, ArrowLeft, CheckCircle2, ImageIcon } from 'lucide-react';

type Damage = {
  id: string;
  productName: string;
  quantity: number;
  totalLoss: number;
  reason: string;
  status?: string;
  photoUrl?: string;
  journalEntryId?: string;
  recordedAt: string;
};

export default function DamagesPage() {
  const [damages, setDamages] = useState<Damage[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    fetch('/api/damages')
      .then((r) => r.json())
      .then((d) => setDamages(d.damages || []));

  useEffect(() => {
    void load();
  }, []);

  const filtered = damages.filter((d) => d.productName?.toLowerCase().includes(search.toLowerCase()));

  async function createDamage(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/damages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, quantity, unitCost, photoUrl }),
    });
    setOpen(false);
    setProductName('');
    setPhotoUrl('');
    void load();
  }

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/damages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      void load();
    } finally {
      setBusyId(null);
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
            <AlertTriangle className="w-6 h-6 text-amber-400" /> Damages & Write-Off
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Photo evidence + GL write-off on manager approve</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer btn-press"
        >
          <Plus className="w-4 h-4" /> Record Damage
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search damage records…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
        />
      </div>

      <div className="grid gap-3">
        {filtered.map((d) => (
          <div key={d.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex justify-between gap-4">
            <div className="flex gap-3">
              {d.photoUrl ? (
                <img src={d.photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-zinc-700" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-zinc-600" />
                </div>
              )}
              <div>
                <div className="font-bold text-white">{d.productName}</div>
                <div className="text-xs text-zinc-400">
                  Qty {d.quantity} · {d.reason} · {d.status || 'PENDING'}
                </div>
                <div className="text-xs text-amber-400 mt-1">Loss LKR {Number(d.totalLoss || 0).toLocaleString()}</div>
                {d.journalEntryId && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GL posted
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {(d.status || 'PENDING') === 'PENDING' && (
                <button
                  type="button"
                  disabled={busyId === d.id}
                  onClick={() => void approve(d.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-[11px] font-bold disabled:opacity-50"
                >
                  Approve & write-off
                </button>
              )}
              <button
                type="button"
                onClick={() => fetch(`/api/damages?id=${d.id}`, { method: 'DELETE' }).then(() => load())}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                aria-label="Delete damage record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <form onSubmit={createDamage} className="w-full max-w-lg p-6 rounded-2xl glass-card border border-zinc-700 space-y-4">
            <h2 className="font-bold text-white">Record Stock Damage</h2>
            <input
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
              />
              <input
                type="number"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                placeholder="Unit cost"
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
              />
            </div>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Photo URL (evidence)"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-zinc-400 text-sm cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm cursor-pointer">
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
