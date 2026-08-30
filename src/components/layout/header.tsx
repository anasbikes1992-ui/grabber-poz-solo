'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  MapPin,
  DollarSign,
  Bell,
  Sun,
  Moon,
  ShoppingCart,
  Boxes,
  ShoppingBag,
  RotateCcw,
  BarChart3,
  Globe,
  LogOut,
  User,
} from 'lucide-react';

interface HeaderProps {
  onToggleJarvis?: () => void;
}

export function Header({ onToggleJarvis }: HeaderProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const newDark = !isDark;
      setIsDark(newDark);
      if (newDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const navLinks = [
    { name: 'Hub', href: '/' },
    { name: 'Counter POS', href: '/pos', highlight: true },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Orders', href: '/delivery' },
    { name: 'Returns', href: '/returns' },
    { name: 'Reports', href: '/accounts' },
  ];

  return (
    <header className="h-16 border-b border-white/10 bg-[#0B0F17]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 text-white">
      {/* Brand & Mode Badges */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-extrabold text-sm shadow-md shadow-emerald-500/20">
            G
          </div>
          <span className="font-extrabold text-base tracking-wider text-white">
            GR<span className="text-emerald-400">O</span>BBER
          </span>
        </Link>

        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Authenticated Workspace
        </span>
      </div>

      {/* Center Nav Pills */}
      <nav className="hidden xl:flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-2xl">
        {navLinks.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                item.highlight
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-md shadow-emerald-400/25 font-bold'
                  : isActive
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Right User & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-cyan-400" />}
        </button>

        {/* Jarvis AI Trigger */}
        <button
          onClick={onToggleJarvis}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Jarvis Copilot</span>
        </button>

        {/* User Badge */}
        <Link
          href="/login"
          className="flex items-center gap-2 pl-2 border-l border-white/10 text-xs"
        >
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
            A
          </div>
          <div className="hidden md:block text-left leading-none">
            <p className="font-bold text-white text-[11px]">Shopping Station</p>
            <p className="text-[9px] text-slate-400 mt-0.5">anasazeez1992@gmail.com</p>
          </div>
        </Link>

        {/* Sign Out */}
        <Link
          href="/login"
          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-[11px] font-semibold transition-all"
        >
          Sign Out
        </Link>
      </div>
    </header>
  );
}
