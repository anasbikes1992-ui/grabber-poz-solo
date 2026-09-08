/**
 * GRABBER BUSINESS OS — LOCAL SEO ENGINE
 * Generates local landing page metadata and multi-branch Google Business Profile schemas.
 */

import { SeoContentFactory } from './content-factory';

export interface LocalBranchPageMetadata {
  branchId: string;
  branchName: string;
  city: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  addressText: string;
  phone: string;
  schema: Record<string, unknown>;
}

export class LocalSeoEngine {
  public static buildBranchLandingPage(branch: {
    id: string;
    name: string;
    city: string;
    address: string;
    phone: string;
    storeName?: string;
  }): LocalBranchPageMetadata {
    const brand = branch.storeName || 'Grabber';
    const slug = `/locations/${branch.city.toLowerCase().replace(/\s+/g, '-')}-${branch.name.toLowerCase().replace(/\s+/g, '-')}`;

    const metaTitle = `${brand} ${branch.city} Branch — Address, Hours & Contact`;
    const metaDescription = `Visit ${brand} in ${branch.city}, Sri Lanka. Located at ${branch.address}. Phone: ${branch.phone}. In-store shopping, pickup, and instant support.`;

    const schema = SeoContentFactory.generateLocalBusinessSchema({
      name: `${brand} - ${branch.name}`,
      address: branch.address,
      city: branch.city,
      phone: branch.phone,
    });

    return {
      branchId: branch.id,
      branchName: branch.name,
      city: branch.city,
      slug,
      metaTitle,
      metaDescription,
      h1: `${brand} ${branch.city} (${branch.name})`,
      addressText: branch.address,
      phone: branch.phone,
      schema,
    };
  }
}
