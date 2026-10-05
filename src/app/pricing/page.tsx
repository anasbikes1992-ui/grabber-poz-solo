import { CheckCircle2 } from 'lucide-react';
import { ButtonLink } from '@/components/company/ui/Button';

export const metadata = {
  title: 'Pricing — Grabber POZ',
  description:
    'POS, stock and online store for Sri Lankan shops. Pricing on request, based on your shop size and the extras you need.',
};

const alwaysIncluded = [
  'Counter POS with barcode scanning and receipt printing',
  'Stock control for one or many branches',
  'Customer credit (Polim Potha) and order history',
  'Your own online store with cash on delivery and card payments',
  'Setup, staff training and support in Sinhala, Tamil and English',
  'Your own private database, daily backups and updates',
];

const extras = [
  'Phone and repair shop tools',
  'Restaurant and cafe orders',
  'Salon and appointment booking',
  'Party and event collections',
];

export default function PricingPage() {
  return (
    <div className="company-site min-h-screen bg-cs-paper px-4 py-16 font-sans text-[17px] leading-relaxed text-cs-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-12">
        <header className="space-y-4">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Pricing on request, based on your shop</h1>
          <p className="text-lg text-cs-muted">
            Every shop is different, so we quote after a short call. The price depends on how many branches and tills you have, and which extras you need.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/#contact" size="lg" className="w-full sm:w-auto">Get a quote</ButtonLink>
            <ButtonLink href="/" variant="secondary" size="lg" className="w-full sm:w-auto">Back to home</ButtonLink>
          </div>
        </header>

        <section aria-labelledby="included-heading" className="rounded-2xl border border-cs-line bg-cs-card p-6">
          <h2 id="included-heading" className="font-display text-2xl font-bold">Always included</h2>
          <ul className="mt-4 space-y-3">
            {alwaysIncluded.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="extras-heading" className="rounded-2xl border border-cs-line bg-cs-card p-6">
          <h2 id="extras-heading" className="font-display text-2xl font-bold">Extras for your type of shop</h2>
          <p className="mt-2 text-cs-muted">We switch on only what you need.</p>
          <ul className="mt-4 space-y-3">
            {extras.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-cs-leaf" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
