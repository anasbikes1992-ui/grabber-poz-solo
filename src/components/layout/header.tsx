'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, DollarSign, Bell, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onToggleJarvis?: () => void;
}

export function Header({ onToggleJarvis }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check initial dark mode state
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

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Location / Context Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs font-medium">
          <MapPin className="h-3.5 w-3.5 text-blue-500" />
          <span>Active Location:</span>
          <span className="font-semibold text-foreground">Colombo Main Branch</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Shift Register:</span>
          <span className="font-bold">LKR 25,000.00 Float</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-95"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
        </button>

        {/* Jarvis Copilot Trigger */}
        <button
          onClick={onToggleJarvis}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/25 transition-all active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Jarvis Copilot</span>
        </button>

        {/* Notifications */}
        <button className="h-9 w-9 rounded-xl border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border/60">
          <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center font-bold text-xs text-foreground border border-border">
            OW
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-foreground leading-none">Business Owner</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin & Financials</p>
          </div>
        </div>
      </div>
    </header>
  );
}
