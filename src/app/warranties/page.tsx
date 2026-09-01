'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Search, ArrowLeft, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

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
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    serial: '',
    productName: '',
    customerName: '',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/warranties');
    const d = await res.json();
    setItems(d.warranties || []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const filtered = items.filter(
    (w) =>
      w.serial?.includes(q) ||
      w.productName?.toLowerCase().includes(q.toLowerCase()) ||
      w.customerName?.toLowerCase().includes(q.toLowerCase()),
  );

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setIsOpen(false);
      setForm({
        serial: '',
        productName: '',
        customerName: '',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" /> Serial & Warranty Registry
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="min-h-11 px-4 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Register Serial
        </button>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

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
            <div className="text-xs text-zinc-400">
              {w.customerName} · Expires {w.expiresAt}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 p-8 text-center glass-card rounded-2xl border border-zinc-800">
            No warranty records yet. Register serials when selling electronics.
          </p>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Register serial / warranty" as="form" onSubmit={register}>
        <div className="space-y-3">
          <div>
            <label htmlFor="w-serial" className="text-xs font-semibold block mb-1">
              Serial / IMEI
            </label>
            <input
              id="w-serial"
              required
              value={form.serial}
              onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="w-product" className="text-xs font-semibold block mb-1">
              Product
            </label>
            <input
              id="w-product"
              required
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            />
          </div>
          <div>
            <label htmlFor="w-customer" className="text-xs font-semibold block mb-1">
              Customer
            </label>
            <input
              id="w-customer"
              required
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            />
          </div>
          <div>
            <label htmlFor="w-expires" className="text-xs font-semibold block mb-1">
              Expires
            </label>
            <input
              id="w-expires"
              type="date"
              required
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            />
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-blue-500 text-white text-xs font-bold disabled:opacity-50">
            Save warranty
          </button>
        </div>
      </Modal>
    </div>
  );
}
