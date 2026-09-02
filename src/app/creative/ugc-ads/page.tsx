'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Sparkles, Film, Copy, CheckCircle2 } from 'lucide-react';

type Product = { id: string; name: string; imageUrl?: string | null; salePrice: string };
type UgcHook = { id: string; text: string; score: number };
type UgcScript = { id: string; title: string; fullText: string; cta: string };

const OBJECTIVES = [
  { id: 'AWARENESS', label: 'Awareness' },
  { id: 'CONVERSION', label: 'Conversion' },
  { id: 'RETARGETING', label: 'Retargeting' },
  { id: 'LAUNCH', label: 'Launch' },
] as const;

const STYLES = [
  { id: 'authentic', label: 'Authentic creator' },
  { id: 'testimonial', label: 'Testimonial' },
  { id: 'unboxing', label: 'Unboxing' },
  { id: 'problem_solution', label: 'Problem → solution' },
  { id: 'before_after', label: 'Before / after' },
] as const;

export default function UgcAdsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [objective, setObjective] = useState('CONVERSION');
  const [style, setStyle] = useState('authentic');
  const [variantCount, setVariantCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hooks, setHooks] = useState<UgcHook[]>([]);
  const [scripts, setScripts] = useState<UgcScript[]>([]);
  const [geminiCommand, setGeminiCommand] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.products || d.items || []) as Product[];
        setProducts(list);
        if (list[0]) {
          setProductId(list[0].id);
          setProductName(list[0].name);
        }
      })
      .catch(() => undefined);
  }, []);

  const onProductChange = useCallback(
    (id: string) => {
      setProductId(id);
      const p = products.find((x) => x.id === id);
      if (p) setProductName(p.name);
    },
    [products],
  );

  async function generateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/ugc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId || undefined,
          productName,
          productImageUrl: products.find((p) => p.id === productId)?.imageUrl || undefined,
          objective,
          style,
          variantCount,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'UGC failed');
      setProjectId(data.projectId);
      setHooks(data.hooks || []);
      setScripts(data.scripts || []);
      setGeminiCommand(data.geminiCommand || null);
      setMsg(`Campaign created — ${data.variantCount} script variants with storyboard.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function queueVideos() {
    if (!scripts.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/ugc/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scripts,
          productName,
          productImageUrl: products.find((p) => p.id === productId)?.imageUrl,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Render queue failed');
      setMsg(`${data.queued} video jobs queued — GPU worker renders when CREATIVE_WORKER_URL is set.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-500" /> UGC Ads
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Product → hooks → scripts → storyboard → video variations → Meta / TikTok / WhatsApp-ready exports.
        </p>
      </div>

      <form onSubmit={(e) => void generateCampaign(e)} className="p-6 rounded-2xl bg-card border border-border space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-muted-foreground">Product</label>
            <select value={productId} onChange={(e) => onProductChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border">
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Campaign objective</label>
            <select value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border">
              {OBJECTIVES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">UGC style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border">
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Script variants (1–10)</label>
            <input type="number" min={1} max={10} value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border" />
          </div>
        </div>
        <button type="submit" disabled={busy || !productName} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {busy ? 'Generating concepts…' : 'Generate hooks & scripts'}
        </button>
      </form>

      {hooks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <h3 className="font-semibold text-sm">Hooks ({hooks.length})</h3>
            {hooks.map((h) => (
              <div key={h.id} className="text-[11px] p-2 rounded-lg bg-secondary/50 border border-border/40">
                <span className="text-indigo-600 font-bold mr-2">{h.score}</span>{h.text}
              </div>
            ))}
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <h3 className="font-semibold text-sm">Scripts & storyboard</h3>
            {scripts.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-[11px]">
                <p className="font-bold">{s.title}</p>
                <p className="text-muted-foreground mt-1 line-clamp-3">{s.fullText}</p>
                <p className="text-indigo-600 mt-1 font-semibold">CTA: {s.cta}</p>
              </div>
            ))}
            <button type="button" disabled={busy} onClick={() => void queueVideos()} className="w-full py-2.5 rounded-xl border border-indigo-500/40 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-2">
              <Film className="h-4 w-4" /> Queue {scripts.length} video renders
            </button>
          </div>
        </div>
      )}

      {geminiCommand && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 max-w-3xl">
          <p className="text-[10px] font-bold text-indigo-600 mb-2">Optional Gemini visual pass:</p>
          <code className="block text-[10px] font-mono break-all">{geminiCommand}</code>
          <button type="button" onClick={() => void navigator.clipboard.writeText(geminiCommand)} className="text-[10px] text-indigo-600 mt-2 inline-flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      )}

      {msg && (
        <p className="text-xs text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {msg}
          {projectId && <span className="text-muted-foreground">· Campaign ID {projectId.slice(0, 8)}…</span>}
        </p>
      )}
    </div>
  );
}
