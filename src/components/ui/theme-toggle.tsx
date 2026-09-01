'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { readStaffTheme, toggleStaffTheme, type StaffTheme } from '@/lib/theme/staff-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<StaffTheme>('dark');

  useEffect(() => {
    setTheme(readStaffTheme());
    const onChange = () => setTheme(readStaffTheme());
    window.addEventListener('grabber-theme-change', onChange);
    return () => window.removeEventListener('grabber-theme-change', onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleStaffTheme())}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground cursor-pointer btn-press"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
