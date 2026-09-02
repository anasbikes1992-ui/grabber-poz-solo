'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, Video, Megaphone, ArrowRight, Cpu } from 'lucide-react';

type Stats = {
  projects: number;
  pdf: number;
  video: number;
  ugc: number;
  assets: number;
  gpuWorker: boolean;
  mediaPipeline: boolean;
};

export default function CreativeDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void fetch('/api/creative/dashboard')
      .then((r) => r.json())
      .then((d) => setStats(d.stats || null))
      .catch(() => undefined);
  }, []);

  const cards = [
    { href: '/creative/pdf', label: 'PDF Studio', icon: FileText, count: stats?.pdf, desc: 'Catalogs, flyers, price lists' },
    { href: '/creative/videos', label: 'Video Studio', icon: Video, count: stats?.video, desc: 'Reels, promos, slideshows' },
    { href: '/creative/ugc-ads', label: 'UGC Ads', icon: Megaphone, count: stats?.ugc, desc: 'Hooks → scripts → variations' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-500" /> Dashboard
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Turn your products into PDFs, social content, videos and UGC ads in minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="p-5 rounded-2xl bg-card border border-border hover:border-indigo-500/40 transition-colors group">
            <c.icon className="h-6 w-6 text-indigo-500 mb-2" />
            <h3 className="font-bold text-sm">{c.label}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">{c.desc}</p>
            {stats && <p className="text-2xl font-bold mt-3">{c.count ?? 0}</p>}
            <span className="text-[10px] text-indigo-600 font-semibold mt-2 inline-flex items-center gap-1 group-hover:underline">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Render pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="font-bold">GPU worker</span>
            <p className={`mt-1 ${stats?.gpuWorker ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats?.gpuWorker ? 'CREATIVE_WORKER_URL configured' : 'Not configured — set CREATIVE_WORKER_URL on GPU host'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <span className="font-bold">Image fallback (FAL/Replicate)</span>
            <p className={`mt-1 ${stats?.mediaPipeline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {stats?.mediaPipeline ? 'Available' : 'Dev placeholder mode'}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">
          Next.js → Creative API → Job Queue → GPU Video Worker → FFmpeg / AI → Object Storage → Creative Library
        </p>
      </div>
    </div>
  );
}
