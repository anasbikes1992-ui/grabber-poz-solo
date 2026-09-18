'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type HeroSlide = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function HeroSlider({
  slides,
  autoplayMs = 6000,
}: {
  slides: HeroSlide[];
  autoplayMs?: number;
}) {
  const safe = slides.filter((s) => s.title?.trim());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = safe.length || 1;
        return (i + dir + n) % n;
      });
    },
    [safe.length],
  );

  useEffect(() => {
    if (reduceMotion || paused || safe.length < 2 || autoplayMs <= 0) return;
    const t = setInterval(() => go(1), autoplayMs);
    return () => clearInterval(t);
  }, [autoplayMs, go, paused, reduceMotion, safe.length]);

  if (!safe.length) return null;

  const slide = safe[Math.min(index, safe.length - 1)]!;

  return (
    <section
      className="relative overflow-hidden border-b border-[var(--sf-border)]"
      aria-roledescription="carousel"
      aria-label="Store highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[280px] sm:min-h-[360px]">
        {slide.imageUrl && (
          <div className="absolute inset-0">
            <Image
              src={slide.imageUrl}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover opacity-35"
              unoptimized
            />
            <div className="absolute inset-0 bg-[var(--sf-background)]/55" aria-hidden />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--sf-hero-gradient)' }}
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-6xl flex-col justify-end gap-6 px-4 py-14 sm:px-6 sm:py-20">
          <div aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sf-accent)]">
              Online store
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-[var(--sf-foreground)] sm:text-5xl">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="mt-4 max-w-xl text-lg text-[var(--sf-secondary)]">{slide.subtitle}</p>
            )}
          </div>
          {slide.ctaLabel && (
            <div>
              <Link
                href={slide.ctaHref || '/shop#catalog'}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-6 py-3 text-sm font-semibold text-[var(--sf-on-accent)] shadow-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
              >
                {slide.ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </div>

      {safe.length > 1 && !reduceMotion && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] text-[var(--sf-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex gap-2" role="tablist" aria-label="Slides">
            {safe.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${
                  i === index ? 'bg-[var(--sf-accent)]' : 'bg-[var(--sf-border)]'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] text-[var(--sf-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
