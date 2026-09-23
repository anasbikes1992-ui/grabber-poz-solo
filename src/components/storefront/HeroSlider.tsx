'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  PartyPopper,
  Zap,
  Crown,
  Heart,
  Flame,
} from 'lucide-react';
import type {
  StorefrontCarouselEffect,
  StorefrontInteractiveFx,
} from '@/lib/config/storefront-config.shared';

export type HeroSlide = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  badge?: string;
};

// ---------------------------------------------------------------------------
// Interactive Background Particles & FX Layers (/ui-ux-pro-max)
// ---------------------------------------------------------------------------

function ConfettiParticles() {
  const particles = [
    { top: '12%', left: '8%', color: '#E11D48', delay: 0, rotate: 15, size: 'w-3 h-3' },
    { top: '25%', left: '88%', color: '#2563EB', delay: 0.5, rotate: -25, size: 'w-2.5 h-4' },
    { top: '65%', left: '5%', color: '#F59E0B', delay: 1, rotate: 45, size: 'w-3 h-2' },
    { top: '15%', left: '72%', color: '#EC4899', delay: 0.2, rotate: -10, size: 'w-2.5 h-2.5 rounded-full' },
    { top: '78%', left: '92%', color: '#10B981', delay: 0.8, rotate: 30, size: 'w-3 h-3' },
    { top: '40%', left: '94%', color: '#8B5CF6', delay: 1.2, rotate: -35, size: 'w-2 h-4' },
    { top: '8%', left: '42%', color: '#F43F5E', delay: 0.4, rotate: 12, size: 'w-2.5 h-2.5 rounded-full' },
    { top: '85%', left: '48%', color: '#06B6D4', delay: 0.9, rotate: -18, size: 'w-3 h-2' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className={`absolute ${p.size} opacity-80 shadow-xs`}
          style={{
            top: p.top,
            left: p.left,
            backgroundColor: p.color,
            borderRadius: p.size.includes('rounded-full') ? '9999px' : '2px',
          }}
          animate={{
            y: [-8, 10, -8],
            x: [-4, 6, -4],
            rotate: [p.rotate, p.rotate + 40, p.rotate],
          }}
          transition={{
            duration: 3.5 + (i % 3),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function NeonGlowLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-[100px] animate-pulse" />
      <div className="absolute top-1/2 right-12 h-96 w-96 rounded-full bg-rose-500/20 blur-[110px] animate-pulse" />
      <div className="absolute bottom-0 left-12 h-64 w-64 rounded-full bg-violet-600/15 blur-[90px]" />
    </div>
  );
}

function GoldShimmerLayer() {
  const glints = [
    { top: '15%', left: '12%', size: 'w-2 h-2', delay: 0 },
    { top: '35%', left: '85%', size: 'w-3 h-3', delay: 0.7 },
    { top: '75%', left: '18%', size: 'w-2.5 h-2.5', delay: 1.3 },
    { top: '20%', left: '60%', size: 'w-2 h-2', delay: 0.4 },
    { top: '80%', left: '80%', size: 'w-3 h-3', delay: 1.8 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-16 left-1/3 h-72 w-72 rounded-full bg-amber-400/20 blur-[90px]" />
      <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-amber-500/15 blur-[100px]" />
      {glints.map((g, i) => (
        <motion.div
          key={i}
          className={`absolute ${g.size} rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]`}
          style={{ top: g.top, left: g.left }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: g.delay }}
        />
      ))}
    </div>
  );
}

function FloatingBubblesLayer() {
  const bubbles = [
    { size: 48, top: '20%', left: '6%', delay: 0, dur: 4.5 },
    { size: 64, top: '60%', left: '90%', delay: 0.8, dur: 5.2 },
    { size: 36, top: '15%', left: '82%', delay: 1.4, dur: 4.2 },
    { size: 52, top: '75%', left: '12%', delay: 0.5, dur: 4.8 },
    { size: 30, top: '45%', left: '94%', delay: 1.1, dur: 3.8 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-pink-300/40 bg-gradient-to-tr from-pink-200/30 to-purple-200/20 backdrop-blur-xs shadow-inner"
          style={{ width: b.size, height: b.size, top: b.top, left: b.left }}
          animate={{
            y: [-12, 16, -12],
            x: [-6, 6, -6],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}
    </div>
  );
}

function KineticTicker({ text }: { text?: string }) {
  const defaultText =
    '⚡ MEGA CELEBRATION SALE • 10% OFF ON ORDERS OVER LKR 5,000 • SAME DAY DISPATCH • LIVE POS STOCK • 4,000+ PARTY ITEMS';
  const display = text || defaultText;

  return (
    <div className="relative overflow-hidden border-y border-[var(--sf-border)] bg-[var(--sf-primary)] py-2 text-[var(--sf-on-primary)] shadow-sm">
      <div className="flex w-max animate-marquee space-x-8 text-xs font-black uppercase tracking-widest">
        <span>{display}</span>
        <span aria-hidden>{display}</span>
        <span aria-hidden>{display}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HeroSlider Component
// ---------------------------------------------------------------------------

export function HeroSlider({
  slides,
  autoplayMs = 6000,
  interactiveFx = 'confetti',
  carouselEffect = 'spring-showcase',
  tickerText,
}: {
  slides: HeroSlide[];
  autoplayMs?: number;
  interactiveFx?: StorefrontInteractiveFx;
  carouselEffect?: StorefrontCarouselEffect;
  tickerText?: string;
}) {
  const safe = slides.filter((s) => s.title?.trim());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      setProgress(0);
      setIndex((i) => {
        const n = safe.length || 1;
        return (i + dir + n) % n;
      });
    },
    [safe.length],
  );

  // Smooth animated progress bar timer
  useEffect(() => {
    if (reduceMotion || paused || safe.length < 2 || autoplayMs <= 0) {
      return;
    }
    const stepMs = 50;
    const increment = (stepMs / autoplayMs) * 100;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          go(1);
          return 0;
        }
        return p + increment;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [autoplayMs, go, paused, reduceMotion, safe.length]);

  if (!safe.length) return null;

  const currentIdx = Math.min(index, safe.length - 1);
  const slide = safe[currentIdx]!;

  const fxThemeIcon = () => {
    switch (interactiveFx) {
      case 'neon':
        return <Zap className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />;
      case 'gold':
        return <Crown className="h-3.5 w-3.5 text-amber-500 animate-pulse" />;
      case 'bubbles':
        return <Heart className="h-3.5 w-3.5 text-pink-400 animate-pulse" />;
      case 'ticker':
        return <Flame className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />;
      default:
        return <PartyPopper className="h-3.5 w-3.5 text-[var(--sf-accent)] animate-pulse" />;
    }
  };

  return (
    <section
      className="storefront-hero relative overflow-hidden border-b border-[var(--sf-border)]"
      aria-roledescription="carousel"
      aria-label="Store highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 1. Translucent Ambient Backdrop Glow (Real Image Colors Blend) */}
      {slide.imageUrl && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            className="h-full w-full object-cover opacity-25 filter blur-3xl scale-125 transition-all duration-1000 ease-out"
          />
        </div>
      )}

      {/* 2. Ambient Theme Radial Mesh (Translucent so it never blocks the photo) */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: 'var(--sf-hero-gradient)' }}
        aria-hidden
      />

      {/* 3. Interactive Theme FX Particles */}
      {!reduceMotion && (
        <>
          {interactiveFx === 'confetti' && <ConfettiParticles />}
          {interactiveFx === 'neon' && <NeonGlowLayer />}
          {interactiveFx === 'gold' && <GoldShimmerLayer />}
          {interactiveFx === 'bubbles' && <FloatingBubblesLayer />}
        </>
      )}

      {/* 4. Hero Content & Dual Showcase Layout */}
      <div className="relative mx-auto flex w-full max-w-6xl items-center px-4 py-12 sm:px-6 sm:py-20 lg:py-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`grid w-full items-center gap-8 lg:gap-12 ${
              slide.imageUrl ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
            }`}
          >
            {/* Left Column: Headlines, Badge, & CTAs */}
            <div className={`space-y-6 ${slide.imageUrl ? 'lg:col-span-7' : 'max-w-3xl mx-auto text-center'}`}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sf-surface-border)] bg-[var(--sf-surface)] px-3.5 py-1 text-xs font-bold tracking-wide text-[var(--sf-accent)] backdrop-blur-md shadow-xs">
                {fxThemeIcon()}
                <span>{slide.badge || 'ThePartyStore · Complete Party Solutions'}</span>
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-[var(--sf-foreground)] sm:text-5xl lg:text-6xl drop-shadow-xs leading-[1.1]">
                {slide.title}
              </h1>

              {slide.subtitle && (
                <p className="max-w-xl text-base sm:text-lg font-medium text-[var(--sf-secondary)] leading-relaxed">
                  {slide.subtitle}
                </p>
              )}

              {/* Action Buttons */}
              <div className={`flex flex-wrap items-center gap-3 pt-2 ${slide.imageUrl ? '' : 'justify-center'}`}>
                <Link
                  href={slide.ctaHref || '/shop#catalog'}
                  className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-[var(--sf-primary)] px-7 py-3 text-sm font-bold text-[var(--sf-on-primary)] shadow-lg shadow-[var(--sf-primary)]/20 transition-all duration-200 hover:scale-[1.02] hover:opacity-95 active:scale-95"
                >
                  <span>{slide.ctaLabel || 'Shop Collection'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>

                <a
                  href="#catalog"
                  className="inline-flex min-h-12 cursor-pointer items-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] px-6 py-3 text-sm font-semibold text-[var(--sf-foreground)] backdrop-blur transition-colors duration-200 hover:bg-[var(--sf-muted)]"
                >
                  Browse All Products
                </a>
              </div>
            </div>

            {/* Right Column: High-Res Visual Showcase Card */}
            {slide.imageUrl && (
              <div className="relative flex justify-center lg:col-span-5">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="group relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-white/60 bg-white/40 p-2.5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-3xl dark:border-white/10 dark:bg-black/40"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                        🎉 Featured Package
                      </span>
                      <span className="text-[11px] font-semibold tracking-wider uppercase opacity-90">
                        Islandwide Delivery
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 5. Kinetic Ticker Ribbon (Active when ticker theme is selected) */}
      {(interactiveFx === 'ticker' || carouselEffect === 'kinetic-snap') && (
        <KineticTicker text={tickerText} />
      )}

      {/* 6. Slide Navigation & Progress Controls */}
      {safe.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 z-10">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 text-[var(--sf-foreground)] backdrop-blur shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>

          {/* Dots & Progress Indicator */}
          <div
            className="flex items-center gap-2 rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 px-3.5 py-1.5 backdrop-blur shadow-sm"
            role="tablist"
            aria-label="Slides"
          >
            <span className="text-[10px] font-mono font-bold text-[var(--sf-secondary)]">
              0{currentIdx + 1} / 0{safe.length}
            </span>
            <div className="h-3 w-px bg-[var(--sf-border)]" />
            {safe.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === currentIdx}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  setProgress(0);
                  setIndex(i);
                }}
                className={`relative h-2 cursor-pointer overflow-hidden rounded-full transition-all duration-300 ${
                  i === currentIdx ? 'w-8 bg-[var(--sf-secondary)]/20' : 'w-2 bg-[var(--sf-secondary)]/30 hover:bg-[var(--sf-secondary)]/60'
                }`}
              >
                {i === currentIdx && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[var(--sf-primary)]"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)]/90 text-[var(--sf-foreground)] backdrop-blur shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
