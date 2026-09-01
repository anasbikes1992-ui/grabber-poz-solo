'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Video, CheckCircle2, Film, Megaphone } from 'lucide-react';

type Project = {
  id: string;
  title: string;
  format: string;
  aspectRatio: string;
  status: string;
  createdAt: string;
};

export default function CreativeStudioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState(
    'Smooth cinematic macro camera tracking over breathable linen fabric under warm morning sun.',
  );
  const [productName, setProductName] = useState('Linen Casual Shirt');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [format, setFormat] = useState('SHORT_FORM_30S');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/creative/projects');
    const data = await res.json();
    setProjects(data.projects || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, productName, format, aspectRatio }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generate failed');
      setLastProjectId(data.projectId);
      setMsg(data.scriptSummary || 'Campaign queued.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approveProject(projectId: string, title: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          announcement: `New campaign: ${title}`,
          heroTitle: title,
          heroSubtitle: prompt.slice(0, 120),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Approve failed');
      setMsg('Campaign approved — homepage CMS updated.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          Creative Factory & Media Studio
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">
            DB-backed
          </span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate campaigns, save to database, approve to publish hero + announcement on the storefront.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={(e) => void handleGenerate(e)} className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Create AI Marketing Campaign
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Product name</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border">
                  <option value="SHORT_FORM_30S">Short 30s</option>
                  <option value="SHORT_FORM_15S">Short 15s</option>
                  <option value="LONG_FORM_2M">Long 2m</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Aspect ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border">
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Visual prompt</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Film className="h-4 w-4" />
            {busy ? 'Saving campaign…' : 'Generate & Save Campaign'}
          </button>

          {msg && (
            <p className="text-xs text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {msg}
            </p>
          )}

          {lastProjectId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void approveProject(lastProjectId, productName)}
              className="w-full py-2 rounded-xl border border-emerald-500/40 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Megaphone className="h-4 w-4" /> Approve latest → publish to storefront
            </button>
          )}
        </form>

        <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Video className="h-4 w-4" /> Saved campaigns
          </h3>
          {projects.map((p) => (
            <div key={p.id} className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-xs text-foreground">{p.title}</h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">{p.status}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{p.format} · {p.aspectRatio}</p>
              {p.status !== 'COMPLETED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void approveProject(p.id, p.title)}
                  className="text-[11px] text-primary font-semibold hover:underline"
                >
                  Approve → storefront
                </button>
              )}
            </div>
          ))}
          {!projects.length && <p className="text-xs text-muted-foreground">No campaigns yet.</p>}
        </div>
      </div>
    </div>
  );
}
