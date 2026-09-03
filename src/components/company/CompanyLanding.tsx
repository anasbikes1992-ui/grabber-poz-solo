'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Store,
  CreditCard,
  BookOpen,
  Boxes,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Monitor,
  Printer,
  Barcode,
  Smartphone,
  Check,
  MessageCircle,
  TrendingUp,
  Building2,
  Send,
  Loader2,
  Lock,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';

export function CompanyLanding() {
  // Lead Capture Form State
  const [formData, setFormData] = useState({
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
  const [leadError, setLeadError] = useState<string | null>(null);

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
          <span>Grabber POZ Solo Edition is now available for Sri Lankan retail merchants.</span>
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
              <a href="#polim-potha" className="hover:text-amber-400 transition-colors">Polim Potha</a>
              <a href="#hardware" className="hover:text-amber-400 transition-colors">Hardware</a>
              <a href="#payments" className="hover:text-amber-400 transition-colors">Payments</a>
              <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
              <a href="#demos" className="hover:text-amber-400 transition-colors">Live Demos</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/adminpoz"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff Portal</span>
            </Link>
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Storefront Demo</span>
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
            >
              <span>Start Your Business</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

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

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a
              href="#contact"
              className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span>Start Your Business</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/adminpoz"
              className="px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-base transition-all flex items-center gap-2"
            >
              <Monitor className="w-5 h-5 text-amber-400" />
              <span>Try Live Cashier POS</span>
            </Link>
            <Link
              href="/shop"
              className="px-8 py-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-amber-500/30 text-amber-300 font-bold text-base transition-all flex items-center gap-2"
            >
              <Store className="w-5 h-5 text-amber-400" />
              <span>Launch Store Demo</span>
            </Link>
          </div>

          {/* System Architecture Connectivity Bar */}
          <div className="max-w-5xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              A Single Real-time Data Backbone
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-left">
              {[
                { label: 'Counter POS', sub: 'Barcode & Thermal', icon: Monitor },
                { label: 'Inventory', sub: 'Warehouses & GRN', icon: Boxes },
                { label: 'Polim Potha', sub: 'Credit Ledger', icon: BookOpen },
                { label: 'Online Store', sub: 'Synced Catalog', icon: Store },
                { label: 'SL Gateways', sub: 'PayHere & BNPL', icon: CreditCard },
                { label: 'Business OS', sub: 'Financial Reports', icon: TrendingUp },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
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

      {/* Feature Section 1: POS & Counter Experience */}
      <section id="features" className="py-24 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase">
                <Monitor className="w-3.5 h-3.5" />
                <span>Counter Speed & Stability</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                High-Speed Retail POS Built for Rush Hours
              </h2>
              <p className="text-slate-300 leading-relaxed text-base">
                Engineered for continuous operation at checkout counters. Scan barcodes, select variants, apply authorized discounts, split bills across cash and card, and issue receipts in milliseconds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'Instant barcode scan & SKU lookup',
                  'Split tender: Cash, Card, Credit, QR',
                  'Thermal receipt printing (58mm & 80mm)',
                  'Cash drawer float & register shift closing',
                  'Supervisor override & discount controls',
                  'Branch-aware pricing and stock checks',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* POS UI Preview Mock */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">Grabber POS — Register 01 (Colombo 03)</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ONLINE · SHIFT OPEN
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-bold text-white">Linen Casual Shirt (L)</div>
                      <div className="text-xs text-slate-400 font-mono">SKU: DEMO-SHIRT-L</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400">LKR 4,500</div>
                      <div className="text-xs text-slate-400">Qty: 2</div>
                    </div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-bold text-white">Stretch Chino Trousers (32)</div>
                      <div className="text-xs text-slate-400 font-mono">SKU: DEMO-CHINO-32</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-400">LKR 6,500</div>
                      <div className="text-xs text-slate-400">Qty: 1</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white font-mono">LKR 15,500</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Promo (SAVE10)</span>
                      <span className="text-emerald-400 font-mono">-LKR 1,550</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>VAT (18%)</span>
                      <span className="text-white font-mono">LKR 2,511</span>
                    </div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>Payable</span>
                      <span className="text-amber-400 font-mono">LKR 16,461</span>
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs mt-4">
                    Complete Cash Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Polim Potha (Customer Credit Ledger) */}
      <section id="polim-potha" className="py-24 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm text-white">Polim Potha — Customer Credit Account</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">Nimal Perera · 0771234567</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Credit Limit</div>
                  <div className="text-base font-bold text-slate-200 font-mono">LKR 50,000</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Outstanding</div>
                  <div className="text-base font-bold text-rose-400 font-mono">LKR 18,500</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Available</div>
                  <div className="text-base font-bold text-emerald-400 font-mono">LKR 31,500</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200">Invoice #INV-1092 (Credit Sale)</div>
                    <div className="text-[11px] text-slate-400">2026-09-01 · 3 items</div>
                  </div>
                  <span className="font-mono font-bold text-rose-400">+LKR 8,500</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200">Payment Received (Cash at Counter)</div>
                    <div className="text-[11px] text-slate-400">2026-08-28 · Rec #REC-554</div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">-LKR 10,000</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sri Lankan Retail Tradition Digitized</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Polim Potha — Customer Credit & Payment Ledger
              </h2>
              <p className="text-slate-300 leading-relaxed text-base">
                Sri Lankan retail thrives on trusted customer credit. Grabber POZ replaces handwritten paper books with an authoritative digital ledger that enforces strict credit limits, tracks partial repayments, and maintains an unalterable audit trail.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  'Customer-specific credit limits with manager override',
                  'Automatic outstanding balance calculations on every sale',
                  'Partial and full cash/card repayments with receipts',
                  'Instant statement printing for dispute-free customer relations',
                  'Tightly coupled with General Ledger accounts receivable (AR)',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Hardware Compatibility */}
      <section id="hardware" className="py-24 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-4">
            <Monitor className="w-3.5 h-3.5" />
            <span>Counter Hardware Ready</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Works with the Hardware You Already Own
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-16 text-base">
            No proprietary, locked-in hardware required. Grabber POZ runs seamlessly in modern browsers across Windows PCs, touch terminals, laptops, and tablets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              {
                title: 'Barcode Scanners',
                desc: 'Standard USB & Bluetooth handheld or omnidirectional presentation scanners.',
                icon: Barcode,
              },
              {
                title: 'Thermal Receipt Printers',
                desc: 'Direct ESC/POS printing for 58mm and 80mm thermal receipt printers via USB or Network.',
                icon: Printer,
              },
              {
                title: 'Cash Drawers',
                desc: 'Standard RJ11 cash drawers triggered automatically on receipt completion.',
                icon: Store,
              },
              {
                title: 'Touch POS & Tablets',
                desc: 'Responsive touch interface optimized for 10" to 24" touch terminals, iPads, and PCs.',
                icon: Smartphone,
              },
            ].map((hw) => {
              const Icon = hw.icon;
              return (
                <div key={hw.title} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{hw.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{hw.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Section 4: Sri Lankan Payment Gateways */}
      <section id="payments" className="py-24 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-4">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Sri Lankan Payments Ecosystem</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Certified Sri Lanka Payment Gateways
            </h2>
            <p className="text-slate-300 text-base">
              Accept cards, wallets, and Buy Now Pay Later (BNPL) through standardized adapters that preserve complete payment and general ledger reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Cash on Delivery (COD)',
                type: 'Counter & Storefront',
                status: 'Production Ready',
                statusColor: 'emerald',
                desc: 'Standard courier delivery payment with driver collection and settlement tracking.',
              },
              {
                name: 'PayHere Gateway',
                type: 'Cards & Wallets',
                status: 'Regression Certified',
                statusColor: 'emerald',
                desc: 'Visa, Mastercard, FriMi, Genie, EzCash, and mCash with HMAC-SHA256 callback verification.',
              },
              {
                name: 'WebXPay',
                type: 'Direct Card Processing',
                status: 'Sandbox Ready',
                statusColor: 'amber',
                desc: 'Standardized card checkout through WebXPay secure payment forms.',
              },
              {
                name: 'Koko BNPL',
                type: '3-Month Installments',
                status: 'Sandbox Ready',
                statusColor: 'amber',
                desc: 'Allow shoppers to split payments into 3 interest-free installments.',
              },
              {
                name: 'Mintpay',
                type: 'Pay Later (Online & Store)',
                status: 'Sandbox Ready',
                statusColor: 'amber',
                desc: 'Shoppers pay in 3 while merchants receive full settlement upfront.',
              },
              {
                name: 'Payzy',
                type: 'Installment Checkout',
                status: 'Sandbox Ready',
                statusColor: 'amber',
                desc: 'Flexible installment financing built into storefront checkout.',
              },
            ].map((gw) => (
              <div key={gw.name} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-slate-400 uppercase">{gw.type}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        gw.statusColor === 'emerald'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {gw.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{gw.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{gw.desc}</p>
                </div>
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>M3 Canonical Reconciliation Protected</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Packages Section */}
      <section id="pricing" className="py-24 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-4">
              <Boxes className="w-3.5 h-3.5" />
              <span>Transparent Software Editions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Choose the Edition That Fits Your Business
            </h2>
            <p className="text-slate-300 text-base">
              Perpetual standalone license with dedicated Postgres database for every single installation. No multi-tenant data sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Standard Edition */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Single Store</div>
                <h3 className="text-2xl font-black text-white mb-2">Standard Edition</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Perfect for boutique shops, single-location retail, and growing retail stores.
                </p>
                <div className="space-y-3 text-sm text-slate-300 mb-8">
                  {[
                    '1 retail branch location',
                    'Unlimited cashier counter terminals',
                    'Fast touch POS & thermal receipts',
                    'Inventory with variants & barcodes',
                    'Customer database & purchase history',
                    'Basic online storefront with catalog',
                    'Basic promotions & discount codes',
                    'Perpetual software license',
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="#contact"
                className="w-full py-3 text-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
              >
                Inquire for Standard
              </a>
            </div>

            {/* Pro Edition (Highlighted) */}
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-amber-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-xs font-black uppercase px-3 py-0.5 rounded-full shadow-md">
                Most Popular for Retailers
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Multi-Branch Retail</div>
                <h3 className="text-2xl font-black text-white mb-2">Pro Edition</h3>
                <p className="text-xs text-slate-400 mb-6">
                  For expanding businesses needing branch transfers, Polim Potha credit, and payment gateways.
                </p>
                <div className="space-y-3 text-sm text-slate-200 mb-8">
                  {[
                    'Everything in Standard, plus:',
                    'Multi-branch & warehouse management',
                    'Inter-branch stock transfer requests & GRN',
                    'Polim Potha customer credit ledger',
                    'Advanced promotions engine (M5 popup/rules)',
                    'Sri Lanka payment gateway integration',
                    'WhatsApp automated commerce & orders',
                    'VAT & Tax invoice breakdown reports',
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="#contact"
                className="w-full py-3.5 text-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                Start with Pro
              </a>
            </div>

            {/* Enterprise Edition */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Chains & Distributors</div>
                <h3 className="text-2xl font-black text-white mb-2">Enterprise Edition</h3>
                <p className="text-xs text-slate-400 mb-6">
                  For retail chains, wholesale merchants, and businesses requiring customized deployment.
                </p>
                <div className="space-y-3 text-sm text-slate-300 mb-8">
                  {[
                    'Everything in Pro, plus:',
                    'Custom business workflows & logic',
                    'ERP, accounting & custom API connectors',
                    'Dedicated hardware & deployment setup',
                    'Custom domain & custom whitelabel branding',
                    'On-site staff onboarding & training',
                    'Dedicated SLA & priority engineering support',
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href="#contact"
                className="w-full py-3 text-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Demo Section */}
      <section id="demos" className="py-20 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Test the System Right Now</h2>
            <p className="text-slate-400 text-sm">
              Explore the customer-facing storefront or launch the counter cashier POS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Storefront Demo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Experience what your shoppers see: browse sample catalog, test promo codes, add to bag, and simulate checkout.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
              >
                <span>Open Storefront Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <Monitor className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Counter Cashier POS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test the staff counter POS: select cashier role, enter PIN, scan barcodes, and ring up sales.
              </p>
              <Link
                href="/adminpoz"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
              >
                <span>Launch Cashier POS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture / Contact Section */}
      <section id="contact" className="py-24 border-t border-slate-800/80 bg-slate-900/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-4">
              <Send className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Start Your Business with Grabber POZ
            </h2>
            <p className="text-slate-400 text-sm">
              Fill out the form below. Our Colombo onboarding team will contact you to schedule a full demonstration and provision your instance.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Thank you for your interest!</h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  We have received your business inquiry. A Grabber POZ deployment specialist will reach out to you via WhatsApp or phone shortly.
                </p>
                <div className="pt-4">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                  >
                    <span>Explore Storefront Demo in the meantime</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-5">
                {leadError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {leadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Business / Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="e.g. ABC Fashion"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Owner / Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="e.g. Kasun Fernando"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Phone / WhatsApp Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="077XXXXXXX"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="owner@yourshop.lk"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Business Industry</label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Fashion & Apparel">Fashion & Apparel</option>
                      <option value="Electronics & Mobile Repair">Electronics & Mobile Repair</option>
                      <option value="Grocery & Supermarket">Grocery & Supermarket</option>
                      <option value="Pharmacy & Health">Pharmacy & Health</option>
                      <option value="Restaurant & Cafe">Restaurant & Cafe</option>
                      <option value="Wholesale & Hardware">Wholesale & Hardware</option>
                      <option value="Other Retail">Other Retail</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Branch Count</label>
                    <select
                      value={formData.branchCount}
                      onChange={(e) => setFormData({ ...formData, branchCount: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="1">1 Location (Single Store)</option>
                      <option value="2-3">2 – 3 Locations</option>
                      <option value="4-10">4 – 10 Locations</option>
                      <option value="10+">10+ Locations (Chain)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Additional Requirements or Questions</label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your current POS, barcode scanner needs, or timeline..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry & Schedule Demo</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={true} />
            <span>&copy; 2026 Grabber POZ. Precision Retail & Commerce OS.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/shop" className="hover:text-white transition-colors">Storefront Demo</Link>
            <Link href="/adminpoz" className="hover:text-white transition-colors">Staff Portal</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Sales</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
