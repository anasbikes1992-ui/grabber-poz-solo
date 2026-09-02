'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, AlertCircle, CheckCircle2, CalendarClock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type ScheduleRow = { number: number; dueDate: string; amount: number; paid: boolean };
type Arrears = { overdue: boolean; daysPastDue: number; arrearsAmount: number; missedInstallments: number };

type Contract = {
  id: string;
  contractNumber: string;
  customerName: string;
  nicNumber: string;
  phone: string;
  itemName: string;
  totalCashPrice: number;
  downPayment: number;
  monthlyEmi: number;
  totalMonths: number;
  paidMonths: number;
  status: string;
  nextDueDate: string | null;
  arrears: Arrears;
  schedule: ScheduleRow[];
};

export default function HirePurchasePage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState({ totalArrears: 0, overdueCount: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    nicNumber: '',
    phone: '',
    itemName: '',
    totalCashPrice: 100000,
    downPayment: 20000,
    totalMonths: 12,
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/hire-purchase');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setContracts(data.contracts || []);
    setSummary(data.summary || { totalArrears: 0, overdueCount: 0 });
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/hire-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const pay = async (contractId: string) => {
    try {
      const res = await fetch('/api/hire-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay_installment', contractId }),
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
      <div className="flex justify-between gap-4 items-start">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" /> Hire purchase
          </h1>
          <p className="text-xs text-muted-foreground">EMI schedule + arrears via /api/hire-purchase</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold flex items-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> New contract
        </button>
      </div>

      {summary.overdueCount > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-start gap-2">
          <CalendarClock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">
              {summary.overdueCount} contract(s) in arrears — LKR {summary.totalArrears.toLocaleString()} outstanding
            </p>
            <p className="text-amber-200/70 mt-1">Overdue accounts auto-mark OVERDUE on load.</p>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Contract</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Next due</th>
              <th className="pb-2 text-right">EMI</th>
              <th className="pb-2 text-right">Paid</th>
              <th className="pb-2 text-right">Arrears</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {contracts.map((c) => (
              <React.Fragment key={c.id}>
                <tr>
                  <td className="py-2 font-mono">
                    <button type="button" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} className="text-left">
                      {c.contractNumber}
                      <span className="block text-[10px] text-zinc-500">{c.status}</span>
                    </button>
                  </td>
                  <td className="py-2">
                    {c.customerName}
                    <span className="block text-[10px] text-muted-foreground">{c.itemName}</span>
                  </td>
                  <td className="py-2 font-mono text-[11px]">
                    {c.nextDueDate ? new Date(c.nextDueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-right font-mono">{Number(c.monthlyEmi).toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">
                    {c.paidMonths}/{c.totalMonths}
                  </td>
                  <td className="py-2 text-right">
                    {c.arrears?.overdue ? (
                      <span className="text-amber-400 font-bold font-mono">
                        LKR {Number(c.arrears.arrearsAmount).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-emerald-400">Current</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {c.status !== 'SETTLED' && c.status !== 'CANCELLED' && (
                      <button type="button" onClick={() => pay(c.id)} className="text-emerald-400 font-bold text-[11px]">
                        Pay EMI
                      </button>
                    )}
                    {c.status === 'SETTLED' && (
                      <span className="text-emerald-400 inline-flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" /> Settled
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr>
                    <td colSpan={7} className="pb-3">
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                        <p className="text-[10px] font-bold text-zinc-400 mb-2">Payment schedule</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {c.schedule?.map((s) => (
                            <div
                              key={s.number}
                              className={`p-2 rounded-lg text-[10px] border ${
                                s.paid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800'
                              }`}
                            >
                              <p className="font-mono">#{s.number}</p>
                              <p>{s.dueDate}</p>
                              <p className="font-bold">LKR {s.amount.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New HP contract" as="form" onSubmit={create}>
        <div className="space-y-3">
          {(['customerName', 'nicNumber', 'phone', 'itemName'] as const).map((k) => (
            <div key={k}>
              <label htmlFor={`hp-${k}`} className="text-xs font-semibold block mb-1">
                {k}
              </label>
              <input
                id={`hp-${k}`}
                required
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="hp-price" className="text-xs font-semibold block mb-1">
                Cash price
              </label>
              <input
                id="hp-price"
                type="number"
                value={form.totalCashPrice}
                onChange={(e) => setForm((f) => ({ ...f, totalCashPrice: Number(e.target.value) }))}
                className="w-full px-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="hp-down" className="text-xs font-semibold block mb-1">
                Down
              </label>
              <input
                id="hp-down"
                type="number"
                value={form.downPayment}
                onChange={(e) => setForm((f) => ({ ...f, downPayment: Number(e.target.value) }))}
                className="w-full px-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="hp-months" className="text-xs font-semibold block mb-1">
                Months
              </label>
              <input
                id="hp-months"
                type="number"
                value={form.totalMonths}
                onChange={(e) => setForm((f) => ({ ...f, totalMonths: Number(e.target.value) }))}
                className="w-full px-2 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono"
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
