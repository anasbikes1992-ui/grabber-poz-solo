import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ButtonLink } from '@/components/company/ui/Button';
import type { LegalPageDefinition } from '@/lib/public/legal-pages';
import { publicWhatsAppHref } from '@/lib/public/contact-links';

const policyLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/delivery-policy', label: 'Delivery Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

export function PublicInfoPage({
  page,
  salesWhatsapp,
}: {
  page: LegalPageDefinition;
  salesWhatsapp?: string;
}) {
  const whatsappHref = publicWhatsAppHref(salesWhatsapp, "Hi Grabber POZ, I'd like to ask about your system for my shop.");

  return (
    <main className="company-site min-h-screen bg-cs-paper font-sans text-[17px] leading-relaxed text-cs-ink">
      <header className="border-b border-cs-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center" aria-label="Grabber POZ home">
            <BrandLogo size="sm" showTagline={false} showSoloBadge={false} variant="ink" />
          </Link>
          <ButtonLink href="/#contact" size="md">Get a free demo</ButtonLink>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cs-muted transition-colors hover:text-cs-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Grabber POZ
        </Link>

        <div className="rounded-2xl border border-cs-line bg-cs-card p-6 sm:p-10">
          <p className="text-sm font-bold text-cs-brick">{page.eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-cs-muted">{page.description}</p>
          <p className="mt-4 text-sm text-cs-muted">Last updated: {page.updated}</p>

          <div className="mt-10 space-y-8">
            {page.sections.map((section) => {
              const id = `${page.slug}-${section.heading.replace(/\W+/g, '-').toLowerCase()}`;
              return (
                <section key={section.heading} aria-labelledby={id}>
                  <h2 id={id} className="font-display text-2xl font-bold">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-cs-muted">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-cs-line pt-8">
            {policyLinks.map((l) => (
              <ButtonLink key={l.href} href={l.href} variant="secondary">
                {l.label}
              </ButtonLink>
            ))}
            {whatsappHref && (
              <ButtonLink
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                icon={<MessageCircle className="h-4 w-4" aria-hidden />}
              >
                WhatsApp Grabber POZ
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
