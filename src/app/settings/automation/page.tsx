'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Workflow } from 'lucide-react';

type Rule = {
  id: string;
  name: string;
  event: string;
  active: boolean;
};

type LogEntry = {
  id: string;
  ruleId: string;
  event: string;
  status: string;
  createdAt: string;
  detail: Record<string, unknown>;
};

export default function AutomationSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, logsRes] = await Promise.all([
        fetch('/api/automation/rules'),
        fetch('/api/automation/rules?view=logs'),
      ]);
      const rulesData = await rulesRes.json();
      const logsData = await logsRes.json();
      setRules(rulesData.rules || []);
      setLogs(logsData.logs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleRule(id: string, active: boolean) {
    const next = rules.map((r) => (r.id === id ? { ...r, active } : r));
    setRules(next);
    await fetch('/api/automation/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: next }),
    });
    await load();
  }

  async function retryLog(logId: string) {
    const res = await fetch('/api/automation/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry', logId }),
    });
    const data = await res.json();
    if (!data.success) alert(data.error || 'Retry failed');
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">← Merchant Hub</Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
          <Workflow className="w-6 h-6 text-sky-400" /> Automation Rules
        </h1>
        <p className="text-xs text-zinc-400 mt-1">EVENT → CONDITION → ACTION engine (WhatsApp + audit logs).</p>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {rules.map((r) => (
          <div key={r.id} className="p-4 rounded-2xl glass-card border border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">{r.name}</div>
              <div className="text-xs text-zinc-400">Event: {r.event}</div>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={r.active}
                onChange={(e) => void toggleRule(r.id, e.target.checked)}
              />
              Active
            </label>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-bold text-zinc-300 mb-2">Recent logs</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex justify-between gap-2 items-start">
              <div>
                <span className={l.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}>{l.status}</span>
                {' · '}
                {l.event} · {l.ruleId}
                <div className="text-zinc-500 mt-0.5">{new Date(l.createdAt).toLocaleString()}</div>
              </div>
              {l.status === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => void retryLog(l.id)}
                  className="shrink-0 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-[10px]"
                >
                  Retry
                </button>
              )}
            </div>
          ))}
          {!loading && logs.length === 0 && <p className="text-zinc-500 text-xs">No automation logs yet.</p>}
        </div>
      </div>
    </div>
  );
}
