'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';

type Health = {
  deadJobs: number;
  failedWebhooks: number;
  automationFailed: number;
  stockDriftSkus: number;
  deadJobRows?: Array<{ id: string; type: string; lastError?: string | null }>;
  stockDrift?: Array<{ productId: string; drift: number }>;
};

export default function OpsHealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/ops/health');
      const json = await res.json();
      if (json.success) setData(json);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function retryJob(jobId: string) {
    await fetch('/api/ops/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry_job', jobId }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> Ops Health
          </h2>
          <p className="text-xs text-muted-foreground mt-1">DLQ jobs, webhook failures, automation retries, stock ledger drift</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Dead jobs', value: data.deadJobs, warn: data.deadJobs > 0 },
            { label: 'Failed webhooks', value: data.failedWebhooks, warn: data.failedWebhooks > 0 },
            { label: 'Automation failed', value: data.automationFailed, warn: data.automationFailed > 0 },
            { label: 'Stock drift SKUs', value: data.stockDriftSkus, warn: data.stockDriftSkus > 0 },
          ].map((c) => (
            <div key={c.label} className={`p-4 rounded-2xl border ${c.warn ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {data?.deadJobRows && data.deadJobRows.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Dead letter queue
          </h3>
          {data.deadJobRows.map((j) => (
            <div key={j.id} className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
              <span className="font-mono">{j.type}</span>
              <span className="text-muted-foreground truncate max-w-[50%]">{j.lastError}</span>
              <button type="button" onClick={() => void retryJob(j.id)} className="text-emerald-400 font-semibold">
                Retry
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
