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
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Core Commerce',
    items: [
      { name: 'Dashboard Hub', href: '/', icon: LayoutDashboard },
      { name: 'Counter POS', href: '/pos', icon: ShoppingCart, highlight: true },
      { name: 'Register Shifts (Z-Slip)', href: '/shifts', icon: Calculator },
      { name: 'Web Storefront', href: '/store', icon: Store },
      { name: 'Store Builder', href: '/store/builder', icon: Palette },
      { name: 'WhatsApp Bot', href: '/whatsapp', icon: MessageSquareText },
    ],
  },
  {
    title: 'Operation Modes & Verticals',
    items: [
      { name: 'Repair Job Sheet', href: '/repairs', icon: Wrench },
      { name: 'Restaurant & KOT', href: '/restaurant', icon: UtensilsCrossed },
      { name: 'Hire Purchase (EMI)', href: '/hire-purchase', icon: CreditCard },
      { name: 'B2B Wholesale Tiers', href: '/wholesale', icon: Building2 },
      { name: 'Appointments Hub', href: '/appointments', icon: Calendar },
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
      { name: 'Loyalty Rewards', href: '/loyalty', icon: Award },
      { name: 'Coupons & Discounts', href: '/discounts', icon: Tag },
      { name: 'General Ledger & P&L', href: '/accounts', icon: DollarSign },
    ],
  },
  {
    title: 'Studio & Admin',
    items: [
      { name: 'Creative Studio', href: '/creative', icon: Sparkles },
      { name: 'Setup Wizard', href: '/setup', icon: SlidersVertical },
      { name: 'Settings Vault', href: '/settings', icon: Settings },
      { name: 'Admin Auth Gate', href: '/login', icon: Lock },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0B0F17]/95 backdrop-blur-xl flex flex-col justify-between p-4 min-h-screen shrink-0 hidden md:flex text-white">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-2 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-extrabold shadow-md shadow-emerald-500/20">
            G
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none text-white flex items-center gap-1.5">
              GR<span className="text-emerald-400">O</span>BBER <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">SOLO</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Single-Tenant Business OS</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-extrabold shadow-md shadow-emerald-400/20'
                          : item.highlight
                          ? 'text-cyan-400 hover:bg-cyan-500/10 bg-cyan-500/5 font-semibold border border-cyan-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
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
      <div className="pt-4 border-t border-white/10">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px]">Single-DB Isolated</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Role & location isolated. 0% multi-tenant overhead.
          </p>
        </div>
      </div>
    </aside>
  );
}
