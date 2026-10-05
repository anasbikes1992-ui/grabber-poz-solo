/**
 * Real client proof for the company site. Add an entry ONLY with the client's permission.
 * Nothing renders until at least one entry has `approved: true`.
 */
export type Testimonial = {
  approved: boolean;
  quote: string;
  name: string;
  role?: string;
  shop: string;
  town: string;
  photoUrl?: string;
};

export type ClientLogo = {
  approved: boolean;
  name: string;
  logoUrl: string;
};

export const testimonials: Testimonial[] = [];
export const clientLogos: ClientLogo[] = [];

export function approvedTestimonials(items: Testimonial[] = testimonials) {
  return items.filter((t) => t.approved && t.quote.trim() && t.name.trim() && t.shop.trim());
}

export function approvedLogos(items: ClientLogo[] = clientLogos) {
  return items.filter((l) => l.approved && l.logoUrl.trim() && l.name.trim());
}
