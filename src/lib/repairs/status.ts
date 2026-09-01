import type { RepairJobStatus } from './types';

export const REPAIR_STATUS_FLOW: RepairJobStatus[] = [
  'INTAKE',
  'CHECKED_IN',
  'DIAGNOSIS',
  'ESTIMATE_SENT',
  'AWAITING_APPROVAL',
  'IN_PROGRESS',
  'QUALITY_CHECK',
  'READY',
  'DELIVERED',
];

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  INTAKE: 'Request received',
  CHECKED_IN: 'Device checked in',
  DIAGNOSIS: 'Diagnosis in progress',
  ESTIMATE_SENT: 'Estimate sent',
  AWAITING_APPROVAL: 'Awaiting approval',
  IN_PROGRESS: 'Repair in progress',
  QUALITY_CHECK: 'Quality check',
  READY: 'Ready for collection',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function repairStatusTone(status: string): 'green' | 'amber' | 'blue' | 'red' | 'neutral' {
  if (status === 'AWAITING_APPROVAL' || status === 'ESTIMATE_SENT') return 'amber';
  if (status === 'DIAGNOSIS' || status === 'IN_PROGRESS' || status === 'QUALITY_CHECK') return 'blue';
  if (status === 'CANCELLED') return 'red';
  if (status === 'READY' || status === 'DELIVERED') return 'green';
  return 'neutral';
}

export function normalizeRepairStatus(status: string): RepairJobStatus | string {
  if (status in REPAIR_STATUS_LABELS) return status as RepairJobStatus;
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (status === 'READY') return 'READY';
  if (status === 'DELIVERED') return 'DELIVERED';
  return status;
}
