'use client';

import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  ArrowRight,
  Barcode,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Monitor,
  Printer,
  Smartphone,
  Store,
  Wrench,
  Gem,
  Shirt,
  PartyPopper,
  ShoppingBasket,
} from 'lucide-react';
import { ButtonLink, Button } from '@/components/company/ui/Button';
import { ScreenshotFrame } from '@/components/company/ScreenshotFrame';
import { Testimonials } from '@/components/company/Testimonials';
import { Faq } from '@/components/company/Faq';
import { COMPANY_WHATSAPP_MESSAGE } from '@/components/company/ui/WhatsAppButton';
import { whatsappHref } from '@/lib/storefront/theme-vars';
import type { MarketingAssetKey, MarketingAssets } from '@/lib/company/marketing-assets';

export type CompanyLeadForm = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType: string;
  branchCount: string;
  message: string;
  /** Honeypot: real visitors never see or fill this. */
  website?: string;
};

const shopTypes = [
  { label: 'Clothing & fashion', icon: Shirt },
  { label: 'Jewellery & watches', icon: Gem },
  { label: 'Party & gift shops', icon: PartyPopper },
  { label: 'Phone & repair shops', icon: Wrench },
  { label: 'Grocery & supermarkets', icon: ShoppingBasket },
  { label: 'Wholesale & hardware', icon: Boxes },
];

const benefitBlocks = [
  {
    id: 'features',
    title: 'Sell faster at the counter',
    lead: 'Scan, bill and print the receipt in seconds, even when the shop is full.',
    points: ['Scan barcodes or search by name', 'Cash, card and credit on one bill', 'Prints on standard receipt printers', 'Close your day with one tap'],
    asset: 'pos' as MarketingAssetKey,
    image: { src: '/marketing/pos-checkout.webp', alt: 'Counter screen with a bill being rung up', width: 1440, height: 900, device: 'laptop' as const },
  },
  {
    title: 'Always know what is in stock',
    lead: 'Every sale, return and delivery updates your stock automatically.',
    points: ['See low stock before it runs out', 'Receive supplier stock and print labels', 'Manage more than one branch', 'Sell the oldest stock first'],
    asset: 'inventory' as MarketingAssetKey,
    image: { src: '/marketing/inventory.webp', alt: 'Stock list showing items, quantities and low-stock warnings', width: 1440, height: 900, device: 'laptop' as const },
  },
  {
    title: 'Open your online store',
    lead: 'Your shop gets its own website, using the same products and stock as the counter.',
    points: ['Customers order from their phone', 'Cash on delivery or card payment', 'No double entry, one stock for both', 'Share products on WhatsApp'],
    asset: 'storefront' as MarketingAssetKey,
    image: { src: '/marketing/storefront-phone.webp', alt: 'Online store product list on a phone', width: 390, height: 844, device: 'phone' as const },
  },
];

