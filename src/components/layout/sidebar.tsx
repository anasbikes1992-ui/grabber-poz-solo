'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Boxes,
  Truck,
  BookOpen,
  Sparkles,
  Settings,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'POS Counter', href: '/pos', icon: ShoppingCart, highlight: true },
  { name: 'Web Store', href: '/store', icon: Store },
  { name: 'Physical Stock', href: '/inventory', icon: Boxes },
  { name: 'Purchasing (PO/GRN)', href: '/purchasing', icon: Truck },
  { name: 'Polim Potha (AR)', href: '/polim-potha', icon: BookOpen },
  { name: 'Creative Studio', href: '/creative', icon: Sparkles },
  { name: 'Setup Wizard', href: '/setup', icon: Sliders },
  { name: 'Settings & Backups', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-md flex flex-col justify-between p-4 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-border/60">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            G
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-foreground flex items-center gap-1.5">
              GRABBER <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">SOLO</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Business Operating System</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                } ${item.highlight && !isActive ? 'border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Security Badge */}
      <div className="pt-4 border-t border-border/60">
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Single-DB RLS Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Role & location isolated. Zero multi-tenant overhead.
          </p>
        </div>
      </div>
    </aside>
  );
}
