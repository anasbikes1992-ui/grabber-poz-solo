'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  segment?: string;
  creditAllowed: boolean;
  creditLimit: number;
  currentBalance: number;
}

const SEGMENTS = ['ALL', 'NEW', 'SILVER', 'GOLD', 'VIP', 'LAPSED'] as const;

export default function CustomersCRUDPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<(typeof SEGMENTS)[number]>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditAllowed, setCreditAllowed] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);
  const [segment, setSegment] = useState('NEW');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setCustomers(data.customers || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('+94');
    setEmail('');
    setAddress('');
    setCreditAllowed(false);
    setCreditLimit(0);
    setSegment('NEW');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setCreditAllowed(c.creditAllowed);
    setCreditLimit(c.creditLimit);
    setSegment(c.segment || 'NEW');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name,
        phone,
        email,
        address,
        creditAllowed,
        creditLimit: Number(creditLimit),
        segment,
      };
      const res = await fetch('/api/customers', {
        method: editingCustomer ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer ? { id: editingCustomer.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSaveSuccess(true);
      await load();
      setTimeout(() => {
        setIsModalOpen(false);
        setSaveSuccess(false);
      }, 600);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      (segmentFilter === 'ALL' || (c.segment || 'NEW') === segmentFilter) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" /> Customers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Durable CRM via /api/customers</p>
        </div>
        <button type="button" onClick={openCreateModal} className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2">
          <Plus className="h-3.5 w-3.5" /> New Customer
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSegmentFilter(s)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${
              segmentFilter === s ? 'border-emerald-400 text-emerald-400' : 'border-zinc-800 text-zinc-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <label htmlFor="cust-search" className="sr-only">Search</label>
        <input id="cust-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800" />
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5">Name</th>
              <th className="pb-2.5">Phone</th>
              <th className="pb-2.5">Segment</th>
              <th className="pb-2.5 text-right">Credit limit</th>
              <th className="pb-2.5 text-right">Balance</th>
              <th className="pb-2.5 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="py-3 font-semibold">{c.name}</td>
                <td className="py-3 font-mono text-muted-foreground">{c.phone}</td>
                <td className="py-3 text-[10px] font-bold text-purple-300">{c.segment || 'NEW'}</td>
                <td className="py-3 text-right font-mono">{c.creditLimit.toFixed(2)}</td>
                <td className="py-3 text-right font-mono text-emerald-400">{c.currentBalance.toFixed(2)}</td>
                <td className="py-3 text-right">
                  <button type="button" onClick={() => openEditModal(c)} className="p-1.5 rounded-lg hover:bg-zinc-800" aria-label={`Edit ${c.name}`}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !busy && setIsModalOpen(false)} title={editingCustomer ? 'Edit customer' : 'New customer'} as="form" onSubmit={handleSave}>
        <div className="space-y-3">
          <div>
            <label htmlFor="c-name" className="text-xs font-semibold block mb-1">Name</label>
            <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="c-phone" className="text-xs font-semibold block mb-1">Phone</label>
            <input id="c-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
          </div>
          <div>
            <label htmlFor="c-email" className="text-xs font-semibold block mb-1">Email</label>
            <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="c-addr" className="text-xs font-semibold block mb-1">Address</label>
            <input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="c-segment" className="text-xs font-semibold block mb-1">CRM segment</label>
            <select
              id="c-segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            >
              {SEGMENTS.filter((s) => s !== 'ALL').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="c-credit" type="checkbox" checked={creditAllowed} onChange={(e) => setCreditAllowed(e.target.checked)} />
            <label htmlFor="c-credit" className="text-xs font-semibold">Allow Polim credit</label>
          </div>
          <div>
            <label htmlFor="c-limit" className="text-xs font-semibold block mb-1">Credit limit</label>
            <input id="c-limit" type="number" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
          </div>
          {saveSuccess ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</p>
          ) : (
            <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
          )}
        </div>
      </Modal>
    </div>
  );
}
