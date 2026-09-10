'use client';

import { useEffect, useState, useCallback, type RefObject } from 'react';
import Link from 'next/link';
import { X, Sparkles, Copy, Check, Tag } from 'lucide-react';
import { PromotionCountdown } from './PromotionCountdown';
import { useDrawerA11y } from '@/hooks/use-drawer-a11y';

export interface PromotionPopupData {
  id: string;
  name: string;
  promoCode?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  endsAt?: string;
  display?: {
    popupTitle?: string;
    popupMessage?: string;
    popupCtaText?: string;
    popupCtaUrl?: string;
    countdownEnabled?: boolean;
  };
}

export function PromotionPopup() {
  const [promo, setPromo] = useState<PromotionPopupData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    if (promo) {
      try {
        localStorage.setItem(`grabber_promo_dismissed_${promo.id}`, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  }, [promo]);

  const panelRef = useDrawerA11y(isOpen, dismiss);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    void (async () => {
      try {
        const res = await fetch('/api/promotions/public');
        if (!res.ok) return;
        const data = (await res.json()) as { success: boolean; promotions: PromotionPopupData[] };
        if (!data.success || !data.promotions.length) return;

        const popupPromo = data.promotions.find((p) => p.display?.popupTitle || p.display?.popupMessage);
        if (!popupPromo) return;

        const lastDismissed = localStorage.getItem(`grabber_promo_dismissed_${popupPromo.id}`);
        if (lastDismissed) {
          const ageHours = (Date.now() - Number(lastDismissed)) / (1000 * 60 * 60);
          if (ageHours < 12) return;
        }

        setPromo(popupPromo);
        timer = setTimeout(() => setIsOpen(true), 1500);
      } catch {
        /* ignore */
      }
    })();

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen || !promo) return null;

  const copyCode = () => {
    if (!promo.promoCode) return;
    navigator.clipboard.writeText(promo.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const title = promo.display?.popupTitle || promo.name;
  const message =
    promo.display?.popupMessage ||
    `Enjoy ${promo.discountType === 'PERCENT' ? `${promo.discountValue}% OFF` : `LKR ${promo.discountValue.toLocaleString()} OFF`} your order!`;
  const ctaText = promo.display?.popupCtaText || 'Shop Now';
  const ctaUrl = promo.display?.popupCtaUrl || '/shop';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={panelRef as RefObject<HTMLDivElement>}
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-center outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        tabIndex={-1}
      >
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label="Close promotion popup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Sparkles className="w-8 h-8 animate-bounce" aria-hidden />
        </div>

        <h2 id="promo-popup-title" className="text-2xl font-black tracking-tight text-white mb-2">
          {title}
        </h2>

        <p className="text-slate-300 text-sm mb-5 leading-relaxed">{message}</p>

        {promo.display?.countdownEnabled && promo.endsAt && (
          <div className="mb-5 flex justify-center">
            <PromotionCountdown endsAt={promo.endsAt} />
          </div>
        )}

        {promo.promoCode && (
          <div className="mb-6 bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-left pl-2">
              <Tag className="w-4 h-4 text-amber-400" aria-hidden />
              <span className="font-mono text-base font-bold tracking-wider text-amber-300">
                {promo.promoCode}
              </span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors font-sans"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <Link
            href={ctaUrl}
            onClick={dismiss}
            data-autofocus
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all transform active:scale-95"
          >
            {ctaText}
          </Link>
          <button type="button" onClick={dismiss} className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1">
            No thanks, continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
