'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, AlertCircle } from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  totalAmount: string;
  amountPaid: string;
  status: string;
};

type Supplier = { id: string; name: string };

export default function ApInvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ supplierId: '', invoiceNumber: '', totalAmount: 0 });
  const [payAmount, setPayAmount] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [invRes, supRes] = await Promise.all([fetch('/api/accounts/ap'), fetch('/api/suppliers')]);
    const invData = await invRes.json();
    const supData = await supRes.json();
    if (!invData.success) throw new Error(invData.error);
    setRows(invData.invoices || []);
    if (supData.success) {
      const list = (supData.suppliers || []) as Supplier[];
      setSuppliers(list);
      if (!form.supplierId && list[0]) {
        setForm((f) => ({ ...f, supplierId: list[0].id }));
      }
    }
  }, [form.supplierId]);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/accounts/ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm((f) => ({ ...f, invoiceNumber: '', totalAmount: 0 }));
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const act = async (id: string, action: string, amount?: number) => {
    setError(null);
    try {
      const res = await fetch('/api/accounts/ap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, amount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/accounts" className="text-xs text-zinc-400 hover:text-emerald-400">
          ← Chart of Accounts
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2 mt-2">
          <FileText className="h-5 w-5 text-emerald-400" /> Accounts payable
        </h1>
        <p className="text-xs text-muted-foreground">
          Draft → post (supplier BILL + GL Dr 5000 / Cr 2000) → pay (Dr 2000 / Cr bank)
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-4">
        <select
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
          required
        >
          <option value="">Select supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Invoice #"
          value={form.invoiceNumber}
          onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
          required
        />
        <input
          type="number"
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Total"
          value={form.totalAmount || ''}
          onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
          required
          min={0.01}
          step="0.01"
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Draft invoice
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Invoice</th>
              <th className="pb-2">Supplier</th>
              <th className="pb-2">Total</th>
              <th className="pb-2">Paid</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 font-mono">{r.invoiceNumber}</td>
                <td className="py-2">{supplierName(r.supplierId)}</td>
                <td className="py-2">{Number(r.totalAmount).toLocaleString()}</td>
                <td className="py-2">{Number(r.amountPaid).toLocaleString()}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2 text-right space-x-1">
                  {r.status === 'DRAFT' && (
                    <button type="button" className="text-emerald-400" onClick={() => act(r.id, 'post')}>
                      Post
                    </button>
                  )}
                  {(r.status === 'POSTED' || r.status === 'PARTIAL') && (
                    <>
                      <input
                        type="number"
                        className="w-20 min-h-8 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                        value={payAmount[r.id] ?? Number(r.totalAmount) - Number(r.amountPaid)}
                        onChange={(e) => setPayAmount({ ...payAmount, [r.id]: Number(e.target.value) })}
                      />
                      <button
                        type="button"
                        className="text-emerald-400"
                        onClick={() =>
                          act(r.id, 'pay', payAmount[r.id] ?? Number(r.totalAmount) - Number(r.amountPaid))
                        }
                      >
                        Pay
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-muted-foreground">
                  No AP invoices yet — add a supplier first if the list is empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
