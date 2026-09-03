/**
 * GRABBER BUSINESS OS — INSTALLATION IDENTITY & CLIENT CONFIGURATION (M6)
 * Canonical domain types for single-business standalone installations.
 * Principle: ONE DATABASE -> ONE BUSINESS -> ONE INSTALLATION.
 */

export type LicenseEdition = 'COMMUNITY' | 'STANDARD' | 'PRO' | 'ENTERPRISE';

export type LicenseStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';

export type MaintenanceStatus = 'ACTIVE' | 'EXPIRED';

export interface BusinessAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string; // Default: 'Sri Lanka'
}

export interface VisualBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  tagline?: string;
}

export interface TaxIdentity {
  taxRegistrationNumber?: string; // VAT / TIN
  svatNumber?: string;           // Simplified VAT for SL
  taxEnabled: boolean;
  defaultTaxRate: number;        // e.g. 0.18 for 18% VAT
  pricesIncludeTax: boolean;
  taxLabel: string;              // e.g. "VAT"
}

export interface InstallationLicense {
  licenseId: string;
  edition: LicenseEdition;
  status: LicenseStatus;
  maintenanceStatus: MaintenanceStatus;
  issuedTo: string;
  issuedAt: string;
  activatedAt: string;
  expiresAt?: string;
  signature?: string; // HMAC cryptographic signature of (installationId + licenseId + edition + issuedTo)
}

export interface InstallationIdentity {
  installationId: string;        // Immutable UUID generated at bootstrap
  businessId: string;            // Business entity identifier

  // Legal & Display Identity
  businessName: string;          // Full operating name (e.g. "ABC Fashion Pvt Ltd")
  legalName: string;             // Legal entity name for receipts/tax invoices
  displayName: string;           // Short UI brand name (e.g. "ABC Fashion")
  phone: string;                 // Primary contact phone
  email: string;                 // Primary contact email
  website?: string;              // Storefront domain URL
  address: BusinessAddress;

  // Localization & Regional Configuration
  currency: string;              // Default: 'LKR'
  currencySymbol: string;        // Default: 'Rs.'
  timezone: string;              // Default: 'Asia/Colombo'
  locale: string;                // Default: 'en-LK'

  // Operational Defaults
  defaultBranchId?: string;

  // Tax & Legal Configuration
  tax: TaxIdentity;

  // Visual Styling & Assets
  branding: VisualBranding;

  // Commercial Licensing
  license: InstallationLicense;

  // Metadata & Timestamps
  environment: 'development' | 'staging' | 'production';
  bootstrappedAt: string;
  updatedAt: string;
}

/**
 * Public, safe-to-display installation profile for storefronts, login pages, and receipts.
 * Strips all internal secrets, signatures, and diagnostic states.
 */
export interface PublicInstallationIdentity {
  installationId: string;
  businessName: string;
  legalName: string;
  displayName: string;
  phone: string;
  email: string;
  website?: string;
  address: BusinessAddress;
  currency: string;
  currencySymbol: string;
  timezone: string;
  locale: string;
  branding: VisualBranding;
  tax: {
    taxRegistrationNumber?: string;
    taxEnabled: boolean;
    defaultTaxRate: number;
    pricesIncludeTax: boolean;
    taxLabel: string;
  };
  edition: LicenseEdition;
  licenseStatus: LicenseStatus;
}
