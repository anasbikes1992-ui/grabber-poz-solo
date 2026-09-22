'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck, AlertCircle, ArrowLeft } from 'lucide-react';

type Submission = {
  id: string;
  orderNumber: string;
  status: string;
  providerRef: string | null;
  errorMessage: string | null;
  submittedAt: string | null;
};

export default function EinvoicePage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/compliance/einvoice');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setRows(data.submissions || []);
    setProviderConfigured(Boolean(data.providerConfigured));
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/compliance/einvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOrderNumber('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const act = async (id: string, action: 'queue' | 'submit') => {
    setError(null);
    try {
      const res = await fetch('/api/compliance/einvoice', {
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
        <Link href="/accounts" className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Accounts
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-sky-400" /> Tax e-invoice
        </h1>
        <p className="text-xs text-muted-foreground">
          IRD-oriented tax invoice drafts from orders
          {providerConfigured ? ' · provider URL configured' : ' · local queue until EINVOICE_PROVIDER_URL is set'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={createDraft} className="p-5 rounded-2xl glass-card flex flex-wrap gap-3 items-center">
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex-1 min-w-[12rem]"
          placeholder="Order number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-sky-500 text-zinc-950 text-xs font-bold">
          Create draft
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Order</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Provider ref</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 font-mono">{r.orderNumber}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2 text-muted-foreground">{r.providerRef || r.errorMessage || '—'}</td>
                <td className="py-2 flex flex-wrap gap-2">
                  {r.status === 'DRAFT' && (
                    <button
                      type="button"
                      className="min-h-9 px-2 rounded-lg border border-zinc-700"
                      onClick={() => act(r.id, 'queue')}
                    >
                      Queue
                    </button>
                  )}
                  {(r.status === 'DRAFT' || r.status === 'QUEUED' || r.status === 'REJECTED') && (
                    <button
                      type="button"
                      className="min-h-9 px-2 rounded-lg border border-sky-700 text-sky-300"
                      onClick={() => act(r.id, 'submit')}
                    >
                      Submit now
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No e-invoice submissions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
