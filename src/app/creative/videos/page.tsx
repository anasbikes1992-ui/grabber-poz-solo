'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Video, CheckCircle2, Film, Megaphone, Command, ImageIcon, Copy } from 'lucide-react';
import type { MarketingYatraCategoryId, MarketingYatraPrompt } from '@/lib/creative/marketing-yatra-prompts';
import { MARKETING_YATRA_CATEGORIES } from '@/lib/creative/marketing-yatra-prompts';

type Project = {
  id: string;
  title: string;
  format: string;
  aspectRatio: string;
  status: string;
  createdAt: string;
  outputUrl?: string | null;
};

export default function VideoStudioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commands, setCommands] = useState<MarketingYatraPrompt[]>([]);
  const [category, setCategory] = useState<MarketingYatraCategoryId>('creator_ugc');
  const [commandId, setCommandId] = useState('unbox-now');
  const [productName, setProductName] = useState('Linen Casual Shirt');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [stylingHints, setStylingHints] = useState('matte black surface, slow orbit');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [format, setFormat] = useState('SHORT_FORM_30S');
  const [heroMediaUrl, setHeroMediaUrl] = useState('');
  const [heroMediaPosterUrl, setHeroMediaPosterUrl] = useState('');
  const [heroMediaType, setHeroMediaType] = useState<'none' | 'image' | 'video'>('video');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastGeminiCommand, setLastGeminiCommand] = useState<string | null>(null);
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  const [lastVisualPrompt, setLastVisualPrompt] = useState<string | null>(null);

  const selectedCommand = useMemo(
    () => commands.find((c) => c.id === commandId) ?? commands[0],
    [commands, commandId],
  );

  const load = useCallback(async () => {
    const [projRes, cmdRes] = await Promise.all([
      fetch('/api/creative/projects?kind=VIDEO'),
      fetch('/api/creative/commands'),
    ]);
    const projData = await projRes.json();
    const cmdData = await cmdRes.json();
    setProjects(projData.projects || []);
    setCommands(cmdData.prompts || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedCommand) return;
    setFormat(selectedCommand.suggestedFormat);
    setAspectRatio(selectedCommand.suggestedAspectRatio);
    setHeroMediaType(selectedCommand.heroMediaType);
  }, [selectedCommand]);

  const filteredCommands = useMemo(
    () => commands.filter((c) => c.category === category),
    [commands, category],
  );

  useEffect(() => {
    if (filteredCommands.length && !filteredCommands.some((c) => c.id === commandId)) {
      setCommandId(filteredCommands[0].id);
    }
  }, [filteredCommands, commandId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId,
          productName,
          productImageUrl: productImageUrl || undefined,
          stylingHints,
          format,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generate failed');
      setLastProjectId(data.projectId);
      setLastGeminiCommand(data.geminiCommand || null);
      setLastVisualPrompt(data.visualPrompt || null);
      if (productImageUrl && heroMediaType === 'image') setHeroMediaUrl(productImageUrl);
      setMsg(data.stub ? 'Campaign saved (dev stub).' : data.scriptSummary || 'Video queued.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approveProject(projectId: string, title: string, outputUrl?: string | null) {
    setBusy(true);
    setMsg(null);
    try {
      const mediaUrl = heroMediaUrl || outputUrl || undefined;
      const res = await fetch('/api/creative/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          announcement: `New campaign: ${title}`,
          heroTitle: title,
          heroSubtitle: lastVisualPrompt?.slice(0, 140) || selectedCommand?.description || '',
          heroMediaType: mediaUrl ? (heroMediaType === 'none' ? 'image' : heroMediaType) : 'none',
          heroMediaUrl: mediaUrl,
          heroMediaPosterUrl: heroMediaPosterUrl || productImageUrl || mediaUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Approve failed');
      setMsg('Approved — hero banner live on storefront.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Video className="h-5 w-5 text-indigo-500" /> Video Studio
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Promo videos, Reels/Shorts, slideshows — 9:16, 1:1, 16:9. Renders queue to GPU worker when configured.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={(e) => void handleGenerate(e)} className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Command className="h-4 w-4 text-indigo-500" /> Marketing Yatra command
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {MARKETING_YATRA_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border ${
                  category === cat.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-border text-muted-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => setCommandId(cmd.id)}
                className={`rounded-xl border p-2 text-left text-[10px] ${
                  commandId === cmd.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5' : 'border-border'
                }`}
              >
                <span className="font-mono font-bold text-indigo-600">{cmd.command}</span>
                <p className="mt-0.5 font-semibold line-clamp-1">{cmd.label}</p>
              </button>
            ))}
          </div>
          <div className="space-y-3 text-xs border-t border-border pt-4">
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border" />
            <input value={productImageUrl} onChange={(e) => setProductImageUrl(e.target.value)} placeholder="Product photo URL" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border font-mono text-[11px]" />
            <input value={stylingHints} onChange={(e) => setStylingHints(e.target.value)} placeholder="Styling hints" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border" />
            <div className="grid grid-cols-2 gap-3">
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary border border-border">
                <option value="SHORT_FORM_15S">15s</option>
                <option value="SHORT_FORM_30S">30s</option>
                <option value="SHORT_FORM_60S">60s</option>
                <option value="LONG_FORM_2M">2m</option>
              </select>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary border border-border">
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
            <Film className="h-4 w-4" /> {busy ? 'Queuing…' : 'Generate video'}
          </button>
          {lastGeminiCommand && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
              <code className="block text-[10px] font-mono break-all">{lastGeminiCommand}</code>
              <button type="button" onClick={() => void navigator.clipboard.writeText(lastGeminiCommand)} className="text-[10px] text-indigo-600 mt-2 inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> Copy Gemini command
              </button>
            </div>
          )}
          {msg && <p className="text-xs text-emerald-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {msg}</p>}
          {lastProjectId && (
            <button type="button" disabled={busy} onClick={() => void approveProject(lastProjectId, productName)} className="w-full py-2 rounded-xl border border-emerald-500/40 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> Approve → storefront
            </button>
          )}
        </form>
        <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Megaphone className="h-4 w-4" /> Recent videos</h3>
          {projects.map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40">
              <h4 className="font-bold text-xs">{p.title}</h4>
              <p className="text-[10px] text-muted-foreground">{p.format} · {p.status}</p>
            </div>
          ))}
          {!projects.length && <p className="text-xs text-muted-foreground">No videos yet.</p>}
        </div>
      </div>
    </div>
  );
}
