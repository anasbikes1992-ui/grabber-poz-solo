export const PRESCRIPTION_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'DISPENSED',
  'CANCELLED',
] as const;

export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<PrescriptionStatus, readonly PrescriptionStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['DISPENSED', 'CANCELLED'],
  DISPENSED: [],
  CANCELLED: [],
};

export function isPrescriptionStatus(value: string): value is PrescriptionStatus {
  return (PRESCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function canTransitionRx(from: string, to: string): boolean {
  if (!isPrescriptionStatus(from) || !isPrescriptionStatus(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertCanDispense(status: string): void {
  if (status !== 'APPROVED') {
    throw new Error(`Cannot dispense prescription in status ${status}; must be APPROVED`);
  }
}
