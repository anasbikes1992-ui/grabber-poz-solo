'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, Zap, Layers, Radio, PlayCircle } from 'lucide-react';
import type { AgentId } from '@/lib/agents/types';

type AgentDef = {
  id: AgentId;
  label: string;
  description: string;
  category: 'core' | 'vertical' | 'communication';
  href?: string;
};

type AgentResult = {
  agent: AgentId;
  summary: string;
  recommendations: string[];
  metrics?: Record<string, number | string>;
  approvals?: Array<{ id: string; token: string; agent: AgentId; description: string }>;
};

const CATEGORY_META = {
  core: { label: 'Core commerce', icon: Zap, tone: 'text-emerald-400' },
  vertical: { label: 'Vertical modules', icon: Layers, tone: 'text-blue-400' },
  communication: { label: 'Communication & creative', icon: Radio, tone: 'text-purple-400' },
} as const;

export default function AgentsPage() {
  const [registry, setRegistry] = useState<AgentDef[]>([]);
  const [enabled, setEnabled] = useState<AgentId[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [runAllBusy, setRunAllBusy] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [brief, setBrief] = useState<AgentResult[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/agents/run');
      const data = await res.json();
      if (data.success) {
        setRegistry(data.registry || []);
        setEnabled(data.enabled || []);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, AgentDef[]> = { core: [], vertical: [], communication: [] };
    for (const agent of registry) {
      if (!enabled.includes(agent.id)) continue;
      map[agent.category]?.push(agent);
    }
    return map;
  }, [registry, enabled]);

  const run = useCallback(async (agent: AgentId) => {
    setBusy(agent);
    setResult(null);
    setBrief(null);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, prompt: 'Daily briefing' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Agent failed');
      const next = data.result as AgentResult;
      if (data.approvalCount > 0) {
        setResult({
          ...next,
          summary: `${next.summary} · ${data.approvalCount} approval draft(s) queued.`,
        });
      } else {
        setResult(next);
      }
    } catch (e) {
      setResult({ agent, summary: (e as Error).message, recommendations: [] });
    } finally {
      setBusy(null);
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunAllBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Brief failed');
      setBrief(data.results || []);
      if (data.approvalCount > 0) {
        setResult({
          agent: 'SALES',
          summary: `${data.approvalCount} approval draft(s) sent to Approval Center.`,
          recommendations: ['Review pending items at /approvals before EXECUTE.'],
        });
      }
    } catch (e) {
      setBrief([{ agent: 'SALES', summary: (e as Error).message, recommendations: [] }]);
    } finally {
      setRunAllBusy(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/app" className="text-xs text-zinc-400 hover:text-emerald-400">
            ← Merchant Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-2">
            <Bot className="w-6 h-6 text-purple-400" /> Agent Orchestrator
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            {enabled.length} enabled agent(s) across core POS, verticals (repairs, restaurant, HP, loyalty…), and WhatsApp/creative.
            Deterministic DB READ → propose → Approval Center EXECUTE.
          </p>
        </div>
        <button
          type="button"
          disabled={runAllBusy}
          onClick={() => void runAll()}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          <PlayCircle className="h-4 w-4" />
          {runAllBusy ? 'Running brief…' : 'Run all enabled agents'}
        </button>
      </div>

      {(['core', 'vertical', 'communication'] as const).map((cat) => {
        const agents = grouped[cat];
        if (!agents?.length) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <section key={cat}>
            <h2 className={`text-sm font-bold flex items-center gap-2 mb-3 ${meta.tone}`}>
              <Icon className="h-4 w-4" /> {meta.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => void run(a.id)}
                  className="p-4 rounded-2xl glass-card border border-zinc-800 text-left hover:border-emerald-500/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <div className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> {a.label}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{a.description}</div>
                  {a.href && (
                    <span className="mt-2 inline-block text-[10px] font-semibold text-emerald-500/80">{a.href}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {result && (
        <div className="p-5 rounded-2xl glass-card border border-zinc-800 space-y-3">
          <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{result.agent}</p>
          <p className="text-sm text-zinc-200">{result.summary}</p>
          {result.metrics && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.metrics).map(([k, v]) => (
                <span key={k} className="rounded-lg bg-zinc-900 px-2 py-1 text-[10px] font-mono text-zinc-400">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
          <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
            {result.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {result.approvals && result.approvals.length > 0 && (
            <p className="text-xs text-emerald-400">
              <Link href="/approvals" className="underline">
                {result.approvals.length} draft(s) in Approval Center
              </Link>
            </p>
          )}
        </div>
      )}

      {brief && brief.length > 0 && (
        <div className="p-5 rounded-2xl glass-card border border-purple-500/30 space-y-4">
          <h3 className="text-sm font-bold text-white">Combined daily brief ({brief.length} agents)</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {brief.map((r) => (
              <div key={r.agent} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-[10px] font-bold text-purple-400">{r.agent}</p>
                <p className="text-xs text-zinc-300 mt-1">{r.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
