'use client';

import { useEffect, useState } from 'react';
import { LayoutTemplate, Command } from 'lucide-react';
import { MARKETING_YATRA_CATEGORIES } from '@/lib/creative/marketing-yatra-prompts';
import type { MarketingYatraPrompt } from '@/lib/creative/marketing-yatra-prompts';

export default function CreativeTemplatesPage() {
  const [prompts, setPrompts] = useState<MarketingYatraPrompt[]>([]);
  const [category, setCategory] = useState<string>('creator_ugc');

  useEffect(() => {
    void fetch('/api/creative/commands')
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => undefined);
  }, []);

  const filtered = prompts.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-indigo-500" /> Templates
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">60 Marketing Yatra slash commands for video and UGC styles.</p>
      </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold">
              <Command className="h-3.5 w-3.5" /> {p.command}
            </div>
            <h3 className="font-bold text-sm mt-2">{p.label}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{p.description}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{p.suggestedFormat} · {p.suggestedAspectRatio}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
