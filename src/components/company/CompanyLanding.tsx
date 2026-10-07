'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Store,
  CreditCard,
  BookOpen,
  Boxes,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Gem,
  Monitor,
  TrendingUp,
  Wrench,
  Lock,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { CompanyLeadForm } from '@/components/company/CompanyLandingBelowFold';
import { publicWhatsAppHref } from '@/lib/public/contact-links';

/** Below-fold sections load as a separate chunk; hero stays in the first paint. */
const CompanyLandingBelowFold = dynamic(
  () => import('./CompanyLandingBelowFold').then((m) => m.CompanyLandingBelowFold),
  { ssr: true, loading: () => <div className="min-h-[40vh] bg-slate-950" aria-busy="true" /> },
);

const heroSystemCards = [
  { label: 'Counter POS', sub: 'Barcode & Thermal', icon: Monitor },
  { label: 'Inventory', sub: 'Warehouses & GRN', icon: Boxes },
  { label: 'Polim Potha', sub: 'Credit Ledger', icon: BookOpen },
  { label: 'Online Store', sub: 'Synced Catalog', icon: Store },
  { label: 'SL Gateways', sub: 'PayHere & BNPL', icon: CreditCard },
  { label: 'Business OS', sub: 'Financial Reports', icon: TrendingUp },
];

const verticalSignals = [
  { label: 'Fashion', icon: Sparkles },
  { label: 'Jewelry & Watches', icon: Gem },
  { label: 'Party Stores', icon: Store },
  { label: 'Repairs', icon: Wrench },
  { label: 'Grocery', icon: Boxes },
];

/** `demoUrl`: origin of the demo merchant (e.g. https://demo.grabberpoz.com). Empty = same origin. */
export function CompanyLanding({ demoUrl = '', salesWhatsapp = '' }: { demoUrl?: string; salesWhatsapp?: string }) {
  // Lead Capture Form State
  const [formData, setFormData] = useState<CompanyLeadForm>({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    businessType: 'Fashion & Apparel',
    branchCount: '1',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const whatsappHref = publicWhatsAppHref(
    salesWhatsapp,
    'Hi Grabber POZ, I want to inquire about Grabber Business OS Pro.',
  );

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
        setLeadError(data.error || 'Failed to submit inquiry');
      }
    } catch (err: unknown) {
      setLeadError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 text-xs sm:text-sm font-bold py-2 px-4 text-center">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>Grabber Business OS Pro is now available for Sri Lankan SMEs.</span>
          <a href="#contact" className="underline underline-offset-2 hover:text-white ml-1">
            Book a Live Demo &rarr;
          </a>
        </span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandLogo size="md" showTagline={false} showSoloBadge={true} />
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
              <a href="#verticals" className="hover:text-amber-400 transition-colors">Industries</a>
              <a href="#polim-potha" className="hover:text-amber-400 transition-colors">Polim Potha</a>
              <a href="#hardware" className="hover:text-amber-400 transition-colors">Hardware</a>
              <a href="#payments" className="hover:text-amber-400 transition-colors">Payments</a>
              <a href="#pricing" className="hover:text-amber-400 transition-colors">Pro Platform</a>
              <a href="#demos" className="hover:text-amber-400 transition-colors">Live Demos</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`${demoUrl}/adminpoz`}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" aria-hidden />
              <span>Staff Portal</span>
            </Link>
            <Link
              href={`${demoUrl}/shop`}
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" aria-hidden />
              <span>Storefront Demo</span>
            </Link>
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
            >
              <span>Start Your Business</span>
              <ArrowRight className="w-4 h-4" aria-hidden />
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="hidden xl:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                aria-label="WhatsApp Grabber POZ sales"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </a>
            )}
            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200"
              aria-expanded={mobileNavOpen}
              aria-controls="landing-mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <nav
            id="landing-mobile-nav"
            className="lg:hidden border-t border-slate-800 px-4 py-4 space-y-1 bg-slate-950"
            aria-label="Mobile page sections"
          >
            {[
              ['#features', 'Features'],
              ['#verticals', 'Industries'],
              ['#polim-potha', 'Polim Potha'],
              ['#hardware', 'Hardware'],
              ['#payments', 'Payments'],
              ['#pricing', 'Pro Platform'],
              ['#demos', 'Live Demos'],
              ['#contact', 'Contact'],
              ['/shop', 'Storefront Demo'],
              ['/terms', 'Terms'],
              ['/privacy', 'Privacy'],
            ].map(([href, label]) =>
              href.startsWith('#') ? (
                <a
                  key={href}
                  href={href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-amber-400"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-amber-400"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {label}
                </Link>
              ),
            )}
          </nav>
        )}
      </header>

      <main id="main-content">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-900 pt-16 pb-24 sm:pt-20 sm:pb-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-950/20 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engineered for Sri Lankan Commerce</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none mb-6">
            The All-in-One Retail & Commerce OS for <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">Sri Lanka</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Run your shop counter, touch POS, inventory, customer credit (Polim Potha), online store, and local payment gateways from one connected, standalone system.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            {verticalSignals.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-200 shadow-sm transition-colors duration-200 hover:border-amber-500/40 hover:text-amber-300"
                >
                  <Icon className="h-4 w-4 text-amber-400" aria-hidden />
                  {item.label}
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a
              href="#contact"
              className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span>Start Your Business</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href={`${demoUrl}/adminpoz`}
              className="px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-base transition-all flex items-center gap-2"
            >
              <Monitor className="w-5 h-5 text-amber-400" />
              <span>Try Live Cashier POS</span>
            </Link>
            <Link
              href={`${demoUrl}/shop`}
              className="px-8 py-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-amber-500/30 text-amber-300 font-bold text-base transition-all flex items-center gap-2"
            >
              <Store className="w-5 h-5 text-amber-400" />
              <span>Launch Store Demo</span>
            </Link>
          </div>

          {/* System Architecture Connectivity Bar */}
          <div className="max-w-5xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex flex-col items-center justify-center gap-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                A Single Real-time Data Backbone
              </p>
              <p className="text-xs text-slate-500">
                One Pro package. Business type, logo, storefront style, and modules are selected in Settings.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-left">
              {heroSystemCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl transition-colors duration-200 hover:border-amber-500/40">
                    <Icon className="w-5 h-5 text-amber-400 mb-2" />
                    <div className="text-sm font-bold text-white leading-tight">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

        <CompanyLandingBelowFold
          demoUrl={demoUrl}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          submitted={submitted}
          leadError={leadError}
          onLeadSubmit={handleLeadSubmit}
        />
      </main>

      <footer className="border-t border-slate-800 py-12 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={true} />
            <span>&copy; 2026 Grabber POZ. Precision Retail & Commerce OS.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href={`${demoUrl}/shop`} className="hover:text-white transition-colors">Storefront Demo</Link>
            <Link href={`${demoUrl}/adminpoz`} className="hover:text-white transition-colors">Staff Portal</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pro Platform</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Sales</a>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition-colors">
                WhatsApp Sales
              </a>
            )}
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/delivery-policy" className="hover:text-white transition-colors">Delivery</Link>
            <Link href="/refund-policy" className="hover:text-white transition-colors">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
