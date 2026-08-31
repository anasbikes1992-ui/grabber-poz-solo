'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { JarvisDrawer } from '@/components/ai/jarvis-drawer';

/** Public storefront / shopper auth — no staff chrome */
function isPublicSurface(pathname: string): boolean {
  if (pathname === '/' || pathname === '/store' || pathname === '/login' || pathname === '/shop/login') {
    return true;
  }
  if (pathname.startsWith('/shop/')) return true;
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
  const [navOpen, setNavOpen] = useState(false);
  const bare = isPublicSurface(pathname);

  useEffect(() => {
    document.title = `${titleFromPath(pathname)} · Grabber Business OS`;
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (bare) {
      document.documentElement.classList.remove('dark');
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [bare]);

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex mesh-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-emerald-500 focus:text-zinc-950 focus:font-bold"
      >
        Skip to main content
      </a>

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onToggleJarvis={() => setIsJarvisOpen(!isJarvisOpen)}
          onToggleNav={() => setNavOpen((v) => !v)}
          navOpen={navOpen}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto outline-none"
        >
          {children}
        </main>
      </div>

      <JarvisDrawer isOpen={isJarvisOpen} onClose={() => setIsJarvisOpen(false)} />
    </div>
  );
}
