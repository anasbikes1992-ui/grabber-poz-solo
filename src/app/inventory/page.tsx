'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Boxes, ArrowRightLeft, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

type Loc = { id: string; name: string; type: 'BRANCH' | 'WAREHOUSE' };

type Balance = {
  id: string;
  locationId: string;
  location: string;
  type: string;
  productId: string;
  product: string;
  sku?: string;
  onHand: number;
  reserved: number;
  available: number;
};

type Movement = {
  id: string;
  type: string;
  delta: string;
  location: string;
  product?: string;
  ref: string;
  date: string;
};

export default function InventoryPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStatus, setTransferStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      setBalances(data.balances || []);
      setMovements(
        (data.movements || []).map((m: Movement & { date: string }) => ({
          ...m,
          date: m.date ? new Date(m.date).toLocaleString() : '—',
        }))
      );
      const locs: Loc[] = [
        ...(data.locations?.branches || []),
        ...(data.locations?.warehouses || []),
      ];
      setLocations(locs);
      if (!fromId && locs[0]) setFromId(locs[0].id);
      if (!toId && locs[1]) setToId(locs[1].id);
      if (!productId && data.balances?.[0]?.productId) setProductId(data.balances[0].productId);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [fromId, toId, productId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locMeta = (id: string) => locations.find((l) => l.id === id);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const from = locMeta(fromId);
    const to = locMeta(toId);
    if (!from || !to || !productId) {
      setTransferStatus('ERROR');
      setTransferError('Select from/to locations and product');
      return;
    }
    setBusy(true);
    setTransferError(null);
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocationType: from.type,
          fromLocationId: from.id,
          toLocationType: to.type,
          toLocationId: to.id,
          items: [{ productId, quantity: Number(qty) }],
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Transfer failed');
      setTransferStatus('SUCCESS');
      await load();
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setTransferStatus('IDLE');
      }, 800);
    } catch (err) {
      setTransferStatus('ERROR');
      setTransferError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uniqueProducts = Array.from(
    new Map(balances.map((b) => [b.productId, { id: b.productId, name: b.product, sku: b.sku }])).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Physical Inventory & Stock Ledgers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live balances via /api/inventory</p>
          <div className="flex gap-3 mt-1">
            <Link href="/inventory/stock-take" className="text-xs text-emerald-400 underline">
              Stock take
            </Link>
            <Link href="/inventory/transfer" className="text-xs text-emerald-400 underline">
              Transfer verify
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setTransferStatus('IDLE');
            setTransferError(null);
            setIsTransferModalOpen(true);
          }}
          className="px-4 py-2 min-h-11 rounded-xl bg-emerald-500 text-zinc-950 font-medium text-xs flex items-center gap-2 shadow-glow-em"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          New Stock Transfer
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Location Stock Balances</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-muted-foreground">
                <th className="pb-2.5">Location</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Product</th>
                <th className="pb-2.5 text-right">On-Hand</th>
                <th className="pb-2.5 text-right">Reserved</th>
                <th className="pb-2.5 text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {balances.map((b) => (
                <tr key={b.id}>
                  <td className="py-3">{b.location}</td>
                  <td className="py-3 text-muted-foreground">{b.type}</td>
                  <td className="py-3 font-semibold">{b.product}</td>
                  <td className="py-3 text-right font-mono">{b.onHand}</td>
                  <td className="py-3 text-right font-mono">{b.reserved}</td>
                  <td className="py-3 text-right font-mono text-emerald-400">{b.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!balances.length && <p className="text-xs text-muted-foreground py-3">No balances — seed first.</p>}
        </div>
      </div>

      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Recent Movements</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-muted-foreground">
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Delta</th>
                <th className="pb-2.5">Location</th>
                <th className="pb-2.5">Product</th>
                <th className="pb-2.5">Ref</th>
                <th className="pb-2.5 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 font-mono text-[10px]">{m.type}</td>
                  <td className="py-3 font-mono">{m.delta}</td>
                  <td className="py-3">{m.location}</td>
                  <td className="py-3">{m.product || '—'}</td>
                  <td className="py-3 font-mono text-muted-foreground text-[10px]">{String(m.ref).slice(0, 12)}</td>
                  <td className="py-3 text-right text-muted-foreground">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isTransferModalOpen} onClose={() => !busy && setIsTransferModalOpen(false)} title="Stock transfer" as="form" onSubmit={handleExecuteTransfer}>
        <div className="space-y-3">
          <div>
            <label htmlFor="tr-from" className="text-xs font-semibold block mb-1">From</label>
            <select id="tr-from" value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tr-to" className="text-xs font-semibold block mb-1">To</label>
            <select id="tr-to" value={toId} onChange={(e) => setToId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tr-prod" className="text-xs font-semibold block mb-1">Product</label>
            <select id="tr-prod" value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm">
              {uniqueProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tr-qty" className="text-xs font-semibold block mb-1">Quantity</label>
            <input id="tr-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm" />
          </div>
          {transferStatus === 'SUCCESS' && (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Transferred</p>
          )}
          {transferStatus === 'ERROR' && <p className="text-xs text-destructive">{transferError}</p>}
          {transferStatus !== 'SUCCESS' && (
            <button type="submit" disabled={busy} className="w-full min-h-11 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold disabled:opacity-50">
              Execute transfer
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
