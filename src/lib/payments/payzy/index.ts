/**
 * GRABBER BUSINESS OS — PAYZY GATEWAY ADAPTER
 * Implements PaymentGateway for Payzy (Sri Lanka)
 */

import type { PaymentGateway } from '../payment-gateway';
import type { PaymentGatewayCapabilities } from '../payment-capabilities';
import { CAPABILITIES_PAYZY } from '../payment-capabilities';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  PaymentStatusResult,
  VerifyCallbackInput,
  VerifiedPaymentEvent,
  HandleCallbackInput,
  PaymentLifecycleResult,
  RefundPaymentInput,
  RefundResult,
} from '../payment-types';
import {
  PaymentConfigurationError,
  PaymentVerificationError,
  PaymentAmountMismatchError,
} from '../payment-errors';
import { getPayzyConfig, isPayzyConfigured } from './client';
import { mapPayzyStatus } from './mapper';
import { verifyPayzyWebhookSignature } from './webhook';

export class PayzyGateway implements PaymentGateway {
  readonly id = 'PAYZY' as const;

  capabilities(): PaymentGatewayCapabilities {
    return CAPABILITIES_PAYZY;
  }

  isConfigured(): boolean {
    return isPayzyConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) {
      throw new PaymentConfigurationError('Payzy is not configured. Set PAYZY_MERCHANT_ID and PAYZY_APP_ID.');
    }

    const cfg = getPayzyConfig();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const baseUrl =
      cfg.env === 'live' ? 'https://checkout.payzy.lk' : 'https://sandbox-checkout.payzy.lk';

    const redirectUrl = `${baseUrl}/pay?merchant=${cfg.merchantId}&app=${cfg.appId}&order=${input.orderNumber}&amount=${input.amount.toFixed(2)}`;

    return {
      gatewayId: this.id,
      status: 'INITIATED',
      redirectUrl,
      providerReference: `payzy_${input.orderNumber}`,
      metadata: {
        orderNumber: input.orderNumber,
        amount: input.amount,
        channel: input.channel,
      },
    };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult> {
    return {
      gatewayId: this.id,
      status: 'PENDING',
      providerReference: input.providerReference,
    };
  }

  async verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPaymentEvent> {
    const raw = typeof input.body === 'object' && input.body !== null ? (input.body as Record<string, any>) : {};
    const cfg = getPayzyConfig();
    const signature = input.headers['x-payzy-signature'] || input.headers['signature'] || '';

    const isSigValid = cfg.appSecret
      ? verifyPayzyWebhookSignature(input.body, signature, cfg.appSecret)
      : true;

    const rawStatus = String(raw.status || raw.payment_status || 'PENDING');
    const status = mapPayzyStatus(rawStatus);
    const amount = Number(raw.amount || 0);
    const orderNumber = String(raw.order_id || raw.orderNumber || '');
    const providerReference = String(raw.transaction_id || raw.payzy_reference || '');

    if (!isSigValid && cfg.appSecret) {
      return {
        isValid: false,
        gatewayId: this.id,
        orderNumber,
        providerReference,
        amount,
        currency: 'LKR',
        status: 'FAILED',
        rawStatus,
        signatureVerified: false,
        error: 'Payzy signature verification failed',
      };
    }

    return {
      isValid: true,
      gatewayId: this.id,
      orderNumber,
      providerReference,
      amount,
      currency: 'LKR',
      status,
      rawStatus,
      signatureVerified: true,
      metadata: {
        rawStatus,
      },
    };
  }

  async handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult> {
    const { event, expectedAmount } = input;

    if (!event.isValid) {
      throw new PaymentVerificationError(event.error || 'Invalid Payzy callback event');
    }

    if (Math.abs(event.amount - expectedAmount) > 0.01) {
      throw new PaymentAmountMismatchError(expectedAmount, event.amount);
    }

    const isCaptured = event.status === 'CAPTURED';

    return {
      success: isCaptured,
      status: event.status,
      orderNumber: event.orderNumber,
      providerReference: event.providerReference,
      isDuplicate: false,
      capturedAmount: isCaptured ? event.amount : 0,
      settled: isCaptured,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundResult> {
    return {
      success: false,
      gatewayId: this.id,
      refundAmount: input.refundAmount,
      status: 'FAILED',
      error: 'Payzy automated refund requires merchant API credentials with refund authority',
    };
  }
}
