'use client';

import { useState, type ReactNode } from 'react';
import { Package } from 'lucide-react';

/** Branded stand-in shown when a product has no photo or its photo fails to load. */
export function ImagePlaceholder({ label = 'Photo coming soon', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-1.5 bg-[var(--sf-muted,#f1f5f9)] text-[var(--sf-secondary,#64748b)] ${className}`}
    >
      <Package className="h-8 w-8 opacity-60" aria-hidden />
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}

/**
 * Product photo with a graceful fallback: a missing or broken image URL shows the placeholder
 * instead of the browser's broken-image icon.
 */
export function ProductImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallback?: ReactNode;
}) {
  // Remember which URL failed so a new src (e.g. another variant) gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <>{fallback ?? <ImagePlaceholder className={fallbackClassName || className} />}</>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" className={className} onError={() => setFailedSrc(src)} />
  );
}
