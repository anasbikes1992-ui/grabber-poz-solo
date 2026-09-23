'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Car, AlertCircle } from 'lucide-react';

type Make = { id: string; name: string };
type Model = { id: string; makeId: string; name: string };
type Generation = { id: string; modelId: string; name: string; yearFrom: number | null; yearTo: number | null };
type Compat = { id: string; productId: string; oemCode: string | null; generationName?: string; makeName?: string };

export default function AutoPartsPage() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [compat, setCompat] = useState<Compat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [makeName, setMakeName] = useState('');
  const [modelForm, setModelForm] = useState({ makeId: '', name: '' });
  const [genForm, setGenForm] = useState({ modelId: '', name: '', yearFrom: 2015, yearTo: 2020 });
  const [fitForm, setFitForm] = useState({ generationId: '', productId: '', oemCode: '' });

  const load = useCallback(async () => {
    const res = await fetch('/api/auto-parts/vehicles');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setMakes(data.makes || []);
    setModels(data.models || []);
    setGenerations(data.generations || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  const postVehicle = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch('/api/auto-parts/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await load();
  };

  const addFit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/auto-parts/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fitForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (fitForm.productId) {
        const list = await fetch(`/api/auto-parts/compatibility?productId=${fitForm.productId}`);
        const listData = await list.json();
        setCompat(listData.compatibility || []);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Car className="h-5 w-5 text-emerald-400" /> Auto parts fitment
        </h1>
        <p className="text-xs text-muted-foreground">Makes / models / generations + OEM compatibility</p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            postVehicle({ type: 'make', name: makeName }).then(() => setMakeName('')).catch((err) => setError(err.message));
          }}
        >
          <input
            className="min-h-11 flex-1 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            placeholder="Make"
            value={makeName}
            onChange={(e) => setMakeName(e.target.value)}
            required
          />
          <button type="submit" className="min-h-11 px-3 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
            Add
          </button>
        </form>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            postVehicle({ type: 'model', ...modelForm })
              .then(() => setModelForm({ makeId: '', name: '' }))
              .catch((err) => setError(err.message));
          }}
        >
          <select
            className="min-h-11 px-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            value={modelForm.makeId}
            onChange={(e) => setModelForm({ ...modelForm, makeId: e.target.value })}
            required
          >
            <option value="">Make</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            className="min-h-11 flex-1 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            placeholder="Model"
            value={modelForm.name}
            onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
            required
          />
          <button type="submit" className="min-h-11 px-3 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
            Add
          </button>
        </form>

        <form
          className="flex gap-2 flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            postVehicle({ type: 'generation', ...genForm }).catch((err) => setError(err.message));
          }}
        >
          <select
            className="min-h-11 px-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            value={genForm.modelId}
            onChange={(e) => setGenForm({ ...genForm, modelId: e.target.value })}
            required
          >
            <option value="">Model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            className="min-h-11 w-24 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
            placeholder="Gen"
            value={genForm.name}
            onChange={(e) => setGenForm({ ...genForm, name: e.target.value })}
            required
          />
          <button type="submit" className="min-h-11 px-3 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
            Gen
          </button>
        </form>
      </div>

      <form onSubmit={addFit} className="p-5 rounded-2xl glass-card grid gap-3 sm:grid-cols-4">
        <select
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          value={fitForm.generationId}
          onChange={(e) => setFitForm({ ...fitForm, generationId: e.target.value })}
          required
        >
          <option value="">Generation</option>
          {generations.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.yearFrom}-{g.yearTo})
            </option>
          ))}
        </select>
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="Product UUID"
          value={fitForm.productId}
          onChange={(e) => setFitForm({ ...fitForm, productId: e.target.value })}
          required
        />
        <input
          className="min-h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="OEM code"
          value={fitForm.oemCode}
          onChange={(e) => setFitForm({ ...fitForm, oemCode: e.target.value })}
        />
        <button type="submit" className="min-h-11 px-4 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold">
          Link fitment
        </button>
      </form>

      <div className="p-5 rounded-2xl glass-card overflow-x-auto">
        <p className="text-xs text-muted-foreground mb-3">
          {makes.length} makes · {models.length} models · {generations.length} generations
        </p>
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-muted-foreground">
              <th className="pb-2">Product</th>
              <th className="pb-2">OEM</th>
              <th className="pb-2">Vehicle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {compat.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-mono text-[10px]">{c.productId.slice(0, 8)}…</td>
                <td className="py-2">{c.oemCode || '—'}</td>
                <td className="py-2">
                  {c.makeName} {c.generationName}
                </td>
              </tr>
            ))}
            {compat.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  Link a product to see compatibility rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
