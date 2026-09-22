'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, AlertCircle } from 'lucide-react';

type Account = { id: string; name: string; bankName: string; currency: string; active: boolean };
type Recon = { id: string; accountId: string; status: string; statementDate: string; closingBalance: string };

export default function BankPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recons, setRecons] = useState<Recon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', bankName: '', accountNumberMasked: '' });
  const [reconForm, setReconForm] = useState({ accountId: '', closingBalance: 0, lineAmount: 0, lineDesc: '' });

  const load = useCallback(async () => {
    const res = await fetch('/api/accounts/bank');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setAccounts(data.accounts || []);
    setRecons(data.reconciliations || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/accounts/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setForm({ name: '', bankName: '', accountNumberMasked: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startRecon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/accounts/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'reconciliation',
          accountId: reconForm.accountId,
          statementDate: new Date().toISOString(),
          closingBalance: reconForm.closingBalance,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addLine = async (reconciliationId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/accounts/bank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_line',
          reconciliationId,
          amount: reconForm.lineAmount,
          description: reconForm.lineDesc,
          cleared: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const complete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch('/api/accounts/bank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', id }),
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
          <Landmark className="h-5 w-5 text-emerald-400" /> Bank reconciliation
        </h1>
        <p className="text-xs text-muted-foreground">Accounts + open/complete statement reconciliations</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={createAccount} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-4">
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Account name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Bank"
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Masked number"
          value={form.accountNumberMasked}
          onChange={(e) => setForm({ ...form, accountNumberMasked: e.target.value })}
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Add account
        </button>
      </form>

      <form onSubmit={startRecon} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-3">
        <select
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          value={reconForm.accountId}
          onChange={(e) => setReconForm({ ...reconForm, accountId: e.target.value })}
          required
        >
          <option value="">Account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.bankName})
            </option>
          ))}
        </select>
        <input
          type="number"
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Closing balance"
          value={reconForm.closingBalance}
          onChange={(e) => setReconForm({ ...reconForm, closingBalance: Number(e.target.value) })}
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Open recon
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Recon</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Closing</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {recons.map((r) => (
              <tr key={r.id}>
                <td className="py-2 font-mono text-[10px]">{r.id.slice(0, 8)}…</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2">{Number(r.closingBalance).toLocaleString()}</td>
                <td className="py-2 text-right space-x-2">
                  {r.status === 'OPEN' && (
                    <>
                      <button type="button" className="text-zinc-400" onClick={() => addLine(r.id)}>
                        Add line
                      </button>
                      <button type="button" className="text-emerald-400" onClick={() => complete(r.id)}>
                        Complete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {recons.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No reconciliations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
