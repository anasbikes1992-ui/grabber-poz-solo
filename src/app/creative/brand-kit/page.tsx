'use client';

import { useEffect, useState } from 'react';
import { Palette, Save, CheckCircle2 } from 'lucide-react';

type BrandBrain = {
  voice: string;
  tagline: string;
  primaryColor: string;
  whatsappCta: string;
};

export default function BrandKitPage() {
  const [brand, setBrand] = useState<BrandBrain>({
    voice: '',
    tagline: '',
    primaryColor: '#047857',
    whatsappCta: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/creative/brand')
      .then((r) => r.json())
      .then((d) => d.brand && setBrand(d.brand))
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/creative/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setMsg('Brand kit saved — PDFs and videos will use these colors and voice.');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-500" /> Brand Kit
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Logo colors, voice, and CTA — auto-applied to PDF Studio and UGC scripts.</p>
      </div>
      <form onSubmit={(e) => void save(e)} className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Brand voice</label>
          <textarea value={brand.voice} onChange={(e) => setBrand({ ...brand, voice: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tagline</label>
          <input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Primary color</label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })} className="h-10 w-14 rounded-lg border border-border" />
            <input value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })} className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border font-mono text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">WhatsApp CTA</label>
          <input value={brand.whatsappCta} onChange={(e) => setBrand({ ...brand, whatsappCta: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        </div>
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> Save brand kit
        </button>
        {msg && <p className="text-xs text-emerald-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {msg}</p>}
      </form>
    </div>
  );
}
