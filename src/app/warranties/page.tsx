'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, ArrowLeft, Plus } from 'lucide-react';

type Warranty = {
  id: string;
  serial: string;
  productName: string;
  customerName: string;
  expiresAt: string;
};

export default function WarrantiesPage() {
  const [items, setItems] = useState<Warranty[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/warranties')
      .then((r) => r.json())
      .then((d) => setItems(d.warranties || []))
      .catch(() => {});
  }, []);

  const filtered = items.filter(
    (w) =>
      w.serial?.includes(q) ||
      w.productName?.toLowerCase().includes(q.toLowerCase()) ||
      w.customerName?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-400" /> Serial & Warranty Registry
        </h1>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search IMEI, serial, product…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white"
        />
      </div>

      <div className="grid gap-3">
        {filtered.map((w) => (
          <div key={w.id} className="p-4 rounded-2xl glass-card border border-zinc-800">
            <div className="font-mono text-emerald-400 text-sm">{w.serial}</div>
            <div className="font-bold text-white mt-1">{w.productName}</div>
            <div className="text-xs text-zinc-400">{w.customerName} · Expires {w.expiresAt}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No warranty records yet. Register serials when selling electronics.
          </p>
        )}
      </div>

      <button
        type="button"
        className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Register Serial (coming soon)
      </button>
    </div>
  );
}
