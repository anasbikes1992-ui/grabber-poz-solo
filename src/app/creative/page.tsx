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
};

export default function CreativeStudioPage() {
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
      fetch('/api/creative/projects'),
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
      if (productImageUrl && heroMediaType === 'image') {
        setHeroMediaUrl(productImageUrl);
      }
      setMsg(data.stub ? 'Campaign saved (dev stub). Copy Gemini command below.' : data.scriptSummary || 'Campaign queued.');
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
          heroSubtitle: lastVisualPrompt?.slice(0, 140) || selectedCommand?.description || '',
          heroMediaType: heroMediaUrl ? heroMediaType : 'none',
          heroMediaUrl: heroMediaUrl || undefined,
          heroMediaPosterUrl: heroMediaPosterUrl || productImageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Approve failed');
      setMsg('Campaign approved — hero banner + announcement live on storefront.');
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyGeminiCommand() {
    if (!lastGeminiCommand) return;
    await navigator.clipboard.writeText(lastGeminiCommand);
    setMsg('Gemini command copied — paste in Gemini with your product photo attached.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          Creative Factory & Media Studio
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">
            Marketing Yatra · 60 Gemini commands
          </span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick a slash command, attach product photo URL, generate campaign → approve to publish hero video/image banner on storefront.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={(e) => void handleGenerate(e)} className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Command className="h-4 w-4 text-indigo-500" />
            Marketing Yatra command
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {MARKETING_YATRA_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold border ${
                  category === cat.id
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600'
                    : 'border-border text-muted-foreground hover:border-indigo-500/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => setCommandId(cmd.id)}
                className={`rounded-xl border p-2 text-left text-[10px] ${
                  commandId === cmd.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
                    : 'border-border hover:border-indigo-500/30'
                }`}
              >
                <span className="font-mono font-bold text-indigo-600">{cmd.command}</span>
                <p className="mt-0.5 font-semibold text-foreground line-clamp-1">{cmd.label}</p>
              </button>
            ))}
          </div>

          {selectedCommand && (
            <p className="text-[11px] text-muted-foreground rounded-xl bg-secondary/50 border border-border px-3 py-2">
              {selectedCommand.description}
            </p>
          )}

          <div className="space-y-3 text-xs border-t border-border pt-4">
            <div>
              <label className="text-muted-foreground block mb-1">Product name</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Product photo URL (for Gemini + hero fallback)
              </label>
              <input
                value={productImageUrl}
                onChange={(e) => setProductImageUrl(e.target.value)}
                placeholder="https://…/product.jpg"
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Styling hints (optional)</label>
              <input
                value={stylingHints}
                onChange={(e) => setStylingHints(e.target.value)}
                placeholder='e.g. matte black surface, slow orbit'
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border">
                  <option value="SHORT_FORM_15S">Short 15s</option>
                  <option value="SHORT_FORM_30S">Short 30s</option>
                  <option value="SHORT_FORM_60S">Short 60s</option>
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
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Film className="h-4 w-4" />
            {busy ? 'Saving campaign…' : 'Generate & Save Campaign'}
          </button>

          {lastGeminiCommand && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
              <p className="text-[10px] font-bold text-indigo-600">Paste into Google Gemini (attach product photo):</p>
              <code className="block text-[10px] font-mono text-foreground break-all">{lastGeminiCommand}</code>
              <button
                type="button"
                onClick={() => void copyGeminiCommand()}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:underline"
              >
                <Copy className="h-3 w-3" /> Copy command
              </button>
            </div>
          )}

          {msg && (
            <p className="text-xs text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {msg}
            </p>
          )}

          <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Megaphone className="h-3.5 w-3.5" /> Approve → storefront hero banner
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Hero media type</label>
                <select
                  value={heroMediaType}
                  onChange={(e) => setHeroMediaType(e.target.value as 'none' | 'image' | 'video')}
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs"
                >
                  <option value="video">Video</option>
                  <option value="image">Photo</option>
                  <option value="none">Text only</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Poster / thumbnail URL</label>
                <input
                  value={heroMediaPosterUrl}
                  onChange={(e) => setHeroMediaPosterUrl(e.target.value)}
                  placeholder="Optional"
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Hero video or image URL (after Gemini render)</label>
              <input
                value={heroMediaUrl}
                onChange={(e) => setHeroMediaUrl(e.target.value)}
                placeholder="https://…/campaign.mp4 or .jpg"
                className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-mono"
              />
            </div>
            {lastProjectId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void approveProject(lastProjectId, productName)}
                className="w-full py-2 rounded-xl border border-emerald-500/40 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Approve latest → publish hero banner
              </button>
            )}
          </div>
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
                  Approve → storefront hero
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
