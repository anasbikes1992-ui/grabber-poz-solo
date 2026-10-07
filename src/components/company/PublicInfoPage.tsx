import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { LegalPageDefinition } from '@/lib/public/legal-pages';
import { publicWhatsAppHref } from '@/lib/public/contact-links';

export function PublicInfoPage({
  page,
  salesWhatsapp,
}: {
  page: LegalPageDefinition;
  salesWhatsapp?: string;
}) {
  const whatsappHref = publicWhatsAppHref(
    salesWhatsapp,
    'Hi Grabber POZ, I want to ask about Grabber Business OS Pro.',
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={true} />
          </Link>
          <Link
            href="/#contact"
            className="inline-flex min-h-10 items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            Contact Sales
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors hover:text-amber-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Grabber POZ
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{page.description}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Last updated: {page.updated}
          </p>

          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.heading} aria-labelledby={`${page.slug}-${section.heading.replace(/\W+/g, '-').toLowerCase()}`}>
                <h2
                  id={`${page.slug}-${section.heading.replace(/\W+/g, '-').toLowerCase()}`}
                  className="text-xl font-black text-white"
                >
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-800 pt-8">
            <Link
              href="/privacy"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Terms
            </Link>
            <Link
              href="/delivery-policy"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Delivery Policy
            </Link>
            <Link
              href="/refund-policy"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Refund Policy
            </Link>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 transition-colors hover:bg-emerald-400"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp Grabber POZ
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
