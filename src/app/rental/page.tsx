'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Package, AlertCircle } from 'lucide-react';

type Asset = { id: string; code: string; name: string; status: string; dailyRate: string };
type Contract = {
  id: string;
  contractNumber: string;
  assetId: string;
  customerName: string;
  status: string;
  depositAmount: string;
};

export default function RentalPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({ code: '', name: '', dailyRate: 0, depositDefault: 0 });
  const [contractForm, setContractForm] = useState({ assetId: '', customerName: '' });

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([fetch('/api/rental/assets'), fetch('/api/rental/contracts')]);
    const aData = await aRes.json();
    const cData = await cRes.json();
    if (!aData.success) throw new Error(aData.error);
    if (!cData.success) throw new Error(cData.error);
    setAssets(aData.assets || []);
    setContracts(cData.contracts || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/rental/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAssetForm({ code: '', name: '', dailyRate: 0, depositDefault: 0 });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/rental/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setContractForm({ assetId: '', customerName: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const act = async (id: string, action: string) => {
    setError(null);
    try {
      const res = await fetch('/api/rental/contracts', {
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
          <Package className="h-5 w-5 text-emerald-400" /> Rental
        </h1>
        <p className="text-xs text-muted-foreground">Assets + contracts (activate / return / dispute)</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <form onSubmit={createAsset} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-4">
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Asset code"
          value={assetForm.code}
          onChange={(e) => setAssetForm({ ...assetForm, code: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Name"
          value={assetForm.name}
          onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
          required
        />
        <input
          type="number"
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Daily rate"
          value={assetForm.dailyRate}
          onChange={(e) => setAssetForm({ ...assetForm, dailyRate: Number(e.target.value) })}
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Add asset
        </button>
      </form>

      <form onSubmit={createContract} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-3">
        <select
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          value={contractForm.assetId}
          onChange={(e) => setContractForm({ ...contractForm, assetId: e.target.value })}
          required
        >
          <option value="">Select asset</option>
          {assets
            .filter((a) => a.status === 'AVAILABLE')
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
        </select>
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Customer"
          value={contractForm.customerName}
          onChange={(e) => setContractForm({ ...contractForm, customerName: e.target.value })}
          required
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Draft contract
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Contract</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {contracts.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-mono">{c.contractNumber}</td>
                <td className="py-2">{c.customerName}</td>
                <td className="py-2">{c.status}</td>
                <td className="py-2 text-right space-x-1">
                  {c.status === 'DRAFT' && (
                    <button type="button" className="text-emerald-400" onClick={() => act(c.id, 'activate')}>
                      Activate
                    </button>
                  )}
                  {c.status === 'ACTIVE' && (
                    <>
                      <button type="button" className="text-emerald-400" onClick={() => act(c.id, 'return')}>
                        Return
                      </button>
                      <button type="button" className="text-amber-400" onClick={() => act(c.id, 'dispute')}>
                        Dispute
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No contracts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
