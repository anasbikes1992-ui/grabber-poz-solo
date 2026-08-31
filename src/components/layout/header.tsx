'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Sun, Moon, Menu } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

interface HeaderProps {
  onToggleJarvis?: () => void;
  onToggleNav?: () => void;
  navOpen?: boolean;
}

export function Header({ onToggleJarvis, onToggleNav, navOpen = false }: HeaderProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const navLinks = [
    { name: 'Hub', href: '/app' },
    { name: 'Counter POS', href: '/pos', highlight: true },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Orders', href: '/delivery' },
    { name: 'Returns', href: '/returns' },
    { name: 'Reports', href: '/accounts' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl text-white">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-purple-500 to-amber-400"
        aria-hidden="true"
      />

      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleNav}
            aria-expanded={navOpen}
            aria-controls="primary-nav"
            className="md:hidden h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 cursor-pointer btn-press"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open navigation menu</span>
          </button>

          <Link href="/app" className="hidden sm:block btn-press truncate">
            <BrandLogo size="sm" showTagline={false} />
          </Link>

          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Authenticated Workspace
          </span>
        </div>

        <nav
          aria-label="Quick links"
          className="hidden xl:flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 p-1 rounded-2xl"
        >
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ease-expo cursor-pointer ${
                  item.highlight
                    ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-zinc-950 shadow-glow-em font-bold'
                    : isActive
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={!isDark}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 cursor-pointer btn-press"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleJarvis}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer btn-press"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Jarvis Copilot</span>
          </button>

          <Link
            href="/login"
            aria-label="Account workspace"
            className="flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs cursor-pointer"
          >
            <div
              className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs"
              aria-hidden="true"
            >
              G
            </div>
            <div className="hidden md:block text-left leading-none">
              <p className="font-bold text-white text-[11px]">Owner workspace</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Solo instance</p>
            </div>
          </Link>

          <Link
            href="/login"
            className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[11px] font-semibold transition-all duration-200 cursor-pointer"
          >
            Sign Out
          </Link>
        </div>
      </div>
    </header>
  );
}
