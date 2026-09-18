'use client';

import { Tag } from 'lucide-react';

export function ProductPromoBadge({
  text = 'PROMO',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-[var(--sf-accent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--sf-on-accent)] shadow-sm ${className}`}
      aria-label={`Promotion: ${text}`}
    >
      <Tag className="h-2.5 w-2.5" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

/** Build short badge label from public promotion payload. */
export function promoBadgeLabel(promo: {
  discountType?: string;
  discountValue?: number;
  name?: string;
  promoCode?: string;
}): string {
  if (promo.discountType === 'PERCENT' && promo.discountValue != null) {
    return `−${Math.round(Number(promo.discountValue))}%`;
  }
  if (promo.discountType === 'FIXED' && promo.discountValue != null) {
    return `−LKR ${Math.round(Number(promo.discountValue)).toLocaleString('en-LK')}`;
  }
  if (promo.promoCode) return promo.promoCode;
  return (promo.name || 'PROMO').slice(0, 16);
}
