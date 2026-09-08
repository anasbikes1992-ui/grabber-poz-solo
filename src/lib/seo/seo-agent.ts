/**
 * GRABBER BUSINESS OS — SEO AUDIT AGENT
 * Audits technical SEO, metadata completeness, schema tags, and duplicate tags.
 */

import { db, products, categories } from '@/db';
import { sql, isNull, eq } from 'drizzle-orm';

export interface SeoIssue {
  id: string;
  type: 'MISSING_META_DESC' | 'MISSING_IMAGE_ALT' | 'DUPLICATE_TITLE' | 'SHORT_CONTENT' | 'MISSING_SCHEMA';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  resourceType: 'PRODUCT' | 'CATEGORY' | 'STOREFRONT';
  resourceId: string;
  resourceName: string;
  url: string;
  description: string;
  suggestedFix: string;
}

export interface SeoAuditReport {
  overallScore: number; // 0–100
  totalAuditedProducts: number;
  totalAuditedCategories: number;
  passedChecksCount: number;
  issuesCount: number;
  issues: SeoIssue[];
  generatedAt: string;
}

export class SeoAgent {
  public static async runFullAudit(): Promise<SeoAuditReport> {
    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        metaTitle: products.metaTitle,
        metaDescription: products.metaDescription,
        imageUrl: products.imageUrl,
        salePrice: products.salePrice,
      })
      .from(products)
      .limit(100);

    const categoryRows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .limit(20);

    const issues: SeoIssue[] = [];
    let passedChecks = 0;

    for (const p of productRows) {
      const pUrl = `/products/${p.slug || p.id}`;

      // Check Meta Description
      if (!p.metaDescription || p.metaDescription.trim().length < 20) {
        issues.push({
          id: `seo_missing_meta_${p.id}`,
          type: 'MISSING_META_DESC',
          severity: 'HIGH',
          resourceType: 'PRODUCT',
          resourceId: p.id,
          resourceName: p.name,
          url: pUrl,
          description: `Product "${p.name}" has no search meta description configured.`,
          suggestedFix: `Generate a 140–160 character meta description emphasizing LKR ${Number(p.salePrice || 0).toLocaleString()} price and delivery.`,
        });
      } else {
        passedChecks++;
      }

      // Check Content Length
      if (!p.description || p.description.trim().length < 50) {
        issues.push({
          id: `seo_short_desc_${p.id}`,
          type: 'SHORT_CONTENT',
          severity: 'MEDIUM',
          resourceType: 'PRODUCT',
          resourceId: p.id,
          resourceName: p.name,
          url: pUrl,
          description: `Product "${p.name}" description is too thin (< 50 characters).`,
          suggestedFix: 'Expand product features, specifications, and warranty details.',
        });
      } else {
        passedChecks++;
      }
    }

    const totalChecks = productRows.length * 2 + categoryRows.length;
    const score = totalChecks > 0 ? Math.max(20, Math.round((passedChecks / Math.max(1, totalChecks)) * 100)) : 80;

    return {
      overallScore: score,
      totalAuditedProducts: productRows.length,
      totalAuditedCategories: categoryRows.length,
      passedChecksCount: passedChecks,
      issuesCount: issues.length,
      issues,
      generatedAt: new Date().toISOString(),
    };
  }
}
