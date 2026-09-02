'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { parseCreativeKind, stripKindPrefix } from '@/lib/creative/kinds';

type Project = {
  id: string;
  title: string;
  format: string;
  aspectRatio: string;
  status: string;
  kind?: string;
  outputUrl?: string | null;
  createdAt: string;
};

export default function CreativeCampaignsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/creative/projects');
    const data = await res.json();
    setProjects(
      (data.projects || []).map((p: Project) => ({
        ...p,
        kind: parseCreativeKind(p.title),
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" /> Campaigns
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">All PDF, video, and UGC projects with render status.</p>
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <div key={p.id} className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold mr-2">{p.kind}</span>
              <span className="font-bold text-sm">{stripKindPrefix(p.title)}</span>
              <p className="text-[10px] text-muted-foreground mt-1">{p.format} · {p.aspectRatio} · {p.status}</p>
            </div>
            {p.outputUrl && (
              <a href={p.outputUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 font-semibold hover:underline">
                View output
              </a>
            )}
          </div>
        ))}
        {!projects.length && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>
    </div>
  );
}
