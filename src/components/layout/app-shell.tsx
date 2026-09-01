'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/ui/app-header';
import { JarvisDrawer } from '@/components/ai/jarvis-drawer';

function isPublicSurface(pathname: string): boolean {
  if (pathname === '/' || pathname === '/store' || pathname === '/login' || pathname === '/shop/login') {
    return true;
  }
  if (/^\/products\/[^/]+$/.test(pathname)) return true;
  if (pathname.startsWith('/shop/')) return true;
  if (pathname.startsWith('/categories/')) return true;
  return false;
}

function titleFromPath(pathname: string): string {
  if (pathname === '/') return 'Online Store';
  if (pathname === '/app' || pathname.startsWith('/app/')) return 'Dashboard Hub';
  return pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
    .join(' — ');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const bare = isPublicSurface(pathname);

  useEffect(() => {
    document.title = `${titleFromPath(pathname)} · Grabber Business OS`;
  }, [pathname]);

  useEffect(() => {
    if (bare) {
      document.documentElement.classList.remove('dark');
      return;
    }
    document.documentElement.classList.add('dark');
  }, [bare, pathname]);

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col mesh-bg selection:bg-emerald-500 selection:text-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-emerald-500 focus:text-zinc-950 focus:font-bold"
      >
        Skip to main content
      </a>

      <AppHeader onToggleJarvis={() => setIsJarvisOpen((v) => !v)} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto outline-none"
      >
        {children}
      </main>

      <JarvisDrawer isOpen={isJarvisOpen} onClose={() => setIsJarvisOpen(false)} />
    </div>
  );
}
