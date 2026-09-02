'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const GRADES = ['A', 'B', 'C', 'D'] as const;

export default function TradeInPage() {
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [grade, setGrade] = useState<(typeof GRADES)[number]>('B');
  const [baseValue, setBaseValue] = useState(80000);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [result, setResult] = useState<{ voucherNumber?: string; appraisalValue?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/trade-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceModel,
          imei,
          conditionGrade: grade,
          baseValue,
          customerName,
          customerPhone,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult({ voucherNumber: data.voucher?.voucherNumber, appraisalValue: data.appraisalValue });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <Link href="/pos" className="text-emerald-400 text-sm">
        ← POS
      </Link>
      <h1 className="text-2xl font-bold">Device Trade-in & Buyback</h1>
      <p className="text-sm text-muted-foreground">Issue voucher · add to pre-owned stock · credit at checkout</p>

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <input
          required
          value={deviceModel}
          onChange={(e) => setDeviceModel(e.target.value)}
          placeholder="Device model (e.g. iPhone 13)"
          className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
        />
        <input
          value={imei}
          onChange={(e) => setImei(e.target.value)}
          placeholder="IMEI (optional)"
          className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono"
        />
        <div className="flex gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(g)}
              className={`flex-1 py-2 rounded-xl border text-sm font-bold ${grade === g ? 'bg-emerald-500 text-zinc-950 border-emerald-500' : 'border-zinc-800'}`}
            >
              {g}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={baseValue}
          onChange={(e) => setBaseValue(Number(e.target.value))}
          className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
          placeholder="Base value LKR"
        />
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
        />
        <input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Phone"
          className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
        />
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 font-bold">
          {busy ? 'Processing…' : 'Issue trade-in voucher'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result?.voucherNumber && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="font-bold">{result.voucherNumber}</p>
          <p className="text-emerald-400">Credit: LKR {result.appraisalValue?.toLocaleString()}</p>
          <p className="text-xs text-zinc-400 mt-2">Apply at POS checkout with voucher number</p>
        </div>
      )}
    </div>
  );
}
