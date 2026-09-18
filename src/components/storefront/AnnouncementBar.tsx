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

/** CMS top bar — uses storefront semantic tokens (--sf-*). */
export function AnnouncementBar({ text, promoCode, ctaText, ctaUrl, endsAt }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !text.trim()) return null;

  return (
    <div
      role="region"
      aria-label="Store announcement"
      className="relative bg-[var(--sf-primary)] text-[var(--sf-on-primary)] text-xs sm:text-sm py-2 px-4 shadow-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 text-center">
          <Sparkles className="hidden h-4 w-4 shrink-0 opacity-90 sm:inline-block" aria-hidden />
          <span className="font-medium">{text}</span>
          {promoCode && (
            <span className="rounded border border-[var(--sf-on-primary)]/25 bg-black/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider sm:text-xs">
              Code: {promoCode}
            </span>
          )}
          {endsAt && <PromotionCountdown endsAt={endsAt} />}
          {ctaText && (
            <Link
              href={ctaUrl || '/shop'}
              className="ml-1 inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold underline underline-offset-2 opacity-95 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--sf-on-primary)]/80 transition-colors hover:bg-black/15 hover:text-[var(--sf-on-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
