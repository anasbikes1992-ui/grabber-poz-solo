export type RepairServiceMode = 'DROP_OFF' | 'HOME_VISIT';

export type RepairPriceType = 'FIXED_START' | 'RANGE' | 'INSPECTION_REQUIRED';

export type RepairJobStatus =
  | 'INTAKE'
  | 'CHECKED_IN'
  | 'DIAGNOSIS'
  | 'ESTIMATE_SENT'
  | 'AWAITING_APPROVAL'
  | 'IN_PROGRESS'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

/** Staff-facing statuses still supported on legacy rows */
export type LegacyRepairStatus = 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

export type RepairServiceDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  durationLabel: string;
  availabilityBadge: 'Available today' | 'Appointment required' | 'Home visit available';
  defaultPriceType: RepairPriceType;
  startingPriceLkr?: number;
  deviceTypes: string[];
};

export type RepairIntakePayload = {
  serviceSlug: string;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  issueDetail?: string;
  mode: RepairServiceMode;
  branchNote?: string;
  preferredSlot?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  contactChannel?: 'PHONE' | 'WHATSAPP' | 'EMAIL';
};

export type RepairChecklistMeta = {
  serviceSlug?: string;
  deviceType?: string;
  brand?: string;
  model?: string;
  mode?: RepairServiceMode;
  preferredSlot?: string;
  contactChannel?: string;
  source?: 'STOREFRONT' | 'STAFF';
};
