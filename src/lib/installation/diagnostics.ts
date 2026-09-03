/**
 * GRABBER BUSINESS OS — INSTALLATION DIAGNOSTICS (M6)
 * Real-time operational and security diagnostics for standalone client installations.
 */

import { db, businessConfig, branches } from '@/db';
import { getInstallationIdentity } from './installation-service';
import { verifyLicenseSignature } from './license-service';

export interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  details?: Record<string, any>;
}

export interface InstallationDiagnosticReport {
  installationId: string;
  businessName: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  checks: DiagnosticCheck[];
  timestamp: string;
}

export async function runInstallationDiagnostics(): Promise<InstallationDiagnosticReport> {
  const checks: DiagnosticCheck[] = [];
  let hasFail = false;
  let hasWarn = false;

  // 1. Database Connection & Config
  let identity;
  try {
    identity = await getInstallationIdentity();
    checks.push({
      id: 'database_config',
      name: 'Database & Business Configuration',
      status: 'PASS',
      message: 'Database operational and business configuration row accessible',
    });
  } catch (err: unknown) {
    hasFail = true;
    checks.push({
      id: 'database_config',
      name: 'Database & Business Configuration',
      status: 'FAIL',
      message: `Database or business configuration inaccessible: ${(err as Error).message}`,
    });
    // If DB fails, return immediately
    return {
      installationId: 'unknown',
      businessName: 'unknown',
      overallStatus: 'UNHEALTHY',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. License Integrity
  if (identity.license) {
    const licenseCheck = verifyLicenseSignature(identity.license, identity.installationId);
    if (licenseCheck.valid) {
      checks.push({
        id: 'license_integrity',
        name: 'License Cryptographic Verification',
        status: 'PASS',
        message: `License verified: ${identity.license.edition} edition (${identity.license.status})`,
      });
    } else {
      hasWarn = true;
      checks.push({
        id: 'license_integrity',
        name: 'License Cryptographic Verification',
        status: 'WARN',
        message: `License verification warning: ${licenseCheck.reason || 'Invalid signature'}`,
      });
    }
  } else {
    hasWarn = true;
    checks.push({
      id: 'license_integrity',
      name: 'License Cryptographic Verification',
      status: 'WARN',
      message: 'No license object found on installation identity',
    });
  }

  // 3. Branches Check
  try {
    const branchRows = await db.select().from(branches).limit(5);
    if (branchRows.length > 0) {
      checks.push({
        id: 'branches',
        name: 'Branch Infrastructure',
        status: 'PASS',
        message: `${branchRows.length} active branch(es) provisioned`,
        details: { count: branchRows.length, default: branchRows[0].name },
      });
    } else {
      hasWarn = true;
      checks.push({
        id: 'branches',
        name: 'Branch Infrastructure',
        status: 'WARN',
        message: 'No branches provisioned yet. Default branch recommended.',
      });
    }
  } catch (err: unknown) {
    hasWarn = true;
    checks.push({
      id: 'branches',
      name: 'Branch Infrastructure',
      status: 'WARN',
      message: `Could not query branches: ${(err as Error).message}`,
    });
  }

  // 4. Tax Identity
  if (identity.tax.taxEnabled) {
    checks.push({
      id: 'tax_configuration',
      name: 'Tax & Invoicing Profile',
      status: 'PASS',
      message: `Tax enabled (${identity.tax.taxLabel} ${(identity.tax.defaultTaxRate * 100).toFixed(0)}%). Reg: ${identity.tax.taxRegistrationNumber || 'Unset'}`,
    });
  } else {
    checks.push({
      id: 'tax_configuration',
      name: 'Tax & Invoicing Profile',
      status: 'PASS',
      message: 'Tax calculation disabled (standard retail mode)',
    });
  }

  // 5. Environment & Security Boundaries
  const isProduction = process.env.NODE_ENV === 'production';
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16);
  const authOptional = process.env.AUTH_OPTIONAL === 'true';

  if (isProduction && authOptional) {
    hasFail = true;
    checks.push({
      id: 'security_boundary',
      name: 'Edge Auth Security Boundary',
      status: 'FAIL',
      message: 'AUTH_OPTIONAL=true is strictly forbidden in production',
    });
  } else if (!hasAuthSecret && isProduction) {
    hasFail = true;
    checks.push({
      id: 'security_boundary',
      name: 'Edge Auth Security Boundary',
      status: 'FAIL',
      message: 'AUTH_SECRET is missing or insufficiently random for production',
    });
  } else {
    checks.push({
      id: 'security_boundary',
      name: 'Edge Auth Security Boundary',
      status: 'PASS',
      message: 'Staff authentication security boundaries enforced',
    });
  }

  const overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = hasFail
    ? 'UNHEALTHY'
    : hasWarn
      ? 'DEGRADED'
      : 'HEALTHY';

  return {
    installationId: identity.installationId,
    businessName: identity.businessName,
    overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };
}
