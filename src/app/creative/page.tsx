'use client';

import React, { useState } from 'react';
import { Sparkles, Video, Image, Play, Plus, CheckCircle2, Film } from 'lucide-react';

export default function CreativeStudioPage() {
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'MEDIA'>('PROJECTS');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedClip, setGeneratedClip] = useState<string | null>(null);

  const projects = [
    { id: 'proj_1', title: 'Summer Linen Casual 9:16 Social Reel', format: 'SHORT_FORM_30S', ratio: '9:16', status: 'READY', duration: '30s' },
    { id: 'proj_2', title: 'Oxford Shirt Fabric Craftsmanship Explainer', format: 'LONG_FORM_2M', ratio: '16:9', status: 'DRAFT', duration: '2m' },
  ];

  const mediaAssets = [
    { id: 'm1', title: 'Company Logo Vector', type: 'LOGO', format: 'PNG', size: '240 KB' },
    { id: 'm2', title: 'Linen Blue Fabric Macro 4K', type: 'PRODUCT_VIDEO', format: 'MP4', size: '14.2 MB' },
    { id: 'm3', title: 'Upbeat Acoustic Summer Track', type: 'MUSIC', format: 'MP3', size: '3.1 MB' },
  ];

  const handleGenerateAI = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedClip('/rendered/wan21_summer_linen.mp4');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Creative Factory & Media Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">
              Provider Abstraction
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct Python video engine (Wan 2.1 / LTX / FFmpeg), Piper TTS audio & centralized brand media asset library.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-secondary p-1 rounded-xl border border-border text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('PROJECTS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'PROJECTS' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Video Projects
          </button>
          <button
            onClick={() => setActiveTab('MEDIA')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'MEDIA' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Media Library
          </button>
        </div>
      </div>

      {activeTab === 'PROJECTS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Video Generator Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Create AI Marketing Video Clip</span>
            </h3>

            <form onSubmit={handleGenerateAI} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Target Product</label>
                <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                  <option>Linen Casual Shirt (Size L / Blue)</option>
                  <option>Oxford Button-Down (Size M / White)</option>
                  <option>Stretch Chino Trousers</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">Format & Duration</label>
                  <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                    <option>Short Ad (30s) &bull; TikTok / Reels</option>
                    <option>Short Ad (15s) &bull; Story / Shorts</option>
                    <option>Long Form (2m) &bull; Product Explainer</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Aspect Ratio</label>
                  <select className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground">
                    <option>9:16 Vertical (TikTok / Reels)</option>
                    <option>1:1 Square (Instagram Feed)</option>
                    <option>16:9 Landscape (YouTube)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Creative Visual Prompt</label>
                <textarea
                  rows={3}
                  defaultValue="Smooth cinematic macro camera tracking over breathable blue linen fabric under warm natural morning sun, soft bokeh background with subtle island breeze motion."
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>Rendering with Wan 2.1 & FFmpeg Engine...</span>
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4" />
                    <span>Generate Video Campaign</span>
                  </>
                )}
              </button>
            </form>

            {generatedClip && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Render Completed! Ready in Media Library.</span>
                </div>
                <button className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px]">Preview</button>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Active Campaigns */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground">Video Campaigns</h3>
            <div className="space-y-3">
              {projects.map((proj) => (
                <div key={proj.id} className="p-3.5 rounded-xl bg-secondary/50 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">
                      {proj.ratio} &bull; {proj.duration}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                      {proj.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground">{proj.title}</h4>
                  <div className="pt-2 border-t border-border/40 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-muted-foreground">Chapters: 2 | Scenes: 4</span>
                    <button className="text-primary font-semibold hover:underline flex items-center gap-1">
                      <Play className="h-3 w-3" /> Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Media Library View */
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Brand Media & Audio Assets</h3>
            <button className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Upload Asset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {mediaAssets.map((asset) => (
              <div key={asset.id} className="p-4 rounded-xl bg-secondary/50 border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-bold text-muted-foreground">
                    {asset.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{asset.size}</span>
                </div>
                <h4 className="font-semibold text-xs text-foreground">{asset.title}</h4>
                <p className="text-[10px] text-muted-foreground">Format: {asset.format} &bull; Commercial License</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
