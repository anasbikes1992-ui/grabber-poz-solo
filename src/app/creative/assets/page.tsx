'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, ExternalLink } from 'lucide-react';

type Asset = {
  id: string;
  assetType: string;
  url: string;
  title: string;
  createdAt: string;
};

export default function CreativeAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    void fetch('/api/creative/assets')
      .then((r) => r.json())
      .then((d) => setAssets(d.assets || []))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-indigo-500" /> Assets
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Generated PDFs, videos, and AI media saved to your creative library.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.map((a) => (
          <div key={a.id} className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-semibold">{a.assetType}</span>
            <h3 className="font-bold text-sm mt-2">{a.title}</h3>
            <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
      {!assets.length && <p className="text-sm text-muted-foreground">No assets yet — generate PDFs or queue video renders.</p>}
    </div>
  );
}
