'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Bot } from 'lucide-react';

const AGENTS = [
  { id: 'SALES', label: 'Sales Agent', desc: 'Revenue and conversion recommendations' },
  { id: 'INVENTORY', label: 'Inventory Agent', desc: 'Replenishment and stock risk alerts' },
  { id: 'MARKETING', label: 'Marketing Agent', desc: 'Campaign and promo suggestions' },
] as const;

export default function AgentsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ summary: string; recommendations: string[] } | null>(null);

  const run = useCallback(async (agent: 'SALES' | 'INVENTORY' | 'MARKETING') => {
    setBusy(agent);
    setResult(null);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, prompt: 'Daily briefing' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Agent failed');
      setResult(data.result);
    } catch (e) {
      setResult({ summary: (e as Error).message, recommendations: [] });
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void run('SALES');
  }, [run]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">← Merchant Hub</Link>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
          <Bot className="w-6 h-6 text-purple-400" /> Agent Orchestrator
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Stub agents for R6 — deterministic recommendations until LLM wiring.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy === a.id}
            onClick={() => void run(a.id)}
            className="p-4 rounded-2xl glass-card border border-zinc-800 text-left hover:border-emerald-500/40 transition-colors disabled:opacity-50"
          >
            <div className="font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> {a.label}
            </div>
            <div className="text-xs text-zinc-400 mt-1">{a.desc}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-3">
          <p className="text-sm text-zinc-200">{result.summary}</p>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
            {result.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
