'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle, Package, Search, ShoppingBag, Wrench } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { StorefrontConfig } from '@/lib/config/storefront-config.shared';
import { blocksForSlot, DEFAULT_STOREFRONT } from '@/lib/config/storefront-config.shared';
import { DEFAULT_VERTICAL_FLAGS, type VerticalFlags } from '@/lib/config/vertical-flags';
import { storefrontThemeStyle, storefrontThemeAttrs, whatsappHref } from '@/lib/storefront/theme-vars';
import { PromotionPopup } from './PromotionPopup';

type Shopper = { id: string; name: string; phone: string | null; email: string | null };

function navLinkClass(active: boolean) {
  return [
    'inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 py-1.5 font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]',
    active
      ? 'bg-[var(--sf-primary)] text-[var(--sf-on-primary)]'
      : 'text-[var(--sf-primary)] hover:bg-[var(--sf-muted)]',
  ].join(' ');
}

export function StorefrontShell({
  children,
  cms = DEFAULT_STOREFRONT,
  verticalFlags = DEFAULT_VERTICAL_FLAGS,
  onOpenBag,
}: {
  children: React.ReactNode;
  cms?: StorefrontConfig;
  verticalFlags?: VerticalFlags;
  onOpenBag?: () => void;
}) {
  const pathname = usePathname();
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [bagCount, setBagCount] = useState(0);

  const announcement = blocksForSlot(cms.blocks, 'TOP').find((b) => b.type === 'ANNOUNCEMENT');
  const waLink = whatsappHref(cms.theme.whatsappNumber, 'Hi, I have a question about your store.');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/auth/shopper');
      const data = (await res.json()) as { authenticated?: boolean; customer?: Shopper };
      setShopper(data.authenticated && data.customer ? data.customer : null);
    })();
    try {
      const raw = localStorage.getItem('grabber_store_bag');
      if (raw) {
        const bag = JSON.parse(raw) as Array<{ qty: number }>;
        setBagCount(bag.reduce((s, l) => s + l.qty, 0));
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function signOut() {
    await fetch('/api/auth/shopper', { method: 'DELETE' });
    setShopper(null);
  }

  const isProducts = pathname === '/' || pathname.startsWith('/products') || pathname.startsWith('/categories');
  const isRepairs = pathname.startsWith('/shop/repairs');
  const showRepairs = verticalFlags.repairs;

  return (
    <div
      data-surface="storefront"
      {...storefrontThemeAttrs(cms.theme)}
      style={storefrontThemeStyle(cms.theme)}
      className="storefront min-h-screen bg-[var(--sf-background)] pb-20 text-[var(--sf-foreground)] md:pb-0"
    >
      <PromotionPopup />
      {announcement?.type === 'ANNOUNCEMENT' && (
        <div className="bg-[var(--sf-primary)] text-center text-xs font-semibold text-[var(--sf-on-primary)] px-4 py-2">
          {announcement.text}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[var(--sf-border)] bg-[var(--sf-background)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/shop" className="inline-flex shrink-0 cursor-pointer" aria-label="Grabber home">
            <BrandLogo size="md" showTagline={false} showSoloBadge={false} />
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Store navigation">
            <Link href="/shop" className={navLinkClass(isProducts)}>
              <Package className="mr-1.5 inline h-4 w-4" aria-hidden />
              Products
            </Link>
            {showRepairs && (
              <Link href="/shop/repairs" className={navLinkClass(isRepairs)}>
                <Wrench className="mr-1.5 inline h-4 w-4" aria-hidden />
                Repairs
              </Link>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-[var(--sf-accent)] hover:bg-[var(--sf-muted)]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/shop#catalog"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--sf-primary)] hover:bg-[var(--sf-muted)] md:hidden"
              aria-label="Search catalog"
            >
              <Search className="h-5 w-5" />
            </Link>
            {onOpenBag ? (
              <button
                type="button"
                onClick={onOpenBag}
                className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--sf-primary)] hover:bg-[var(--sf-muted)]"
                aria-label={`Shopping bag, ${bagCount} items`}
              >
                <ShoppingBag className="h-5 w-5" />
                {bagCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold text-white">
                    {bagCount}
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/shop#catalog"
                className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--sf-primary)] hover:bg-[var(--sf-muted)]"
                aria-label={`Shopping bag, ${bagCount} items`}
              >
                <ShoppingBag className="h-5 w-5" />
                {bagCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold text-white">
                    {bagCount}
                  </span>
                )}
              </Link>
            )}
            {shopper ? (
              <>
                <Link
                  href="/shop/account"
                  className="hidden min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-medium text-[var(--sf-primary)] hover:bg-[var(--sf-muted)] sm:inline-flex"
                >
                  Hi, {shopper.name.split(' ')[0]}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="hidden min-h-11 cursor-pointer items-center rounded-full px-3 py-1.5 text-sm text-[var(--sf-secondary)] hover:bg-[var(--sf-muted)] sm:inline-flex"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/shop/login"
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--sf-accent)] px-4 py-1.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--sf-border)] bg-[var(--sf-background)]/95 backdrop-blur-xl md:hidden"
        aria-label="Mobile store navigation"
      >
        <div className={`mx-auto grid max-w-lg gap-1 px-2 py-2 ${showRepairs ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <Link href="/shop" className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${isProducts ? 'text-[var(--sf-accent)]' : 'text-[var(--sf-secondary)]'}`}>
            <Package className="h-5 w-5" aria-hidden />
            Products
          </Link>
          {showRepairs && (
            <Link href="/shop/repairs" className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${isRepairs ? 'text-[var(--sf-accent)]' : 'text-[var(--sf-secondary)]'}`}>
              <Wrench className="h-5 w-5" aria-hidden />
              Repairs
            </Link>
          )}
          {showRepairs ? (
            <Link href="/shop/repairs/track" className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[var(--sf-secondary)]">
              <Search className="h-5 w-5" aria-hidden />
              Track
            </Link>
          ) : (
            waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[var(--sf-secondary)]">
                <MessageCircle className="h-5 w-5" aria-hidden />
                Chat
              </a>
            )
          )}
          <Link href="/#catalog" className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-[var(--sf-secondary)]">
            <ShoppingBag className="h-5 w-5" aria-hidden />
            Bag
          </Link>
        </div>
      </nav>
    </div>
  );
}
