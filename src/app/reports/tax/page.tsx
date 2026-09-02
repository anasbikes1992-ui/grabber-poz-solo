'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Summary = {
  month: string;
  netSales: number;
  vat: number;
  sscl: number;
  exempt: number;
  totalLiability: number;
  orderCount: number;
};

export default function TaxReportPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/reports/tax?month=${month}`)
      .then((r) => r.json())
      .then((d) => d.success && setSummary(d.summary));
  }, [month]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/reports" className="text-emerald-400 text-sm">
        ← Reports
      </Link>
      <h1 className="text-2xl font-bold">Tax & VAT Engine</h1>
      <p className="text-sm text-zinc-400">VAT 18% · SSCL 2.5% · exempt lines · monthly liability export</p>

      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
      />

      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Net sales" value={summary.netSales} />
          <Stat label="VAT 18%" value={summary.vat} />
          <Stat label="SSCL 2.5%" value={summary.sscl} />
          <Stat label="Exempt" value={summary.exempt} />
          <Stat label="Total liability" value={summary.totalLiability} highlight />
          <Stat label="Orders" value={summary.orderCount} currency={false} />
        </div>
      )}

      <a
        href={`/api/reports/tax?month=${month}&format=csv`}
        className="inline-block px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-sm"
      >
        Export CSV
      </a>
    </div>
  );
}

function Stat({ label, value, highlight, currency = true }: { label: string; value: number; highlight?: boolean; currency?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800'}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-bold">{currency ? `LKR ${value.toLocaleString()}` : value}</p>
    </div>
  );
}
