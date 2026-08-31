'use client';

import React, { useEffect, useState } from 'react';
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
  Calculator,
  Barcode,
  Award,
  Tag,
  Layers,
  Wrench,
  UtensilsCrossed,
  CreditCard,
  Calendar,
  RotateCcw,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { DEFAULT_VERTICAL_FLAGS, fetchVerticalFlags, type VerticalFlags } from '@/lib/config/vertical-flags';

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  flag?: keyof VerticalFlags;
};

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Core Commerce',
    items: [
      { name: 'Dashboard Hub', href: '/app', icon: LayoutDashboard },
      { name: 'Counter POS', href: '/pos', icon: ShoppingCart, highlight: true },
      { name: 'Register Shifts (Z-Slip)', href: '/shifts', icon: Calculator },
      { name: 'Online Store (public)', href: '/', icon: Store },
      { name: 'Store Builder', href: '/store/builder', icon: Palette },
      { name: 'WhatsApp Bot', href: '/whatsapp', icon: MessageSquareText, flag: 'whatsapp' },
    ],
  },
  {
    title: 'Operation Modes & Verticals',
    items: [
      { name: 'Repair Job Sheet', href: '/repairs', icon: Wrench, flag: 'repairs' },
      { name: 'Restaurant & KOT', href: '/restaurant', icon: UtensilsCrossed, flag: 'restaurant' },
      { name: 'Hire Purchase (EMI)', href: '/hire-purchase', icon: CreditCard, flag: 'hirePurchase' },
      { name: 'B2B Wholesale Tiers', href: '/wholesale', icon: Building2, flag: 'wholesale' },
      { name: 'Appointments Hub', href: '/appointments', icon: Calendar, flag: 'appointments' },
      { name: 'Returns & Exchange', href: '/returns', icon: RotateCcw },
    ],
  },
  {
    title: 'Catalog & Inventory',
    items: [
      { name: 'Products & SKUs', href: '/products', icon: Package },
      { name: 'Excel / CSV Importer', href: '/products/import', icon: Layers },
      { name: 'Barcode Generator', href: '/barcodes', icon: Barcode },
      { name: 'Physical Stock', href: '/inventory', icon: Boxes },
      { name: 'Delivery Board', href: '/delivery', icon: Truck },
      { name: 'Purchasing (PO/GRN)', href: '/purchasing', icon: Truck },
      { name: 'Suppliers (AP)', href: '/suppliers', icon: Building2 },
    ],
  },
  {
    title: 'Financials & Loyalty',
    items: [
      { name: 'Polim Potha (AR)', href: '/polim-potha', icon: BookOpen },
      { name: 'Customer CRM', href: '/customers', icon: Users },
      { name: 'Loyalty Rewards', href: '/loyalty', icon: Award, flag: 'loyalty' },
      { name: 'Coupons & Discounts', href: '/discounts', icon: Tag },
      { name: 'General Ledger & P&L', href: '/accounts', icon: DollarSign },
    ],
  },
  {
    title: 'Studio & Admin',
    items: [
      { name: 'Creative Studio', href: '/creative', icon: Sparkles, flag: 'creative' },
      { name: 'Setup Wizard', href: '/setup', icon: SlidersVertical },
      { name: 'Settings Vault', href: '/settings', icon: Settings },
      { name: 'Admin Auth Gate', href: '/login', icon: Lock },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [flags, setFlags] = useState<VerticalFlags>(DEFAULT_VERTICAL_FLAGS);

  useEffect(() => {
    fetchVerticalFlags().then(setFlags);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const panel = (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-1 py-2 border-b border-white/10">
        <Link href="/app" onClick={() => onClose?.()} className="min-w-0 btn-press">
          <BrandLogo size="sm" showTagline={false} />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="md:hidden h-11 w-11 rounded-xl flex items-center justify-center text-zinc-300 hover:bg-white/10 cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav id="primary-nav" aria-label="Primary" className="space-y-4 flex-1 overflow-y-auto pr-1">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => !item.flag || flags[item.flag]);
          if (!visible.length) return null;
          const secId = `navsec-${section.title.replace(/\s+/g, '-')}`;
          return (
            <div key={section.title} role="group" aria-labelledby={secId} className="space-y-1">
              <h2 id={secId} className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {section.title}
              </h2>
              <ul className="space-y-0.5 list-none m-0 p-0">
                {visible.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onClose?.()}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ease-expo cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-zinc-950 font-extrabold shadow-glow-em'
                            : item.highlight
                              ? 'text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5 font-semibold border border-emerald-500/20'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-white/10">
        <div className="p-3 rounded-2xl glass-card text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span className="text-[11px]">Single-DB Isolated</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">Verticals gated by business_config flags.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl flex-col justify-between p-4 min-h-screen shrink-0 hidden md:flex text-white">
        {panel}
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm cursor-pointer"
            aria-label="Dismiss navigation"
            onClick={onClose}
          />
          <aside
            className="relative w-72 max-w-[85vw] h-full bg-zinc-950 text-white p-4 shadow-2xl flex flex-col border-r border-zinc-800"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
          >
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}
