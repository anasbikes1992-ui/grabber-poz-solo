'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, MessageCircle, Package, Plus, Wrench } from 'lucide-react';
import { REPAIR_STATUS_FLOW, REPAIR_STATUS_LABELS } from '@/lib/repairs/status';
import type { RepairPartLine } from '@/lib/repairs/parts-from-stock';

type RepairJob = {
  id: string;
  jobNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  deviceModel: string;
  primaryFault: string | null;
  inspectionRemarks: string | null;
  partsDescription: string | null;
  partsAmount: string;
  serviceCharge: string;
  advancePaid: string;
  technician: string | null;
  status: string;
  checklistJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type CatalogItem = {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  unitPrice: number;
  stock: number;
};

export default function RepairJobWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<RepairJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partsLines, setPartsLines] = useState<RepairPartLine[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [partQty, setPartQty] = useState(1);

  useEffect(() => {
    void params.then((p) => setJobId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!jobId) return;
    const res = await fetch(`/api/repairs/${jobId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');
    setJob(data.job);
    const raw = data.job.checklistJson?.partsLines;
    setPartsLines(Array.isArray(raw) ? (raw as RepairPartLine[]) : []);
  }, [jobId]);

  useEffect(() => {
    fetch('/api/pos/catalog')
      .then((r) => r.json())
      .then((d) => {
        if (d.items) setCatalog(d.items);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    load().catch((e) => setError((e as Error).message));
  }, [jobId, load]);

  const save = async (patch: Partial<RepairJob> & { status?: string }) => {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/repairs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setJob(data.job);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPart = async (item: CatalogItem) => {
    if (!jobId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/repairs/${jobId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.productId,
          variantId: item.variantId || null,
          qty: partQty,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not add part');
      setJob(data.job);
      setPartsLines(data.partsLines || []);
      setPartSearch('');
      setPartQty(1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return catalog.filter((c) => c.stock > 0).slice(0, 8);
    return catalog
      .filter(
        (c) =>
          c.stock > 0 &&
          (c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [catalog, partSearch]);

  if (!jobId) return null;

  const due =
    Number(job?.partsAmount || 0) + Number(job?.serviceCharge || 0) - Number(job?.advancePaid || 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/repairs"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-muted-foreground hover:bg-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Wrench className="h-5 w-5 text-emerald-400" />
            {job?.jobNumber || 'Repair ticket'}
          </h1>
          <p className="text-xs text-muted-foreground">Staff workspace · WhatsApp on READY</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400">
          {error}
        </p>
      )}

      {job && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card rounded-2xl p-4 md:col-span-2 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Customer</p>
                  <p className="text-sm font-semibold">{job.customerName}</p>
                  <p className="text-xs text-muted-foreground">{job.customerPhone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Device</p>
                  <p className="text-sm font-semibold">{job.deviceModel}</p>
                  <p className="text-xs text-muted-foreground">{job.primaryFault || 'Fault TBD'}</p>
                </div>
              </div>
              <div>
                <label htmlFor="rj-status" className="mb-1 block text-xs font-semibold">
                  Status
                </label>
                <select
                  id="rj-status"
                  value={job.status}
                  disabled={busy}
                  onChange={(e) => void save({ status: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                >
                  {[...REPAIR_STATUS_FLOW, 'CANCELLED'].map((s) => (
                    <option key={s} value={s}>
                      {REPAIR_STATUS_LABELS[s] || s}
                    </option>
                  ))}
                </select>
              </div>
              {job.status === 'READY' && (
                <p className="flex items-center gap-2 text-xs text-emerald-400">
                  <MessageCircle className="h-3.5 w-3.5" />
                  REPAIR_READY WhatsApp fires when status moves to READY.
                </p>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold text-emerald-400">LKR {due.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Parts {Number(job.partsAmount).toFixed(0)} · Service {Number(job.serviceCharge).toFixed(0)} · Adv{' '}
                {Number(job.advancePaid).toFixed(0)}
              </p>
              {saved && (
                <p className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Package className="h-4 w-4 text-emerald-400" />
                Parts from stock
              </h2>
              <span className="text-xs text-muted-foreground">
                LKR {Number(job.partsAmount || 0).toFixed(2)} deducted from inventory
              </span>
            </div>

            {partsLines.length > 0 && (
              <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 text-sm">
                {partsLines.map((line) => (
                  <li key={line.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.sku} · ×{line.qty} @ LKR {Number(line.unitPrice).toFixed(0)}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">LKR {Number(line.lineTotal).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Search SKU or product name…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={partQty}
                onChange={(e) => setPartQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                aria-label="Quantity"
              />
            </div>

            {filteredCatalog.length > 0 ? (
              <ul className="space-y-2">
                {filteredCatalog.map((item) => (
                  <li
                    key={`${item.productId}:${item.variantId || 'base'}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku} · stock {item.stock} · LKR {item.unitPrice.toFixed(0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addPart(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No in-stock products match your search.</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold">Job details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="rj-tech" className="mb-1 block text-xs font-semibold">
                  Technician
                </label>
                <input
                  id="rj-tech"
                  defaultValue={job.technician || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (job.technician || '')) void save({ technician: e.target.value });
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="rj-parts-desc" className="mb-1 block text-xs font-semibold">
                  Parts
                </label>
                <input
                  id="rj-parts-desc"
                  defaultValue={job.partsDescription || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (job.partsDescription || '')) void save({ partsDescription: e.target.value });
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="rj-remarks" className="mb-1 block text-xs font-semibold">
                  Inspection remarks
                </label>
                <textarea
                  id="rj-remarks"
                  defaultValue={job.inspectionRemarks || ''}
                  rows={3}
                  onBlur={(e) => {
                    if (e.target.value !== (job.inspectionRemarks || '')) void save({ inspectionRemarks: e.target.value });
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Public track:{' '}
            <Link href="/shop/repairs/track" className="text-emerald-400 underline">
              /shop/repairs/track
            </Link>{' '}
            with ticket {job.jobNumber} + phone.
          </p>
        </>
      )}
    </div>
  );
}
