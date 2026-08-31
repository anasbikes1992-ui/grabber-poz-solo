'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  paymentTerms: string;
  currentBalance: number;
}

export default function SuppliersCRUDPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setSuppliers(data.suppliers || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setPhone('+94');
    setEmail('');
    setPaymentTerms('NET_30');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactName(s.contactName);
    setPhone(s.phone);
    setEmail(s.email);
    setPaymentTerms(s.paymentTerms);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name, contactName, phone, email, paymentTerms };
      const res = await fetch('/api/suppliers', {
        method: editingSupplier ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSupplier ? { id: editingSupplier.id, ...payload } : payload),
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

  const filtered = suppliers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-400" /> Suppliers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Durable AP via /api/suppliers</p>
        </div>
        <button type="button" onClick={openCreateModal} className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2">
          <Plus className="h-3.5 w-3.5" /> New Supplier
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <label htmlFor="sup-search" className="sr-only">Search</label>
        <input id="sup-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers…" className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-800" />
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5">Supplier</th>
              <th className="pb-2.5">Contact</th>
              <th className="pb-2.5">Terms</th>
              <th className="pb-2.5 text-right">AP balance</th>
              <th className="pb-2.5 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="py-3 font-semibold">{s.name}</td>
                <td className="py-3 text-muted-foreground">{s.contactName || s.phone}</td>
                <td className="py-3 font-mono">{s.paymentTerms}</td>
                <td className="py-3 text-right font-mono">{s.currentBalance.toFixed(2)}</td>
                <td className="py-3 text-right">
                  <button type="button" onClick={() => openEditModal(s)} className="p-1.5 rounded-lg hover:bg-zinc-800" aria-label={`Edit ${s.name}`}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !busy && setIsModalOpen(false)} title={editingSupplier ? 'Edit supplier' : 'New supplier'} as="form" onSubmit={handleSave}>
        <div className="space-y-3">
          <div>
            <label htmlFor="s-name" className="text-xs font-semibold block mb-1">Name</label>
            <input id="s-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="s-contact" className="text-xs font-semibold block mb-1">Contact</label>
            <input id="s-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="s-phone" className="text-xs font-semibold block mb-1">Phone</label>
              <input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
            </div>
            <div>
              <label htmlFor="s-email" className="text-xs font-semibold block mb-1">Email</label>
              <input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="s-terms" className="text-xs font-semibold block mb-1">Payment terms</label>
            <select id="s-terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              <option value="NET_15">NET_15</option>
              <option value="NET_30">NET_30</option>
              <option value="NET_45">NET_45</option>
            </select>
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
