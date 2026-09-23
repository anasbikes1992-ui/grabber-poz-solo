'use client';

import React, { useState } from 'react';
import { Car, Search } from 'lucide-react';

type FitmentRow = {
  productId: string;
  oemCode: string | null;
  makeName: string;
  modelName: string;
  generationName: string;
  yearFrom: number | null;
  yearTo: number | null;
};

/**
 * Compact OEM / vehicle fitment lookup for POS (auto-parts vertical).
 * Does not mutate cart — operator taps "Use SKU" via onPickProduct.
 */
export function FitmentLookup({
  onPickProduct,
}: {
  onPickProduct?: (productId: string, label: string) => void;
}) {
  const [oem, setOem] = useState('');
  const [rows, setRows] = useState<FitmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auto-parts/compatibility?oem=${encodeURIComponent(oem.trim())}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRows(data.compatibility || []);
    } catch (err) {
      setError((err as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 p-3 space-y-2 bg-zinc-950/40">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
        <Car className="h-3.5 w-3.5 text-sky-400" /> Fitment / OEM
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 min-h-10 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
          placeholder="OEM code"
          value={oem}
          onChange={(e) => setOem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void search()}
        />
        <button
          type="button"
          className="min-h-10 px-3 rounded-lg border border-zinc-700 text-xs flex items-center gap-1"
          onClick={() => void search()}
          disabled={loading || !oem.trim()}
        >
          <Search className="h-3.5 w-3.5" /> Find
        </button>
      </div>
      {error && <p className="text-[11px] text-amber-400">{error}</p>}
      {rows.length > 0 && (
        <ul className="max-h-32 overflow-y-auto text-[11px] space-y-1">
          {rows.map((r) => (
            <li key={`${r.productId}-${r.oemCode}`} className="flex justify-between gap-2 items-center">
              <span className="truncate text-zinc-400">
                {r.makeName} {r.modelName} · {r.generationName}
                {r.yearFrom ? ` (${r.yearFrom}–${r.yearTo || '…'})` : ''} · OEM {r.oemCode || '—'}
              </span>
              {onPickProduct && (
                <button
                  type="button"
                  className="shrink-0 px-2 py-1 rounded border border-sky-800 text-sky-300"
                  onClick={() =>
                    onPickProduct(
                      r.productId,
                      `${r.makeName} ${r.modelName} ${r.oemCode || ''}`.trim(),
                    )
                  }
                >
                  Pick
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
