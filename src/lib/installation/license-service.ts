/**
 * GRABBER BUSINESS OS — LICENSE INTEGRITY SERVICE (M6)
 * Cryptographic verification & tamper resistance for single-client installations.
 * Principle: Never corrupt or destroy client data on license expiration.
 */

import { createHmac } from 'crypto';
import type { InstallationLicense, LicenseEdition, LicenseStatus } from './types';

function getLicenseSigningKey(): string {
  return process.env.LICENSE_SIGNING_KEY || process.env.AUTH_SECRET || 'grabber-installation-integrity-key-default';
}

/**
 * Computes deterministic HMAC signature for license binding.
 */
export function computeLicenseSignature(
  installationId: string,
  licenseId: string,
  edition: LicenseEdition,
  issuedTo: string,
): string {
  const payload = `${installationId}:${licenseId}:${edition}:${issuedTo.trim().toLowerCase()}`;
  return createHmac('sha256', getLicenseSigningKey()).update(payload).digest('hex');
}

/**
 * Validates cryptographic license signature.
 */
export function verifyLicenseSignature(
  license: InstallationLicense,
  installationId: string,
): { valid: boolean; reason?: string } {
  if (!license.signature) {
    return { valid: false, reason: 'License signature missing' };
  }

  const expected = computeLicenseSignature(
    installationId,
    license.licenseId,
    license.edition,
    license.issuedTo,
  );

  if (license.signature !== expected) {
    return { valid: false, reason: 'License signature mismatch (tampering detected)' };
  }

  // Check expiration if specified
  if (license.expiresAt) {
    const expiresTimestamp = new Date(license.expiresAt).getTime();
    if (Date.now() > expiresTimestamp) {
      return { valid: false, reason: 'License duration expired' };
    }
  }

  return { valid: true };
}

/**
 * Generates an authorized standalone perpetual license for a newly provisioned installation.
 */
export function issueInstallationLicense(
  installationId: string,
  businessName: string,
  edition: LicenseEdition = 'STANDARD',
): InstallationLicense {
  const licenseId = `LIC-POZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const signature = computeLicenseSignature(installationId, licenseId, edition, businessName);

  return {
    licenseId,
    edition,
    status: 'ACTIVE',
    maintenanceStatus: 'ACTIVE',
    issuedTo: businessName,
    issuedAt: now,
    activatedAt: now,
    signature,
  };
}
