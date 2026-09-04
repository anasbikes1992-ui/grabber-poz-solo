'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap,
  Package,
  Users,
  BookOpen,
  Palette,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  RotateCcw,
  BarChart3,
  Sparkles,
  Wrench,
  ChevronDown,
  Warehouse,
  ArrowLeftRight,
  Barcode,
  UtensilsCrossed,
  Settings,
  Store,
  FileText,
  Clock,
  Briefcase,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { readLang, t, type Lang } from '@/lib/i18n/translations';

interface SessionUser {
  email: string;
  shopName: string;
  role: string;
}

interface AppHeaderProps {
  onToggleJarvis?: () => void;
}

type DropdownKey = 'commerce' | 'inventory' | 'finance' | 'verticals' | 'settings' | null;

export function AppHeader({ onToggleJarvis }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [lang, setLang] = useState<Lang>('en');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setLang(readLang());
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser({
            email: data.user?.email || data.email || 'owner@shop.lk',
            shopName: data.shopName || data.user?.name || 'Merchant Partner',
            role: data.user?.role || 'OWNER',
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));

    const onStorage = () => setLang(readLang());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMobileDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    setUser(null);
    setMobileDrawerOpen(false);
    router.push('/adminpoz');
    router.refresh();
  };

  const setLanguage = (next: Lang) => {
    localStorage.setItem('grabber_lang', next);
    setLang(next);
    window.dispatchEvent(new Event('storage'));
  };

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  // Nav Groups
  const commerceItems = [
    { href: '/orders', label: t('orders', lang), icon: ShoppingBag, desc: 'Live counter & online orders' },
    { href: '/returns', label: t('returns', lang), icon: RotateCcw, desc: 'Return authorizations & refunds' },
    { href: '/customers', label: t('customers', lang), icon: Users, desc: 'Customer accounts & history' },
    { href: '/store/builder', label: 'Storefront CMS', icon: Palette, desc: 'Online theme & hero layout' },
    { href: '/shop', label: 'Live Storefront', icon: ExternalLink, desc: 'View customer-facing catalog', external: true },
  ];

  const inventoryItems = [
    { href: '/products', label: t('inventory', lang), icon: Package, desc: 'Products, variants & pricing' },
    { href: '/settings/warehouses', label: 'Warehouses & Locations', icon: Warehouse, desc: 'Multi-location inventory' },
    { href: '/inventory/transfer', label: 'Stock Transfers', icon: ArrowLeftRight, desc: 'Inter-branch stock dispatch' },
    { href: '/inventory/stock-take', label: 'Stock Take Audit', icon: Package, desc: 'Physical audit & variance' },
    { href: '/barcodes', label: 'Barcode Hangtags', icon: Barcode, desc: 'Thermal labels & printing' },
  ];

  const financeItems = [
    { href: '/polim-potha', label: t('creditLedger', lang), icon: BookOpen, desc: 'Customer credit books & aging' },
    { href: '/reports', label: t('reports', lang), icon: BarChart3, desc: 'Daily sales, profit & summary' },
    { href: '/reports/tax', label: 'Tax & VAT Reports', icon: BarChart3, desc: 'Sales tax & liability' },
    { href: '/quotations', label: 'Quotations & Holds', icon: FileText, desc: 'Pro-forma invoices & reservations' },
  ];

  const verticalItems = [
    { href: '/repairs', label: 'Repairs Workbench', icon: Wrench, desc: 'Device tickets, OEM matrix & parts' },
    { href: '/pos/trade-in', label: 'Trade-in Calculator', icon: Wrench, desc: 'Device valuations & credits' },
    { href: '/restaurant/kds', label: 'Kitchen Display (KDS)', icon: UtensilsCrossed, desc: 'Chef order queue & tickets' },
    { href: '/restaurant', label: 'Dining Tables', icon: UtensilsCrossed, desc: 'Restaurant floor plan' },
    { href: '/creative', label: 'Creative Studio', icon: Sparkles, desc: 'Product PDF catalogs & ads' },
    { href: '/social', label: 'Social Media Hub', icon: Share2, desc: 'Social channels & catalogs' },
  ];

  const settingsItems = [
    { href: '/app', label: t('hub', lang), icon: LayoutDashboard, desc: 'Operational dashboard & alerts' },
    { href: '/shifts', label: 'Cash Drawer Shifts', icon: Clock, desc: 'Register open & close counts' },
    { href: '/settings', label: 'Business Settings', icon: Settings, desc: 'Company profile & tax defaults' },
    { href: '/settings/installation', label: 'Cloud & License', icon: Briefcase, desc: 'Dedicated host & status' },
  ];

  const isCommerceActive = commerceItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const isInventoryActive = inventoryItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const isFinanceActive = financeItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const isVerticalsActive = verticalItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const isSettingsActive = settingsItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl text-foreground">
        <div
          className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-purple-500 to-amber-400"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Solo Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer transition active:scale-95"
              aria-label="Open staff navigation menu"
              aria-expanded={mobileDrawerOpen}
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/app" className="flex items-center gap-2 group transition active:scale-95">
              <BrandLogo size="sm" showTagline={false} />
            </Link>

            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Solo Instance
            </span>
          </div>

          {/* Desktop Grouped Dropdown Navigation */}
          <nav
            ref={dropdownRef}
            className="hidden md:flex items-center gap-1.5 py-1"
            aria-label="Staff Navigation"
          >
            {/* Quick Action: Counter POS */}
            <Link
              href="/pos"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer mr-1 ${
                pathname === '/pos'
                  ? 'bg-emerald-400 text-zinc-950 shadow-emerald-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{t('counterPos', lang)}</span>
            </Link>

            {/* Dropdown: Commerce */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('commerce')}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'commerce'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isCommerceActive || openDropdown === 'commerce'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Commerce</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'commerce' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'commerce' && (
                <div className="absolute top-full left-0 mt-1.5 w-60 rounded-2xl bg-popover/95 border border-border shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    Commerce & Customers
                  </div>
                  {commerceItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                          active ? 'bg-secondary text-foreground font-semibold' : 'text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-card border border-border text-emerald-400 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight flex items-center gap-1">
                            {item.label}
                            {item.external && <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Inventory */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('inventory')}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'inventory'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isInventoryActive || openDropdown === 'inventory'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-teal-400" />
                <span>Inventory</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'inventory' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'inventory' && (
                <div className="absolute top-full left-0 mt-1.5 w-64 rounded-2xl bg-popover/95 border border-border shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    Multi-Warehouse & Stock
                  </div>
                  {inventoryItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                          active ? 'bg-secondary text-foreground font-semibold' : 'text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-card border border-border text-teal-400 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Finance */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('finance')}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'finance'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isFinanceActive || openDropdown === 'finance'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>Finance</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'finance' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'finance' && (
                <div className="absolute top-full left-0 mt-1.5 w-64 rounded-2xl bg-popover/95 border border-border shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    Ledger, AR & Reports
                  </div>
                  {financeItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                          active ? 'bg-secondary text-foreground font-semibold' : 'text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-card border border-border text-purple-400 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Verticals */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('verticals')}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'verticals'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isVerticalsActive || openDropdown === 'verticals'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                <span>Verticals</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'verticals' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'verticals' && (
                <div className="absolute top-full left-0 mt-1.5 w-68 rounded-2xl bg-popover/95 border border-border shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    Industry Special Modules
                  </div>
                  {verticalItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                          active ? 'bg-secondary text-foreground font-semibold' : 'text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-card border border-border text-amber-400 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Settings & Hub */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('settings')}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'settings'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isSettingsActive || openDropdown === 'settings'
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Settings</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'settings' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'settings' && (
                <div className="absolute top-full right-0 mt-1.5 w-60 rounded-2xl bg-popover/95 border border-border shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    System & Operations
                  </div>
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                          active ? 'bg-secondary text-foreground font-semibold' : 'text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-card border border-border text-zinc-400 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* User Controls & Session Status */}
          <div className="flex items-center gap-2">
            {!mounted ? (
              <div className="w-24 h-8 rounded-xl bg-zinc-900/50 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {onToggleJarvis && (
                  <button
                    type="button"
                    onClick={onToggleJarvis}
                    className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold cursor-pointer transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Jarvis</span>
                  </button>
                )}

                <ThemeToggle />

                {/* Staff session pill */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    {user.email[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-foreground font-bold text-[11px] truncate max-w-[110px]">{user.shopName}</div>
                    <div className="text-muted-foreground text-[9px] truncate max-w-[110px]">{user.role}</div>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="hidden sm:flex items-center bg-card border border-border rounded-xl p-0.5 text-[10px] font-bold">
                  {(['en', 'si', 'ta'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                        lang === code
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {code === 'en' ? 'EN' : code === 'si' ? 'සිං' : 'தமி'}
                    </button>
                  ))}
                </div>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  title="Sign out"
                  className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-red-500/10 border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-400 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('signOut', lang)}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/adminpoz"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('signIn', lang)}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Full Categorized Navigation Drawer */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col md:hidden animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label="Staff Menu"
          >
            <div className="bg-background border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" showTagline={false} />
                <span className="text-xs font-bold text-muted-foreground">· Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* User Card */}
              {user && (
                <div className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
                      {user.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-foreground font-bold text-xs">{user.shopName}</div>
                      <div className="text-muted-foreground text-[10px]">{user.role} · {user.email}</div>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              )}

              {/* Primary Action Button */}
              <Link
                href="/pos"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-98 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Open Counter POS</span>
              </Link>

              {/* Categorized Modules */}
              <div className="space-y-4 text-xs">
                {/* Commerce */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3 h-3 text-emerald-400" />
                    Commerce & Sales
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {commerceItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                          pathname === item.href
                            ? 'bg-secondary text-foreground font-bold border-border'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Inventory */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-teal-400" />
                    Multi-Warehouse & Stock
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {inventoryItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                          pathname === item.href
                            ? 'bg-secondary text-foreground font-bold border-border'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Finance */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-purple-400" />
                    Ledger & Finance
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {financeItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                          pathname === item.href
                            ? 'bg-secondary text-foreground font-bold border-border'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Verticals */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-amber-400" />
                    Industry Special Modules
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {verticalItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                          pathname === item.href
                            ? 'bg-secondary text-foreground font-bold border-border'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* System Settings */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Settings className="w-3 h-3 text-zinc-400" />
                    System & Operations
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {settingsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                          pathname === item.href
                            ? 'bg-secondary text-foreground font-bold border-border'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sign out */}
              {user && (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out of register</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Persistent Mobile Bottom Navigation Bar (Thumb Reach) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-3 py-2 flex items-center justify-around">
        <Link
          href="/pos"
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            pathname === '/pos' ? 'text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="w-4 h-4 text-emerald-400 fill-current" />
          </div>
          <span className="text-[10px]">POS</span>
        </Link>

        <Link
          href="/products"
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            pathname.startsWith('/products') ? 'text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px]">Stock</span>
        </Link>

        <Link
          href="/orders"
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            pathname.startsWith('/orders') ? 'text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="text-[10px]">Orders</span>
        </Link>

        <Link
          href="/app"
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            pathname === '/app' ? 'text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">Hub</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-1 p-1.5 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">All</span>
        </button>
      </div>
    </>
  );
}
