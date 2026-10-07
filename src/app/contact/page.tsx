import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { PublicInfoPage } from '@/components/company/PublicInfoPage';
import { publicWhatsAppHref } from '@/lib/public/contact-links';
import { buildLegalMetadata, getLegalPage, legalPageJsonLd } from '@/lib/public/legal-pages';

const page = getLegalPage('contact');

export const metadata = buildLegalMetadata(page);

export default function ContactPage() {
  const salesWhatsapp = process.env.COMPANY_SALES_WHATSAPP || process.env.OWNER_WHATSAPP || '';
  const whatsappHref = publicWhatsAppHref(
    salesWhatsapp,
    'Hi Grabber POZ, I want a Grabber Business OS Pro demo.',
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(legalPageJsonLd(page)) }} />
      <PublicInfoPage page={page} salesWhatsapp={salesWhatsapp} />
      <section className="bg-slate-950 px-4 pb-16 text-slate-100 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:grid-cols-2 sm:p-8">
          <Link
            href="/#contact"
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 transition-colors hover:bg-amber-500/20"
          >
            <h2 className="text-lg font-black text-white">Book a Pro demo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Submit the company inquiry form with your business type, branch count, and migration needs.
            </p>
          </Link>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 transition-colors hover:bg-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-300" aria-hidden />
                <h2 className="text-lg font-black text-white">WhatsApp sales</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use the configured company WhatsApp number for inquiries, demo scheduling, and client management follow-up.
              </p>
            </a>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
              <h2 className="text-lg font-black text-white">WhatsApp sales</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Configure COMPANY_SALES_WHATSAPP or the Company Settings WhatsApp automation number to enable this direct link.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
