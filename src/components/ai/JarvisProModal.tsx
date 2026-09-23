'use client';

import React from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Mic,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface JarvisProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeOrSwitch?: () => void;
}

export function JarvisProModal({ isOpen, onClose, onUpgradeOrSwitch }: JarvisProModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="jarvis-pro-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-purple-500/30 bg-zinc-950 p-6 shadow-2xl shadow-purple-950/50 sm:p-8"
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-purple-600/30 blur-[70px]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          {/* Badge & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-black tracking-wide text-purple-400 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Grabber Business OS Pro</span>
            </div>
            <h2 id="jarvis-pro-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Jarvis AI Copilot Included
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every Grabber client receives Jarvis as part of <strong className="text-purple-400">Grabber Business OS Pro</strong>. Jarvis reads and drafts from live business data; risky execution stays approval-controlled.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-200">Live Postgres DB Grounding</span>
                <p className="text-zinc-400">Real-time inventory valuation, dead stock radar, and GMROI analysis without manual spreadsheets.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 shrink-0">
                <Mic className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-200">Autonomous Voice & Text Commands</span>
                <p className="text-zinc-400">Speak or type queries like &ldquo;Check low stock in branch 1&rdquo; or &ldquo;Show today revenue vs margin&rdquo;.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-zinc-200">Predictive Restock & Draft Actions</span>
                <p className="text-zinc-400">Jarvis drafts purchase orders and promotion rules for your one-click approval.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onUpgradeOrSwitch && (
              <button
                type="button"
                onClick={onUpgradeOrSwitch}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer active:scale-95"
              >
                <Zap className="h-4 w-4 fill-white" />
                <span>Open Jarvis</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
