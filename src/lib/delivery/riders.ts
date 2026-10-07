import type { WhatsAppSendResult } from '@/lib/integrations/whatsapp';

export type RiderAssignmentMode = 'MANUAL' | 'AUTO';
export type RiderNotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'STUB';

export type DeliveryRiderCandidate = {
  id: string;
  name: string;
  whatsappPhone: string;
  active: boolean;
  homeBranchId?: string | null;
  activeDeliveryCount?: number;
  lastAssignedAt?: Date | string | null;
};

export function normalizeRiderPhone(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function assertValidRiderPhone(raw: string): string {
  const normalized = normalizeRiderPhone(raw);
  if (normalized.length < 9 || normalized.length > 15) {
    throw Object.assign(new Error('Valid WhatsApp number required'), { status: 400 });
  }
  return normalized;
}

function assignmentTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function selectAutoRider(
  riders: DeliveryRiderCandidate[],
  branchId?: string | null,
): DeliveryRiderCandidate | null {
  const active = riders.filter((r) => r.active && normalizeRiderPhone(r.whatsappPhone).length >= 9);
  if (!active.length) return null;

  const branchCompatible = branchId
    ? active.filter((r) => !r.homeBranchId || r.homeBranchId === branchId)
    : active;
  const pool = branchCompatible.length ? branchCompatible : active;

  return [...pool].sort((a, b) => {
    const byLoad = (a.activeDeliveryCount || 0) - (b.activeDeliveryCount || 0);
    if (byLoad !== 0) return byLoad;
    return assignmentTime(a.lastAssignedAt) - assignmentTime(b.lastAssignedAt);
  })[0] || null;
}

export type RiderDeliveryMessageInput = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  codAmount?: number | null;
  paymentStatus: string;
  trackingNumber?: string | null;
  deliveryNoteUrl?: string | null;
};

export function buildRiderDeliveryMessage(input: RiderDeliveryMessageInput): string {
  const cod = Number(input.codAmount || 0);
  const lines = [
    `New delivery assigned: ${input.orderNumber}`,
    `Customer: ${input.customerName || 'Customer'}`,
    `Phone: ${input.customerPhone || 'Not provided'}`,
    `Address: ${input.address || 'Not provided'}`,
    `Payment: ${String(input.paymentStatus || 'PENDING').toUpperCase()}${cod > 0 ? ` | COD LKR ${cod.toFixed(2)}` : ''}`,
  ];
  if (input.trackingNumber) lines.push(`Tracking: ${input.trackingNumber}`);
  if (input.deliveryNoteUrl) lines.push(`Delivery note: ${input.deliveryNoteUrl}`);
  return lines.join('\n');
}

export function notificationStatusFromWhatsApp(result: WhatsAppSendResult): RiderNotificationStatus {
  if (!result.success) return 'FAILED';
  return result.stub ? 'STUB' : 'SENT';
}
