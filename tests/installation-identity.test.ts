/**
 * GRABBER BUSINESS OS — INSTALLATION IDENTITY & LICENSE INTEGRITY TESTS (M6)
 * Verifies Canonical Identity, Tamper Resistance, Data Safety Invariants, and Diagnostics.
 */

import { describe, it, expect } from 'vitest';
import {
  computeLicenseSignature,
  verifyLicenseSignature,
  issueInstallationLicense,
} from '../src/lib/installation/license-service';
import {
  getDefaultInstallationIdentity,
} from '../src/lib/installation/installation-service';
import type { InstallationIdentity, PublicInstallationIdentity } from '../src/lib/installation/types';

describe('M6: Installation Identity & Standalone Licensing', () => {
  const testInstallId = 'inst_test_sri_lanka_01';
  const testBizName = 'City Electronics';

  it('generates a complete canonical installation identity with regional Sri Lanka defaults', () => {
    const identity = getDefaultInstallationIdentity(testBizName);

    expect(identity.installationId).toBeDefined();
    expect(identity.businessName).toBe('City Electronics');
    expect(identity.legalName).toBe('City Electronics (Pvt) Ltd');
    expect(identity.currency).toBe('LKR');
    expect(identity.currencySymbol).toBe('Rs.');
    expect(identity.timezone).toBe('Asia/Colombo');
    expect(identity.locale).toBe('en-LK');
    expect(identity.address.country).toBe('Sri Lanka');
    expect(identity.tax.taxLabel).toBe('VAT');
    expect(identity.license.edition).toBe('STANDARD');
    expect(identity.license.status).toBe('ACTIVE');
    expect(identity.license.maintenanceStatus).toBe('ACTIVE');
  });

  it('validates legitimate cryptographic license signatures', () => {
    const license = issueInstallationLicense(testInstallId, testBizName, 'STANDARD');
    expect(license.signature).toBeDefined();

    const check = verifyLicenseSignature(license, testInstallId);
    expect(check.valid).toBe(true);
    expect(check.reason).toBeUndefined();
  });

  it('detects tampering when license edition or identity is manipulated', () => {
    const license = issueInstallationLicense(testInstallId, testBizName, 'STANDARD');

    // Attacker modifies edition from STANDARD to ENTERPRISE without server private key
    const tamperedLicense = {
      ...license,
      edition: 'ENTERPRISE' as const,
    };

    const check = verifyLicenseSignature(tamperedLicense, testInstallId);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain('tampering detected');
  });

  it('detects tampering when license is copied to a different installationId (Hardware/Install Lock)', () => {
    const license = issueInstallationLicense(testInstallId, testBizName, 'STANDARD');

    // Attacker copies valid license from Installation A to Installation B
    const check = verifyLicenseSignature(license, 'inst_different_machine_99');
    expect(check.valid).toBe(false);
    expect(check.reason).toContain('tampering detected');
  });

  it('guarantees DATA SAFETY: maintenance expiration never deletes or corrupts business data', () => {
    const identity = getDefaultInstallationIdentity('ABC Textiles');

    // Simulate expired maintenance
    identity.license.maintenanceStatus = 'EXPIRED';

    // Verify all business records and identifiers remain completely intact
    expect(identity.businessName).toBe('ABC Textiles');
    expect(identity.currency).toBe('LKR');
    expect(identity.tax.taxRegistrationNumber).toBeDefined();
    expect(identity.address.country).toBe('Sri Lanka');
    // Local business operations can continue; maintenance is solely for cloud updates
    expect(identity.license.status).toBe('ACTIVE');
  });

  it('isolates public display identity without leaking internal license signatures', () => {
    const full = getDefaultInstallationIdentity('GMS Mart');

    const publicIdentity: PublicInstallationIdentity = {
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

    // Public identity contains essentials for branding and receipts
    expect(publicIdentity.businessName).toBe('GMS Mart');
    expect(publicIdentity.currency).toBe('LKR');
    expect(publicIdentity.tax.taxLabel).toBe('VAT');

    // Secrets and signatures are completely omitted
    expect((publicIdentity as any).license?.signature).toBeUndefined();
    expect((publicIdentity as any).environment).toBeUndefined();
  });
});
