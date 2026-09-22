'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

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
      <div className="relative min-h-[340px] sm:min-h-[440px] flex items-center">
        {/* Slide Photo Background */}
        {slide.imageUrl && (
          <div className="absolute inset-0 transition-opacity duration-700 ease-out">
            <Image
              src={slide.imageUrl}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover opacity-40 scale-105 transition-transform duration-1000 ease-out"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--sf-background)] via-[var(--sf-background)]/85 to-transparent" aria-hidden />
          </div>
        )}

        {/* Dynamic Festive Hero Gradient & Floating Particles */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--sf-hero-gradient)' }}
          aria-hidden
        />

        {/* Decorative Celebration Flares (Exploding Hero Accents) */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-12 left-1/4 h-56 w-56 rounded-full bg-[var(--sf-primary)]/15 blur-3xl" />
            <div className="absolute top-1/3 right-10 h-72 w-72 rounded-full bg-[var(--sf-accent)]/15 blur-3xl" />
            <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />
          </div>
        )}

        <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-center gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <div aria-live="polite" className="max-w-2xl space-y-4">
            {/* Celebration Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sf-accent)]/30 bg-[var(--sf-surface)]/80 px-3.5 py-1 text-xs font-bold tracking-wide text-[var(--sf-accent)] backdrop-blur-md shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--sf-accent)] animate-pulse" aria-hidden />
              <span>ThePartyStore · Complete Party Solutions</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[var(--sf-foreground)] sm:text-5xl lg:text-6xl drop-shadow-sm">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="max-w-xl text-base sm:text-lg font-medium text-[var(--sf-secondary)] leading-relaxed">
                {slide.subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={slide.ctaHref || '/shop#catalog'}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-[var(--sf-primary)] px-7 py-3 text-sm font-bold text-[var(--sf-on-primary)] shadow-lg shadow-[var(--sf-primary)]/25 transition-all duration-200 hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)] active:scale-95"
            >
              <span>{slide.ctaLabel || 'Shop Collection'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>

            <a
              href="#catalog"
              className="inline-flex min-h-12 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/80 backdrop-blur px-6 py-3 text-sm font-semibold text-[var(--sf-foreground)] transition-colors duration-200 hover:bg-[var(--sf-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
            >
              Browse All Products
            </a>
          </div>
        </div>
      </div>

      {/* Slide Navigation Controls */}
      {safe.length > 1 && !reduceMotion && (
        <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-4 z-10">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 text-[var(--sf-foreground)] backdrop-blur shadow-sm transition-all duration-200 hover:bg-[var(--sf-surface)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--sf-surface)]/80 border border-[var(--sf-border)] backdrop-blur shadow-sm" role="tablist" aria-label="Slides">
            {safe.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`cursor-pointer rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 h-2 bg-[var(--sf-accent)]' : 'w-2 h-2 bg-[var(--sf-secondary)]/30 hover:bg-[var(--sf-secondary)]/60'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 text-[var(--sf-foreground)] backdrop-blur shadow-sm transition-all duration-200 hover:bg-[var(--sf-surface)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
