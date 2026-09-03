/**
 * GRABBER BUSINESS OS — CASH ON DELIVERY (COD) ADAPTER
 * Native payment implementation for cash/cash-on-delivery transactions
 */

import type { PaymentGateway } from '../payment-gateway';
import type { PaymentGatewayCapabilities } from '../payment-capabilities';
import { CAPABILITIES_COD } from '../payment-capabilities';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  PaymentStatusResult,
  VerifyCallbackInput,
  VerifiedPaymentEvent,
  HandleCallbackInput,
  PaymentLifecycleResult,
  CancelPaymentInput,
  CancelPaymentResult,
} from '../payment-types';
import { PaymentUnsupportedOperationError } from '../payment-errors';

export class CodGateway implements PaymentGateway {
  readonly id = 'COD' as const;

  capabilities(): PaymentGatewayCapabilities {
    return CAPABILITIES_COD;
  }

  isConfigured(): boolean {
    return true; // Native COD is always available
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // POS cash is immediately CAPTURED if paid at counter, whereas storefront COD is PENDING until delivery
    const status = input.channel === 'POS' ? 'CAPTURED' : 'PENDING';

    return {
      gatewayId: this.id,
      status,
      providerReference: `cod_${input.orderNumber}`,
      instructions:
        input.channel === 'POS'
          ? 'Cash received at POS terminal counter'
          : 'Cash to be collected upon package delivery by courier/driver',
      metadata: {
        orderNumber: input.orderNumber,
        amount: input.amount,
        currency: input.currency,
        channel: input.channel,
      },
    };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult> {
    return {
      gatewayId: this.id,
      status: 'PENDING',
      providerReference: input.providerReference || `cod_${input.orderNumber || input.orderId}`,
    };
  }

  async verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPaymentEvent> {
    // Native delivery agent callback or driver app confirmation
    const raw = typeof input.body === 'object' && input.body !== null ? (input.body as Record<string, any>) : {};
    const orderNumber = String(raw.orderNumber || raw.order_id || '');
    const amount = Number(raw.amount || 0);
    const delivered = Boolean(raw.delivered ?? true);

    return {
      isValid: Boolean(orderNumber),
      gatewayId: this.id,
      orderNumber,
      providerReference: `cod_delivery_${orderNumber}`,
      amount,
      currency: 'LKR',
      status: delivered ? 'CAPTURED' : 'FAILED',
      signatureVerified: true,
    };
  }

  async handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult> {
    const { event, expectedAmount } = input;
    const isCaptured = event.status === 'CAPTURED';

    return {
      success: isCaptured,
      status: event.status,
      orderNumber: event.orderNumber,
      providerReference: event.providerReference,
      isDuplicate: false,
      capturedAmount: isCaptured ? expectedAmount : 0,
      settled: isCaptured,
    };
  }

  async cancel(input: CancelPaymentInput): Promise<CancelPaymentResult> {
    return {
      success: true,
      gatewayId: this.id,
      status: 'CANCELLED',
    };
  }
}
