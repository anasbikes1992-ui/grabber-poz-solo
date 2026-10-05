import { approvedLogos, approvedTestimonials, type ClientLogo, type Testimonial } from '@/lib/company/social-proof';

/** Renders nothing until real, approved client proof exists. */
export function Testimonials({
  items,
  logos,
}: {
  items?: Testimonial[];
  logos?: ClientLogo[];
}) {
  const quotes = approvedTestimonials(items);
  const marks = approvedLogos(logos);
  if (quotes.length === 0 && marks.length === 0) return null;

  return (
    <section className="border-t border-cs-line bg-cs-sand py-20" aria-labelledby="proof-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="proof-heading" className="font-display text-3xl font-bold tracking-tight text-cs-ink sm:text-4xl">
          Shops that run on Grabber POZ
        </h2>
        {quotes.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quotes.map((t) => (
              <figure key={`${t.shop}-${t.name}`} className="min-w-0 rounded-2xl border border-cs-line bg-cs-card p-6">
                <blockquote className="break-words text-base leading-relaxed text-cs-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {t.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  )}
                  <div className="min-w-0 text-sm">
                    <div className="font-bold text-cs-ink">{t.name}{t.role ? `, ${t.role}` : ''}</div>
                    <div className="text-cs-muted">{t.shop} · {t.town}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {marks.length > 0 && (
          <ul className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-6" aria-label="Our clients">
            {marks.map((l) => (
              <li key={l.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.logoUrl} alt={l.name} height={36} className="h-9 w-auto opacity-80" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
