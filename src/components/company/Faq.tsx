export const faqItems = [
  {
    q: 'How long does setup take?',
    a: 'Most shops are ready to sell in a few days. We set up your products, prices and receipt printer, and train your staff.',
  },
  {
    q: 'Will it work with my barcode scanner and receipt printer?',
    a: 'Yes. It works with standard USB barcode scanners, receipt printers (58mm and 80mm) and cash drawers. Tell us what you have and we will check.',
  },
  {
    q: 'Who owns my data?',
    a: 'You do. Your shop has its own separate database and you can export your products, customers and sales whenever you like.',
  },
  {
    q: 'What if the internet goes down?',
    a: 'Tell us your connection setup during the demo call and we will explain how the counter keeps working and syncs back.',
  },
  {
    q: 'Do you support Sinhala and Tamil?',
    a: 'Our team supports you in Sinhala, Tamil and English.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-cs-line py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 id="faq-heading" className="font-display text-3xl font-bold tracking-tight text-cs-ink sm:text-4xl">
          Questions shop owners ask
        </h2>
        <div className="mt-8 divide-y divide-cs-line rounded-2xl border border-cs-line bg-cs-card">
          {faqItems.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-bold text-cs-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cs-brick">
                <span>{item.q}</span>
                <span aria-hidden className="text-xl text-cs-brick transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 pr-8 text-base leading-relaxed text-cs-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
