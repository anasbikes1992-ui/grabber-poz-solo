'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { PDF_TEMPLATES } from '@/lib/creative/pdf-studio';

export default function PdfStudioPage() {
  const [template, setTemplate] = useState('PRICE_LIST');
  const [title, setTitle] = useState('March 2026 Price List');
  const [promoText, setPromoText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    await fetch('/api/creative/projects?kind=PDF');
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setDownloadUrl(null);
    try {
      const res = await fetch('/api/creative/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, title, promoText: promoText || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'PDF failed');
      setDownloadUrl(data.downloadUrl);
      setMsg('PDF generated — branded with your logo colors from Brand Kit.');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" /> PDF Studio
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Invoices, catalogs, flyers, price lists — auto-branded from live product data.
        </p>
      </div>
      <form onSubmit={(e) => void handleGenerate(e)} className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Template</label>
          <div className="grid grid-cols-2 gap-2">
            {PDF_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border p-3 text-left text-[11px] ${
                  template === t.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-border'
                }`}
              >
                <span className="font-bold block">{t.label}</span>
                <span className="text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        <textarea value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Promo text (flyers, brochures)" rows={2} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm" />
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {busy ? 'Generating…' : 'Generate PDF'}
        </button>
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:underline">
            <Download className="h-4 w-4" /> Download PDF
          </a>
        )}
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      </form>
    </div>
  );
}
