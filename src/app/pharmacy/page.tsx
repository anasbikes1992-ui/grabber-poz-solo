'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pill, AlertCircle } from 'lucide-react';

type Rx = {
  id: string;
  prescriptionNumber: string;
  customerName: string;
  doctorName: string | null;
  status: string;
  lines?: Array<{ productName: string; qty: number }>;
};

export default function PharmacyPage() {
  const [rows, setRows] = useState<Rx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ customerName: '', doctorName: '', productName: '', qty: 1 });

  const load = useCallback(async () => {
    const res = await fetch('/api/pharmacy/prescriptions');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setRows(data.prescriptions || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pharmacy/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          doctorName: form.doctorName,
          lines: form.productName ? [{ productName: form.productName, qty: form.qty }] : [],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm({ customerName: '', doctorName: '', productName: '', qty: 1 });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: string) => {
    setError(null);
    try {
      const res = await fetch('/api/pharmacy/prescriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-400" /> Pharmacy
        </h1>
        <p className="text-xs text-muted-foreground">Rx draft → approve → dispense</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Customer"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Doctor"
          value={form.doctorName}
          onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Product / medicine"
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold"
        >
          Create Rx
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Rx #</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 font-mono">{r.prescriptionNumber}</td>
                <td className="py-2">{r.customerName}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2 text-right space-x-1">
                  {r.status === 'DRAFT' && (
                    <button type="button" className="text-emerald-400" onClick={() => act(r.id, 'submit')}>
                      Submit
                    </button>
                  )}
                  {r.status === 'PENDING_APPROVAL' && (
                    <button type="button" className="text-emerald-400" onClick={() => act(r.id, 'approve')}>
                      Approve
                    </button>
                  )}
                  {r.status === 'APPROVED' && (
                    <button type="button" className="text-emerald-400" onClick={() => act(r.id, 'dispense')}>
                      Dispense
                    </button>
                  )}
                  {r.status !== 'DISPENSED' && r.status !== 'CANCELLED' && (
                    <button type="button" className="text-zinc-500" onClick={() => act(r.id, 'cancel')}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No prescriptions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
