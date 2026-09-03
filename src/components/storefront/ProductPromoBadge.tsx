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
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-sm tracking-wider ${className}`}
    >
      <Tag className="w-2.5 h-2.5" />
      <span>{text}</span>
    </div>
  );
}
