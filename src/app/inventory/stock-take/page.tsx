'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Loc = { id: string; name: string; type: string };
type Balance = { productId: string; product: string; onHand: number };

export default function StockTakePage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [locationId, setLocationId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [physical, setPhysical] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    if (data.success) {
      const locs = [...(data.locations?.branches || []), ...(data.locations?.warehouses || [])];
      setLocations(locs);
      setBalances(data.balances || []);
      if (!locationId && locs[0]) setLocationId(locs[0].id);
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSession() {
    const loc = locations.find((l) => l.id === locationId);
    const res = await fetch('/api/inventory/stock-take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        locationType: loc?.type || 'BRANCH',
        locationId,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setSessionId(data.session.id);
      setMsg(`Session ${data.session.sessionNumber} started`);
    } else setMsg(data.error);
  }

  async function scanCount() {
    if (!sessionId) return;
    const match = balances.find((b) => b.product.toLowerCase().includes(barcode.toLowerCase()));
    if (!match) {
      setMsg('Product not found — scan SKU/name substring');
      return;
    }
    const res = await fetch('/api/inventory/stock-take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'count',
        sessionId,
        lines: [{ productId: match.productId, physicalCount: physical }],
      }),
    });
    const data = await res.json();
    setMsg(data.success ? `Counted ${match.product}: variance posted for approval` : data.error);
    setBarcode('');
  }

  async function approve() {
    const res = await fetch('/api/inventory/stock-take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', sessionId }),
    });
    const data = await res.json();
    setMsg(
      data.success
        ? `Posted · shrinkage LKR ${Number(data.shrinkageValue || 0).toLocaleString()} (Dr 6100 / Cr 1200)`
        : data.error,
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <Link href="/inventory" className="text-emerald-400 text-sm">
        ← Inventory
      </Link>
      <h1 className="text-2xl font-bold">Physical Stock Take</h1>

      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({l.type})
          </option>
        ))}
      </select>

      <button type="button" onClick={() => void startSession()} className="w-full py-2 rounded-xl bg-zinc-800 font-semibold">
        Start count session
      </button>

      {sessionId && (
        <div className="space-y-3 p-4 rounded-xl border border-zinc-800">
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan barcode / type product name"
            className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
          />
          <input
            type="number"
            value={physical}
            onChange={(e) => setPhysical(Number(e.target.value))}
            className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
            placeholder="Physical count"
          />
          <button type="button" onClick={() => void scanCount()} className="w-full py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold">
            Record count
          </button>
          <button type="button" onClick={() => void approve()} className="w-full py-2 rounded-xl border border-amber-500/50 text-amber-400">
            Manager approve & post journal
          </button>
        </div>
      )}

      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}
