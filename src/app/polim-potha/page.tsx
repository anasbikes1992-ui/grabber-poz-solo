'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type Account = {
  id: string;
  name: string;
  phone: string;
  limit: number;
  balance: number;
  available: number;
  status: string;
};

type Entry = {
  id: string;
  customer: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string;
  date: string;
};

export default function PolimPothaPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Account | null>(null);
  const [repayStatus, setRepayStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [repayError, setRepayError] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/polim-potha');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setAccounts(data.accounts || []);
      setEntries(
        (data.entries || []).map((e: Entry & { date: string }) => ({
          ...e,
          date: e.date ? new Date(e.date).toLocaleString() : '—',
        }))
      );
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRepayModal = (customer: Account) => {
    setSelectedCustomer(customer);
    setRepayAmount(customer.balance);
    setRepayStatus('IDLE');
    setRepayError(null);
    setIsRepayModalOpen(true);
  };

  const handlePostRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || isSubmitting) return;
    setIsSubmitting(true);
    setRepayError(null);
    try {
      const res = await fetch('/api/polim-potha/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: Number(repayAmount),
          paymentMethod: 'CASH',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || `Repayment failed (${res.status})`);
      }
      setRepayStatus('SUCCESS');
      await load();
      setTimeout(() => {
        setIsRepayModalOpen(false);
        setRepayStatus('IDLE');
      }, 800);
    } catch (err) {
      setRepayStatus('ERROR');
      setRepayError(err instanceof Error ? err.message : 'Repayment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" /> Polim Potha (Customer Credit & AR)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live accounts via /api/polim-potha</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5">Customer</th>
              <th className="pb-2.5 text-right">Limit</th>
              <th className="pb-2.5 text-right">Balance</th>
              <th className="pb-2.5 text-right">Available</th>
              <th className="pb-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {accounts.map((c) => (
              <tr key={c.id}>
                <td className="py-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{c.phone}</p>
                </td>
                <td className="py-3 text-right font-mono">{c.limit.toFixed(2)}</td>
                <td className="py-3 text-right font-mono text-emerald-400">{c.balance.toFixed(2)}</td>
                <td className="py-3 text-right font-mono">{c.available.toFixed(2)}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    disabled={c.balance <= 0}
                    onClick={() => openRepayModal(c)}
                    className="text-[11px] font-bold text-emerald-400 inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Repay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!accounts.length && <p className="text-xs text-muted-foreground py-3">No credit accounts — seed or create a customer with credit.</p>}
      </div>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <h3 className="font-semibold text-sm mb-3">Recent credit ledger</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2.5">Customer</th>
              <th className="pb-2.5">Type</th>
              <th className="pb-2.5 text-right">Amount</th>
              <th className="pb-2.5 text-right">Balance after</th>
              <th className="pb-2.5 text-right">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-3">{e.customer}</td>
                <td className="py-3 font-mono text-[10px]">{e.type}</td>
                <td className="py-3 text-right font-mono">{e.amount.toFixed(2)}</td>
                <td className="py-3 text-right font-mono">{e.balanceAfter.toFixed(2)}</td>
                <td className="py-3 text-right text-muted-foreground">{e.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isRepayModalOpen} onClose={() => !isSubmitting && setIsRepayModalOpen(false)} title="Post repayment" as="form" onSubmit={handlePostRepayment}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{selectedCustomer?.name} · due {selectedCustomer?.balance.toFixed(2)}</p>
          <div>
            <label htmlFor="repay-amt" className="text-xs font-semibold block mb-1">Amount (LKR)</label>
            <input id="repay-amt" type="number" min={0.01} step="0.01" value={repayAmount} onChange={(e) => setRepayAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono" />
          </div>
          {repayStatus === 'SUCCESS' && (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Posted</p>
          )}
          {repayStatus === 'ERROR' && <p className="text-xs text-destructive">{repayError}</p>}
          {repayStatus !== 'SUCCESS' && (
            <button type="submit" disabled={isSubmitting} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
              Confirm cash repayment
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
