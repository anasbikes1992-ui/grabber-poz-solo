'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  RefreshCw,
  Save,
} from 'lucide-react';

type Supplier = { id: string; name: string; active: boolean };
type Warehouse = { id: string; name: string; code: string; active: boolean };

type Recommendation = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  supplierId: string | null;
  supplierName: string;
  warehouseId: string | null;
  warehouseName: string;
  approvedPoId: string | null;
  status: string;
  suggestedOrderQty: number;
  unitCost: number;
  reason: string;
  notes: string;
  createdAt: string;
  reviewedAt: string | null;
  available: number | null;
  reorderPoint: number | null;
  stockoutRisk: string | null;
  classification: string | null;
};

type ApiResponse = {
  success: boolean;
  recommendations?: Recommendation[];
  suppliers?: Supplier[];
  warehouses?: Warehouse[];
  stats?: { total: number; draft: number; approved: number; poCreated: number };
  error?: string;
  setupMessage?: string;
};

const statusTone: Record<string, string> = {
  DRAFT: 'border-zinc-700 bg-zinc-900 text-zinc-200',
  REVIEWED: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  APPROVED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  REJECTED: 'border-red-500/40 bg-red-500/10 text-red-200',
  PO_CREATED: 'border-purple-500/40 bg-purple-500/10 text-purple-200',
  ARCHIVED: 'border-zinc-700 bg-zinc-950 text-zinc-400',
};

export default function ReplenishmentRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<ApiResponse['stats']>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [edits, setEdits] = useState<Record<string, Partial<Recommendation>>>({});

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.active), [suppliers]);
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.active), [warehouses]);

  const load = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/purchasing/recommendations', { cache: 'no-store' });
      const data = (await response.json()) as ApiResponse;
      if (!data.success) throw new Error(data.setupMessage || data.error || 'Could not load recommendations');
      setRecommendations(data.recommendations || []);
      setSuppliers(data.suppliers || []);
      setWarehouses(data.warehouses || []);
      setStats(data.stats);
      const nextEdits: Record<string, Partial<Recommendation>> = {};
      for (const rec of data.recommendations || []) {
        nextEdits[rec.id] = {
          supplierId: rec.supplierId || data.suppliers?.find((s) => s.active)?.id || '',
          warehouseId: rec.warehouseId || data.warehouses?.find((w) => w.active)?.id || '',
          suggestedOrderQty: rec.suggestedOrderQty,
          unitCost: rec.unitCost,
          notes: rec.notes || '',
        };
      }
      setEdits(nextEdits);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patchEdit = (id: string, patch: Partial<Recommendation>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveReview = async (id: string, status = 'REVIEWED') => {
    const edit = edits[id] || {};
    setSavingId(id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/purchasing/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          supplierId: edit.supplierId || null,
          targetWarehouseId: edit.warehouseId || null,
          suggestedOrderQty: Number(edit.suggestedOrderQty || 1),
          unitCost: Number(edit.unitCost || 0),
          notes: edit.notes || '',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save review');
      setMessage('Recommendation updated');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId('');
    }
  };

  const createDraftPo = async (rec: Recommendation) => {
    const edit = edits[rec.id] || {};
    if (!edit.supplierId || !edit.warehouseId) {
      setError('Choose supplier and warehouse before creating a draft PO');
      return;
    }
    setSavingId(rec.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/purchasing/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: rec.id,
          supplierId: edit.supplierId,
          warehouseId: edit.warehouseId,
          quantity: Number(edit.suggestedOrderQty || rec.suggestedOrderQty || 1),
          unitCost: Number(edit.unitCost || rec.unitCost || 0),
          notes: edit.notes || '',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not create draft PO');
      setMessage(`Draft PO created: ${data.purchaseOrder?.poNumber || data.purchaseOrder?.id}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/purchasing" className="mb-2 flex items-center gap-1 text-xs text-zinc-400 transition hover:text-emerald-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Purchasing
          </Link>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Controlled purchasing</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight">
            <ClipboardList className="h-6 w-6 text-emerald-300" />
            Replenishment Review Queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review demand-planning recommendations, choose supplier and warehouse, then create a draft PO. GRN remains the only stock-receipt path.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-black transition hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total', stats?.total ?? 0],
          ['Draft', stats?.draft ?? 0],
          ['Approved', stats?.approved ?? 0],
          ['PO Created', stats?.poCreated ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-black tabular-nums">{loading ? '...' : value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </section>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="space-y-4">
        {recommendations.map((rec) => {
          const edit = edits[rec.id] || {};
          const locked = rec.status === 'PO_CREATED' || Boolean(rec.approvedPoId);
          return (
            <article key={rec.id} className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">{rec.productName}</h2>
                      <p className="text-xs text-muted-foreground">{rec.sku}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${statusTone[rec.status] || statusTone.DRAFT}`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{rec.reason}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Metric label="Available" value={rec.available ?? '-'} />
                    <Metric label="Reorder point" value={rec.reorderPoint ?? '-'} />
                    <Metric label="Risk" value={rec.stockoutRisk || '-'} />
                    <Metric label="Class" value={rec.classification || '-'} />
                  </div>
                  {rec.approvedPoId && (
                    <p className="mt-3 text-xs font-bold text-purple-200">Linked PO: {rec.approvedPoId}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-bold">
                    Supplier
                    <select
                      value={String(edit.supplierId || '')}
                      onChange={(event) => patchEdit(rec.id, { supplierId: event.target.value })}
                      disabled={locked}
                      className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                    >
                      <option value="">Select supplier</option>
                      {activeSuppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold">
                    Warehouse
                    <select
                      value={String(edit.warehouseId || '')}
                      onChange={(event) => patchEdit(rec.id, { warehouseId: event.target.value })}
                      disabled={locked}
                      className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                    >
                      <option value="">Select warehouse</option>
                      {activeWarehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold">
                    Qty
                    <input
                      type="number"
                      min={1}
                      value={Number(edit.suggestedOrderQty || rec.suggestedOrderQty || 1)}
                      onChange={(event) => patchEdit(rec.id, { suggestedOrderQty: Number(event.target.value) })}
                      disabled={locked}
                      className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold">
                    Unit cost
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={Number(edit.unitCost ?? rec.unitCost ?? 0)}
                      onChange={(event) => patchEdit(rec.id, { unitCost: Number(event.target.value) })}
                      disabled={locked}
                      className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold sm:col-span-2">
                    Review notes
                    <input
                      value={String(edit.notes || '')}
                      onChange={(event) => patchEdit(rec.id, { notes: event.target.value })}
                      disabled={locked}
                      className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-emerald-400 disabled:opacity-60"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => saveReview(rec.id, 'REVIEWED')}
                      disabled={savingId === rec.id || locked}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-black transition hover:border-cyan-500/50 hover:bg-cyan-500/10 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Save Review
                    </button>
                    <button
                      type="button"
                      onClick={() => saveReview(rec.id, 'REJECTED')}
                      disabled={savingId === rec.id || locked}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-500/40 px-4 text-sm font-black text-red-100 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => createDraftPo(rec)}
                      disabled={savingId === rec.id || locked}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Create Draft PO
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!loading && recommendations.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No replenishment recommendations yet. Save a snapshot from Demand Planning first.
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-sm font-black tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