export function CompanyLandingBelowFold({
  demoUrl = '',
  whatsappNumber = '',
  assets,
  formData,
  setFormData,
  submitting,
  submitted,
  leadError,
  onLeadSubmit,
}: {
  demoUrl?: string;
  whatsappNumber?: string;
  assets?: MarketingAssets;
  formData: CompanyLeadForm;
  setFormData: Dispatch<SetStateAction<CompanyLeadForm>>;
  submitting: boolean;
  submitted: boolean;
  leadError: string | null;
  onLeadSubmit: (e: FormEvent) => void;
}) {
  const waLink = whatsappHref(whatsappNumber, COMPANY_WHATSAPP_MESSAGE);
  const inputCls =
    'w-full min-h-11 rounded-xl border border-cs-line bg-cs-card px-4 py-2.5 text-base text-cs-ink placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cs-brick';
  const labelCls = 'mb-1.5 block text-sm font-bold text-cs-ink';

  return (
    <>
      <section className="border-b border-cs-line py-12" aria-labelledby="shop-types-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="shop-types-heading" className="font-display text-xl font-bold text-cs-ink">
            Built for shops like yours
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {shopTypes.map(({ label, icon: Icon }) => (
              <li key={label} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cs-line bg-cs-card px-4 text-sm font-semibold">
                <Icon className="h-4 w-4 text-cs-brick" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {benefitBlocks.map((block, i) => {
        const hasImage = Boolean(assets?.[block.asset]);
        return (
          <section
            key={block.title}
            id={block.id}
            className={`scroll-mt-24 border-b border-cs-line py-16 sm:py-24 ${i % 2 === 1 ? 'bg-cs-sand' : ''}`}
          >
            <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:px-8 ${hasImage ? 'lg:grid-cols-2 lg:gap-16' : ''}`}>
              <div className={`min-w-0 ${hasImage && i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{block.title}</h2>
                <p className="mt-4 text-lg text-cs-muted">{block.lead}</p>
                <ul className="mt-6 space-y-3">
                  {block.points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <Check className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {hasImage && (
                <div className={`min-w-0 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <ScreenshotFrame {...block.image} />
                </div>
              )}
            </div>
          </section>
        );
      })}

      <section id="credit" className="scroll-mt-24 border-b border-cs-line py-16 sm:py-24">
        <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:px-8 ${assets?.credit ? 'lg:grid-cols-2 lg:gap-16' : ''}`}>
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Customer credit, without the notebook</h2>
            <p className="mt-4 text-lg text-cs-muted">
              Polim Potha keeps every customer&apos;s credit and payments in one place, so you always know who owes what.
            </p>
            <ul className="mt-6 space-y-3">
              {['Set a credit limit for each customer', 'Record part-payments in seconds', 'See every bill and payment in one statement', 'Balances update automatically'].map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <BookOpen className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          {assets?.credit && (
            <div className="min-w-0">
              <ScreenshotFrame
                src="/marketing/credit-ledger.webp"
                alt="A customer's credit statement showing bills, payments and the balance"
                width={1440}
                height={900}
              />
            </div>
          )}
        </div>
      </section>

      <section id="hardware" className="scroll-mt-24 border-b border-cs-line bg-cs-sand py-16" aria-labelledby="hardware-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="hardware-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Works with what you already have</h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Barcode, t: 'Barcode scanners', d: 'Any standard USB scanner.' },
              { icon: Printer, t: 'Receipt printers', d: '58mm and 80mm printers.' },
              { icon: Monitor, t: 'Computers and tablets', d: 'Runs in the browser, no install.' },
              { icon: Smartphone, t: 'Your phone', d: 'Check sales and stock from anywhere.' },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-5">
                <Icon className="mb-3 h-6 w-6 text-cs-brick" aria-hidden />
                <h3 className="font-bold">{t}</h3>
                <p className="mt-1 text-cs-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="payments" className="scroll-mt-24 border-b border-cs-line py-16" aria-labelledby="payments-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="payments-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Get paid the way your customers pay</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-6">
              <CreditCard className="mb-3 h-6 w-6 text-cs-brick" aria-hidden />
              <h3 className="text-lg font-bold">Cards and wallets with PayHere</h3>
              <p className="mt-1 text-cs-muted">Visa, Mastercard, FriMi, Genie and more, online and at the counter.</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-6">
              <Store className="mb-3 h-6 w-6 text-cs-brick" aria-hidden />
              <h3 className="text-lg font-bold">Cash on delivery</h3>
              <p className="mt-1 text-cs-muted">Let customers pay when the order arrives, and track what each courier owes you.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-cs-muted">Pay-in-instalment partners are on our roadmap. Ask us about your needs.</p>
        </div>
      </section>

      <Testimonials />

      <section id="pricing" className="scroll-mt-24 border-b border-cs-line bg-cs-sand py-16 sm:py-24" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="pricing-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Pricing on request, based on your shop</h2>
          <p className="mt-4 max-w-2xl text-lg text-cs-muted">
            Every shop is different, so we quote after a short call. No surprise fees.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-6">
              <h3 className="text-lg font-bold">What decides the price</h3>
              <ul className="mt-4 space-y-3">
                {['How many branches and tills you have', 'Which extras you need: online store, customer credit, repairs', 'Setup and moving your existing product list'].map((p) => (
                  <li key={p} className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden /><span>{p}</span></li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-6">
              <h3 className="text-lg font-bold">Always included</h3>
              <ul className="mt-4 space-y-3">
                {['Setup and staff training', 'Your own private database and daily backups', 'Support in Sinhala, Tamil and English', 'Updates and new features'].map((p) => (
                  <li key={p} className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden /><span>{p}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#contact" size="lg" className="w-full sm:w-auto">Get a quote</ButtonLink>
            {waLink && (
              <ButtonLink href={waLink} variant="secondary" size="lg" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                Ask on WhatsApp
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      <Faq />

      <section id="contact" className="scroll-mt-24 border-t border-cs-line bg-cs-sand py-16 sm:py-24" aria-labelledby="contact-heading">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 id="contact-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Book your free demo</h2>
          <p className="mt-3 text-lg text-cs-muted">Tell us about your shop. We will call you to show how it works.</p>

          <div className="mt-8 rounded-2xl border border-cs-line bg-cs-card p-6 sm:p-8">
            {submitted ? (
              <div className="space-y-4 py-8 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-cs-leaf" aria-hidden />
                <h3 className="font-display text-2xl font-bold">Thank you, we got your request</h3>
                <p className="mx-auto max-w-md text-cs-muted">We will contact you on WhatsApp or phone shortly. Meanwhile, try the demo store.</p>
                <ButtonLink href={`${demoUrl}/shop`} icon={<ArrowRight className="h-4 w-4" aria-hidden />}>Open the demo store</ButtonLink>
              </div>
            ) : (
              <form onSubmit={onLeadSubmit} className="space-y-5">
                {leadError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">{leadError}</div>
                )}
                {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                  <label htmlFor="lead-website">Website</label>
                  <input id="lead-website" type="text" tabIndex={-1} autoComplete="off" value={formData.website ?? ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lead-business-name" className={labelCls}>Shop name</label>
                    <input id="lead-business-name" type="text" required autoComplete="organization" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} placeholder="e.g. ABC Fashion" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="lead-owner-name" className={labelCls}>Your name</label>
                    <input id="lead-owner-name" type="text" required autoComplete="name" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} placeholder="e.g. Kasun Fernando" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lead-phone" className={labelCls}>Phone / WhatsApp</label>
                    <input id="lead-phone" type="tel" required autoComplete="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="077 123 4567" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="lead-email" className={labelCls}>Email</label>
                    <input id="lead-email" type="email" required autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@yourshop.lk" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lead-industry" className={labelCls}>What do you sell?</label>
                    <select id="lead-industry" value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })} className={inputCls}>
                      {['Fashion & Apparel', 'Jewelry & Watches', 'Party & Events', 'Electronics & Mobile Repair', 'Grocery & Supermarket', 'Pharmacy & Health', 'Restaurant & Cafe', 'Wholesale & Hardware', 'Other Retail'].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lead-branches" className={labelCls}>Number of shops</label>
                    <select id="lead-branches" value={formData.branchCount} onChange={(e) => setFormData({ ...formData, branchCount: e.target.value })} className={inputCls}>
                      <option value="1">1 shop</option>
                      <option value="2-3">2-3 shops</option>
                      <option value="4-10">4-10 shops</option>
                      <option value="10+">More than 10</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="lead-message" className={labelCls}>Anything we should know? (optional)</label>
                  <textarea id="lead-message" rows={3} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Your current system, scanner or printer, or when you want to start" className={inputCls} />
                </div>
                <Button type="submit" size="lg" disabled={submitting} className="w-full" icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}>
                  {submitting ? 'Sending...' : 'Book my free demo'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
