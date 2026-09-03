/**
 * GRABBER BUSINESS OS — INSTALLATION IDENTITY SERVICE (M6)
 * Authoritative single-business configuration service.
 */

import { eq } from 'drizzle-orm';
import { db, businessConfig, auditLogs } from '@/db';
import type { InstallationIdentity, PublicInstallationIdentity } from './types';
import { issueInstallationLicense, verifyLicenseSignature } from './license-service';

export const DEFAULT_INSTALLATION_ID = 'inst_solo_colombo_01';

export function getDefaultInstallationIdentity(businessName = 'Grabber Business'): InstallationIdentity {
  const installationId = DEFAULT_INSTALLATION_ID;
  const now = new Date().toISOString();
  const license = issueInstallationLicense(installationId, businessName, 'STANDARD');

  return {
    installationId,
    businessId: 'biz_solo_01',
    businessName,
    legalName: `${businessName} (Pvt) Ltd`,
    displayName: businessName,
    phone: '0112345678',
    email: 'contact@grabber.lk',
    website: 'https://grabber.lk',
    address: {
      line1: 'No 45 Galle Road',
      city: 'Colombo 03',
      postalCode: '00300',
      country: 'Sri Lanka',
    },
    currency: 'LKR',
    currencySymbol: 'Rs.',
    timezone: 'Asia/Colombo',
    locale: 'en-LK',
    tax: {
      taxRegistrationNumber: 'VAT-123456789',
      svatNumber: 'SVAT-98765',
      taxEnabled: true,
      defaultTaxRate: 0.18,
      pricesIncludeTax: false,
      taxLabel: 'VAT',
    },
    branding: {
      primaryColor: '#0f172a',
      accentColor: '#d97706',
      tagline: 'Precision Retail & Commerce OS',
    },
    license,
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    bootstrappedAt: now,
    updatedAt: now,
  };
}

/**
 * Fetches the authoritative installation identity.
 * Self-heals if not yet initialized.
 */
export async function getInstallationIdentity(): Promise<InstallationIdentity> {
  const [row] = await db.select().from(businessConfig).limit(1);
  const cfg = (row?.configJson || {}) as Record<string, any>;
  let identity = cfg.installation as InstallationIdentity | undefined;

  if (!identity) {
    const rawName = (cfg.businessName || cfg.business_profile?.name || 'Grabber Business') as string;
    identity = getDefaultInstallationIdentity(rawName);
    if (row) {
      await db
        .update(businessConfig)
        .set({
          configJson: { ...cfg, installation: identity },
          updatedAt: new Date(),
        })
        .where(eq(businessConfig.id, row.id));
    }
  }

  // Verify license integrity
  if (identity.license) {
    const check = verifyLicenseSignature(identity.license, identity.installationId);
    if (!check.valid && identity.license.status === 'ACTIVE') {
      // Degrade license state gracefully without altering business data
      identity = {
        ...identity,
        license: {
          ...identity.license,
          status: 'SUSPENDED',
        },
      };
    }
  }

  return identity;
}

/**
 * Publicly viewable identity for storefront, customer tracking, and receipt generation.
 * Strips all internal secrets and HMAC signatures.
 */
export async function getPublicInstallationIdentity(): Promise<PublicInstallationIdentity> {
  const full = await getInstallationIdentity();

  return {
    installationId: full.installationId,
    businessName: full.businessName,
    legalName: full.legalName,
    displayName: full.displayName,
    phone: full.phone,
    email: full.email,
    website: full.website,
    address: full.address,
    currency: full.currency,
    currencySymbol: full.currencySymbol,
    timezone: full.timezone,
    locale: full.locale,
    branding: full.branding,
    tax: {
      taxRegistrationNumber: full.tax.taxRegistrationNumber,
      taxEnabled: full.tax.taxEnabled,
      defaultTaxRate: full.tax.defaultTaxRate,
      pricesIncludeTax: full.tax.pricesIncludeTax,
      taxLabel: full.tax.taxLabel,
    },
    edition: full.license.edition,
    licenseStatus: full.license.status,
  };
}

/**
 * Updates installation identity with strict audit logging.
 */
export async function updateInstallationIdentity(
  updates: Partial<InstallationIdentity>,
  staffUser: { id: string; email?: string },
): Promise<InstallationIdentity> {
  const [row] = await db.select().from(businessConfig).limit(1);
  if (!row) {
    throw new Error('Business configuration record not found');
  }

  const current = await getInstallationIdentity();
  const now = new Date().toISOString();

  // Prevent client from forging installationId or tampering with license signature
  const merged: InstallationIdentity = {
    ...current,
    ...updates,
    installationId: current.installationId, // Immutable
    businessId: current.businessId,         // Immutable
    license: current.license,               // Managed via license service only
    updatedAt: now,
  };

  const cfg = (row.configJson || {}) as Record<string, any>;

  await db
    .update(businessConfig)
    .set({
      configJson: {
        ...cfg,
        businessName: merged.businessName,
        installation: merged,
      },
      updatedAt: new Date(),
    })
    .where(eq(businessConfig.id, row.id));

  // Log audit event
  try {
    await db.insert(auditLogs).values({
      action: 'INSTALLATION_IDENTITY_UPDATED',
      entity: 'installation',
      entityId: merged.installationId,
      actorId: staffUser.id || undefined,
      afterState: {
        businessName: merged.businessName,
        legalName: merged.legalName,
        phone: merged.phone,
        email: merged.email,
      },
    });
  } catch {
    /* ignore audit write failure */
  }

  return merged;
}
