'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Plus, AlertCircle, Download } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type Apt = {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  specialist: string | null;
  startsAt: string;
  fee: string | number;
  status: string;
  commissionPct?: string | number;
  commissionAmount?: string | number;
  source?: string | null;
};

export default function AppointmentsPage() {
  const [rows, setRows] = useState<Apt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    service: 'Haircut',
    specialist: 'Senior Stylist',
    fee: 1500,
    startsAt: new Date().toISOString().slice(0, 16),
  });
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/appointments');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setRows(data.appointments || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, startsAt: new Date(form.startsAt).toISOString() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setIsOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setError(null);
    setNote(null);
    const res = await fetch('/api/appointments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, requireCharge: status === 'COMPLETED' }),
    });
    const data = await res.json();
    if (!data.success) setError(data.error);
    else {
      if (data.charged && data.orderNumber) {
        setNote(`Charged ${data.orderNumber} · LKR ${Number(data.grandTotal || 0).toFixed(2)}`);
      }
      await load();
    }
  };

  const completeAndCharge = async (id: string) => {
    await setStatus(id, 'COMPLETED');
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    const res = await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) setError(data.error);
    else await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" /> Appointments
          </h1>
          <p className="text-xs text-muted-foreground">
            Salon/barber bookings — Complete & charge creates a POS order + depletes service BOM if linked.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/appointments/commissions/export"
            className="min-h-11 px-4 rounded-xl border border-zinc-700 text-xs font-bold flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" /> Commission CSV
          </a>
          <button type="button" onClick={() => setIsOpen(true)} className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> Book
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {note && (
        <p role="status" className="text-xs text-emerald-400">
          {note}
        </p>
      )}
      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Customer</th>
              <th className="pb-2">Service</th>
              <th className="pb-2">When</th>
              <th className="pb-2 text-right">Fee</th>
              <th className="pb-2 text-right">Comm.</th>
              <th className="pb-2 text-right">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="py-2">
                  <p className="font-semibold">{a.customerName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{a.phone}</p>
                </td>
                <td className="py-2">{a.service}</td>
                <td className="py-2 text-muted-foreground">{a.startsAt ? new Date(a.startsAt).toLocaleString() : '—'}</td>
                <td className="py-2 text-right font-mono">{Number(a.fee).toFixed(2)}</td>
                <td className="py-2 text-right font-mono text-[10px] text-muted-foreground">
                  {a.status === 'COMPLETED' && Number(a.commissionAmount || 0) > 0
                    ? Number(a.commissionAmount).toFixed(0)
                    : '—'}
                </td>
                <td className="py-2 text-right">
                  <select
                    aria-label={`Status for ${a.customerName}`}
                    value={a.status}
                    onChange={(e) => setStatus(a.id, e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] px-2 py-1"
                  >
                    {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right space-x-2">
                  {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => void completeAndCharge(a.id)}
                      className="text-emerald-400 font-bold text-[11px]"
                    >
                      Complete & charge
                    </button>
                  )}
                  <button type="button" onClick={() => remove(a.id)} className="text-red-400 font-bold text-[11px]">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No appointments booked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Book appointment" as="form" onSubmit={create}>
        <div className="space-y-3">
          <div>
            <label htmlFor="ap-name" className="text-xs font-semibold block mb-1">Customer</label>
            <input id="ap-name" required value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="ap-phone" className="text-xs font-semibold block mb-1">Phone</label>
            <input id="ap-phone" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="ap-svc" className="text-xs font-semibold block mb-1">Service</label>
            <select
              id="ap-svc"
              required
              value={form.service}
              onChange={(e) => {
                const service = e.target.value;
                const feeMap: Record<string, number> = {
                  Haircut: 1500,
                  'Beard Shave': 800,
                  'Hair Color': 5500,
                  'Blow Dry': 1200,
                };
                setForm((f) => ({ ...f, service, fee: feeMap[service] ?? f.fee }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
            >
              <option>Haircut</option>
              <option>Beard Shave</option>
              <option>Hair Color</option>
              <option>Blow Dry</option>
            </select>
          </div>
          <div>
            <label htmlFor="ap-when" className="text-xs font-semibold block mb-1">Starts</label>
            <input id="ap-when" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          <div>
            <label htmlFor="ap-fee" className="text-xs font-semibold block mb-1">Fee</label>
            <input id="ap-fee" type="number" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">Save</button>
        </div>
      </Modal>
    </div>
  );
}
