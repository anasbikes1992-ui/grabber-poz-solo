'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Boxes,
  Truck,
  BookOpen,
  Sparkles,
  SlidersVertical,
  Settings,
  ShieldCheck,
  DollarSign,
  Package,
  Users,
  Building2,
  Palette,
  MessageSquareText,
  Lock,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Core Commerce',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'POS Counter', href: '/pos', icon: ShoppingCart, highlight: true },
      { name: 'Web Storefront', href: '/store', icon: Store },
      { name: 'Store Builder', href: '/store/builder', icon: Palette },
      { name: 'WhatsApp Bot', href: '/whatsapp', icon: MessageSquareText },
    ],
  },
  {
    title: 'Catalog & Inventory',
    items: [
      { name: 'Products & SKUs', href: '/products', icon: Package },
      { name: 'Physical Stock', href: '/inventory', icon: Boxes },
      { name: 'Purchasing (PO/GRN)', href: '/purchasing', icon: Truck },
      { name: 'Suppliers (AP)', href: '/suppliers', icon: Building2 },
    ],
  },
  {
    title: 'Financials & Credit',
    items: [
      { name: 'Polim Potha (AR)', href: '/polim-potha', icon: BookOpen },
      { name: 'Customers (CRM)', href: '/customers', icon: Users },
      { name: 'General Ledger', href: '/accounts', icon: DollarSign },
    ],
  },
  {
    title: 'Studio & Admin',
    items: [
      { name: 'Creative Studio', href: '/creative', icon: Sparkles },
      { name: 'Setup Wizard', href: '/setup', icon: SlidersVertical },
      { name: 'Settings & Backups', href: '/settings', icon: Settings },
      { name: 'Super Admin Login', href: '/login', icon: Lock },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-md flex flex-col justify-between p-4 min-h-screen shrink-0 hidden md:flex">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 border-b border-border/60">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            G
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-foreground flex items-center gap-1.5">
              GRABBER <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">SOLO</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Business Operating System</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                          : item.highlight
                          ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 bg-blue-500/5 font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / RLS Badge */}
      <div className="pt-4 border-t border-border/60">
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px] font-bold">Single-DB RLS Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Role & location isolated. Zero multi-tenant overhead.
          </p>
        </div>
      </div>
    </aside>
  );
}
