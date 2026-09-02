'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Transfer = {
  id: string;
  transferNumber: string;
  status: string;
  lines: Array<{ productId: string; quantity: number; receivedQty?: number; varianceQty?: number }>;
};

export default function TransferVerifyPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/inventory/transfer');
    const data = await res.json();
    if (data.success) setTransfers(data.transfers || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function dispatch(id: string) {
    const res = await fetch('/api/inventory/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dispatch', transferId: id }),
    });
    const data = await res.json();
    setMsg(data.success ? 'Dispatched — stock IN_TRANSIT' : data.error);
    void load();
  }

  async function receive(tr: Transfer) {
    const res = await fetch('/api/inventory/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'receive',
        transferId: tr.id,
        items: tr.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          receivedQty: l.receivedQty ?? l.quantity,
        })),
      }),
    });
    const data = await res.json();
    setMsg(data.success ? 'Received & verified at destination' : data.error);
    void load();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/inventory" className="text-emerald-400 text-sm">
        ← Inventory
      </Link>
      <h1 className="text-2xl font-bold">Stock Transfer Verification</h1>
      <p className="text-sm text-zinc-400">DRAFT → DISPATCHED (source deduct) → RECEIVED (destination add, variance log)</p>

      {transfers.map((tr) => (
        <div key={tr.id} className="p-4 rounded-xl border border-zinc-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono font-bold">{tr.transferNumber}</span>
            <span className="text-xs px-2 py-1 rounded bg-zinc-800">{tr.status}</span>
          </div>
          <p className="text-xs text-zinc-500">{tr.lines.length} line(s)</p>
          <div className="flex gap-2">
            {(tr.status === 'DRAFT' || tr.status === 'REQUESTED') && (
              <button type="button" onClick={() => void dispatch(tr.id)} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold">
                Dispatch
              </button>
            )}
            {tr.status === 'IN_TRANSIT' && (
              <button type="button" onClick={() => void receive(tr)} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                Receive & verify
              </button>
            )}
          </div>
        </div>
      ))}

      {msg && <p className="text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}
