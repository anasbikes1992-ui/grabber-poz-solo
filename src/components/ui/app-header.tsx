'use client';

import React, { useEffect, useState } from 'react';
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

export function AppHeader({ onToggleJarvis }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

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

  const handleSignOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    setUser(null);
    setMobileMenuOpen(false);
    router.push('/adminpoz');
    router.refresh();
  };

  const setLanguage = (next: Lang) => {
    localStorage.setItem('grabber_lang', next);
    setLang(next);
    window.dispatchEvent(new Event('storage'));
  };

  const navLinks = [
    { href: '/app', label: t('hub', lang), icon: LayoutDashboard },
    { href: '/pos', label: t('counterPos', lang), icon: Zap, highlight: true },
    { href: '/products', label: t('inventory', lang), icon: Package },
    { href: '/orders', label: t('orders', lang), icon: ShoppingBag },
    { href: '/repairs', label: 'Repairs', icon: Wrench },
    { href: '/returns', label: t('returns', lang), icon: RotateCcw },
    { href: '/reports', label: t('reports', lang), icon: BarChart3 },
    { href: '/customers', label: t('customers', lang), icon: Users },
    { href: '/polim-potha', label: t('creditLedger', lang), icon: BookOpen },
    { href: '/store/builder', label: t('storefront', lang), icon: Palette },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl text-foreground">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-purple-500 to-amber-400"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer btn-press"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/app" className="flex items-center gap-2 group btn-press">
            <BrandLogo size="sm" showTagline={false} />
          </Link>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {user ? 'Authenticated Workspace' : 'Solo Instance'}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1" aria-label="Primary">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 fill-current" />
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-foreground font-semibold border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!mounted ? (
            <div className="w-24 h-8 rounded-xl bg-zinc-900/50 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {onToggleJarvis && (
                <button
                  type="button"
                  onClick={onToggleJarvis}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-bold cursor-pointer btn-press"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Jarvis
                </button>
              )}

              <ThemeToggle />

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                  {user.email[0]?.toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-foreground font-bold text-[11px] truncate max-w-[120px]">{user.shopName}</div>
                  <div className="text-muted-foreground text-[9px] truncate max-w-[120px]">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center bg-card border border-border rounded-xl p-0.5 text-[10px] font-bold">
                {(['en', 'si', 'ta'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      lang === code ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {code === 'en' ? 'EN' : code === 'si' ? 'සිං' : 'தமி'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                title="Sign out"
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-red-500/10 border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-400 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer btn-press"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('signOut', lang)}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/adminpoz"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer btn-press"
            >
              <LogIn className="w-3.5 h-3.5" />
              {t('signIn', lang)}
            </Link>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 p-4 space-y-2 text-xs">
          {user && (
            <div className="p-3 mb-3 rounded-xl bg-card border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                {user.email[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-foreground font-bold text-xs">{user.shopName}</div>
                <div className="text-muted-foreground text-[10px]">{user.email}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${
                    link.highlight
                      ? 'bg-emerald-500 text-zinc-950'
                      : isActive
                        ? 'bg-secondary text-foreground border border-border'
                        : 'bg-card text-muted-foreground border border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
