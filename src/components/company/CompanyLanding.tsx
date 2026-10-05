'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ButtonLink } from '@/components/company/ui/Button';
import { WhatsAppFloat } from '@/components/company/ui/WhatsAppButton';
import { ScreenshotFrame } from '@/components/company/ScreenshotFrame';
import type { CompanyLeadForm } from '@/components/company/CompanyLandingBelowFold';
import type { MarketingAssets } from '@/lib/company/marketing-assets';

/** Below-fold sections load as a separate chunk; hero stays in the first paint. */
const CompanyLandingBelowFold = dynamic(
  () => import('./CompanyLandingBelowFold').then((m) => m.CompanyLandingBelowFold),
  { ssr: true, loading: () => <div className="min-h-[40vh] bg-cs-paper" aria-busy="true" /> },
);

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
];

/**
 * `demoUrl`: origin of the demo merchant (e.g. https://demo.grabberpoz.com). Empty = same origin.
 * `whatsappNumber`: sales WhatsApp number (digits); the floating chat button is hidden without it.
 */
export function CompanyLanding({
  demoUrl = '',
  whatsappNumber = '',
  assets,
}: {
  demoUrl?: string;
  whatsappNumber?: string;
  /** Which product screenshots exist; sections fall back to text-only without them. */
  assets?: MarketingAssets;
}) {
  const [formData, setFormData] = useState<CompanyLeadForm>({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    businessType: 'Fashion & Apparel',
    branchCount: '1',
    message: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Mobile sheet: Esc closes, focus moves in and returns to the burger, Tab stays inside.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const sheet = sheetRef.current;
    const focusable = () =>
      Array.from(sheet?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    focusable()[0]?.focus();
    const burger = burgerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      burger?.focus();
    };
  }, [mobileNavOpen]);

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLeadError(null);
    try {
      const res = await fetch('/api/company/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setLeadError(data.error || 'Could not send your request. Please try again.');
      }
    } catch {
      setLeadError('Could not send your request. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="company-site min-h-screen bg-cs-paper font-sans text-cs-ink text-[17px] leading-relaxed selection:bg-cs-brick selection:text-white">
      <header className="sticky top-0 z-40 border-b border-cs-line bg-cs-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Grabber POZ home">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={false} variant="ink" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-cs-muted md:flex" aria-label="Page sections">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="rounded transition-colors hover:text-cs-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cs-brick">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={`${demoUrl}/shop`}
              className="hidden min-h-11 items-center px-2 text-sm font-semibold text-cs-ink underline-offset-4 hover:underline lg:inline-flex"
            >
              Try the demo
            </Link>
            <ButtonLink href="#contact" size="md" className="px-4 sm:px-5">
              Get a free demo
            </ButtonLink>
            <button
              ref={burgerRef}
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cs-line bg-cs-card text-cs-ink md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="landing-mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <div
          ref={sheetRef}
          id="landing-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-cs-paper px-4 py-6 md:hidden"
        >
          <nav className="space-y-1" aria-label="Mobile page sections">
            {[...navLinks, { href: `${demoUrl}/shop`, label: 'Try the demo store' }].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="flex min-h-12 items-center rounded-xl px-3 text-lg font-bold text-cs-ink hover:bg-cs-sand"
                onClick={() => setMobileNavOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      <main id="main-content">
        <section className="border-b border-cs-line pb-16 pt-12 sm:pb-24 sm:pt-16">
          <div className={`mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:px-8 ${assets?.pos ? 'lg:grid-cols-[1.05fr_1fr] lg:gap-10' : ''}`}>
            <div className="min-w-0">
              <p className="mb-4 text-sm font-bold text-cs-brick">Made for Sri Lankan shops</p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                POS, stock and online store for Sri Lankan shops, in one system.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-cs-muted sm:text-xl">
                Sell at the counter, track every item, give customers credit and take online orders. Works with your barcode scanner, receipt printer and PayHere.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="#contact" size="lg" icon={<ArrowRight className="h-5 w-5" aria-hidden />} className="w-full sm:w-auto">
                  Get a free demo
                </ButtonLink>
                <ButtonLink href={`${demoUrl}/shop`} variant="secondary" size="lg" className="w-full sm:w-auto">
                  Try the live demo store
                </ButtonLink>
              </div>
            </div>

            {assets?.pos && (
              <ScreenshotFrame
                src="/marketing/pos-checkout.webp"
                alt="The Grabber POZ counter screen with items in a customer's bill and a Pay button"
                width={1440}
                height={900}
                priority
              />
            )}
          </div>
        </section>

        <CompanyLandingBelowFold
          demoUrl={demoUrl}
          whatsappNumber={whatsappNumber}
          assets={assets}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          submitted={submitted}
          leadError={leadError}
          onLeadSubmit={handleLeadSubmit}
        />
      </main>

      <footer className="border-t border-cs-line bg-cs-sand py-10 text-sm text-cs-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={false} variant="ink" />
            <span>&copy; 2026 Grabber POZ. Built in Sri Lanka.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href={`${demoUrl}/shop`} className="hover:text-cs-ink">Demo store</Link>
            <a href="#pricing" className="hover:text-cs-ink">Pricing</a>
            <a href="#contact" className="hover:text-cs-ink">Contact</a>
            <Link href={`${demoUrl}/adminpoz`} className="hover:text-cs-ink">Client login</Link>
          </div>
        </div>
      </footer>

      <WhatsAppFloat number={whatsappNumber} />
    </div>
  );
}
