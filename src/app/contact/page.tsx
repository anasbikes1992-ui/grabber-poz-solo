import { MessageCircle } from 'lucide-react';
import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { ButtonLink } from '@/components/company/ui/Button';
import { companyWhatsappNumber, publicWhatsAppHref } from '@/lib/public/contact-links';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';
import { safeJsonLd } from '@/lib/security/escape';

const page = getLegalPage('contact');

export const metadata = buildLegalMetadata(page);

export default function ContactPage() {
  const salesWhatsapp = companyWhatsappNumber();
  const whatsappHref = publicWhatsAppHref(salesWhatsapp, "Hi Grabber POZ, I'd like a demo for my shop.");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={salesWhatsapp} />
      <section className="company-site bg-cs-paper px-4 pb-16 font-sans text-cs-ink sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 rounded-2xl border border-cs-line bg-cs-sand p-6 sm:grid-cols-2 sm:p-8">
          <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-5">
            <h2 className="font-display text-xl font-bold">Book a free demo</h2>
            <p className="mt-2 text-cs-muted">Tell us about your shop and we will call you to show how it works.</p>
            <ButtonLink href="/#contact" className="mt-4">Book a demo</ButtonLink>
          </div>
          {whatsappHref && (
            <div className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-5">
              <h2 className="font-display text-xl font-bold">Chat on WhatsApp</h2>
              <p className="mt-2 text-cs-muted">Ask a question or arrange a demo. We reply in Sinhala, Tamil or English.</p>
              <ButtonLink
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                icon={<MessageCircle className="h-4 w-4" aria-hidden />}
                className="mt-4"
              >
                Open WhatsApp
              </ButtonLink>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
