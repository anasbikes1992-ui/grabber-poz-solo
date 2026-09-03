'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { PromotionCountdown } from './PromotionCountdown';

export interface AnnouncementBarProps {
  text: string;
  promoCode?: string;
  ctaText?: string;
  ctaUrl?: string;
  endsAt?: string;
}

export function AnnouncementBar({ text, promoCode, ctaText, ctaUrl, endsAt }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white text-xs sm:text-sm py-2 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 flex flex-wrap items-center justify-center gap-2 text-center">
          <Sparkles className="w-4 h-4 text-amber-200 hidden sm:inline-block animate-pulse" />
          <span className="font-medium">{text}</span>
          {promoCode && (
            <span className="bg-black/25 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase border border-white/20">
              Code: {promoCode}
            </span>
          )}
          {endsAt && <PromotionCountdown endsAt={endsAt} />}
          {ctaText && (
            <Link
              href={ctaUrl || '/shop'}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-100 transition-colors ml-1"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-white"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
