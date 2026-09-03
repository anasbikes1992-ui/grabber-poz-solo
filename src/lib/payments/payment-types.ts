/**
 * GRABBER BUSINESS OS — PAYMENT GATEWAY ADAPTER FRAMEWORK
 * Payment Types & Canonical Interfaces
 */

export type PaymentGatewayId =
  | 'COD'
  | 'PAYHERE'
  | 'WEBXPAY'
  | 'KOKO'
  | 'MINTPAY'
  | 'PAYZY';

export type CanonicalPaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type PaymentChannel = 'POS' | 'STOREFRONT' | 'WHATSAPP' | 'MANUAL';

export interface PaymentCustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number; // Strictly authoritative amount in base currency units (e.g. LKR)
  currency: string; // e.g. "LKR"
  customer?: PaymentCustomerInfo;
  itemsDescription: string;
  channel: PaymentChannel;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface CreatePaymentResult {
  gatewayId: PaymentGatewayId;
  paymentId?: string;
  providerReference?: string;
  status: CanonicalPaymentStatus;
  redirectUrl?: string;
  fields?: Record<string, string>;
  instructions?: string;
  metadata?: Record<string, unknown>;
}

export interface GetPaymentStatusInput {
  orderId: string;
  orderNumber?: string;
  providerReference?: string;
  paymentId?: string;
}

export interface PaymentStatusResult {
  gatewayId: PaymentGatewayId;
  status: CanonicalPaymentStatus;
  providerReference?: string;
  amount?: number;
  currency?: string;
  rawStatus?: string;
  message?: string;
  timestamp?: Date;
}

export interface VerifyCallbackInput {
  headers: Record<string, string>;
  body: Record<string, unknown> | string;
  query?: Record<string, string>;
}

export interface VerifiedPaymentEvent {
  isValid: boolean;
  gatewayId: PaymentGatewayId;
  orderNumber: string;
  providerReference: string;
  amount: number;
  currency: string;
  status: CanonicalPaymentStatus;
  rawStatus?: string;
  signatureVerified: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface HandleCallbackInput {
  event: VerifiedPaymentEvent;
  expectedAmount: number;
  orderId: string;
  idempotencyKey?: string;
}

export interface PaymentLifecycleResult {
  success: boolean;
  status: CanonicalPaymentStatus;
  orderNumber: string;
  providerReference: string;
  isDuplicate: boolean;
  capturedAmount: number;
  settled: boolean;
  error?: string;
}

export interface RefundPaymentInput {
  orderId: string;
  orderNumber: string;
  paymentId?: string;
  providerReference: string;
  refundAmount: number;
  currency: string;
  reason?: string;
  actorId?: string;
}

export interface RefundResult {
  success: boolean;
  gatewayId: PaymentGatewayId;
  refundReference?: string;
  refundAmount: number;
  status: 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  rawResponse?: unknown;
  error?: string;
}

export interface CancelPaymentInput {
  orderId: string;
  orderNumber: string;
  paymentId?: string;
  providerReference?: string;
  reason?: string;
}

export interface CancelPaymentResult {
  success: boolean;
  gatewayId: PaymentGatewayId;
  status: 'CANCELLED' | 'FAILED';
  error?: string;
}
