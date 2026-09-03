/**
 * GRABBER BUSINESS OS — KOKO BNPL GATEWAY ADAPTER
 * Implements PaymentGateway for Koko Buy Now Pay Later (Sri Lanka)
 */

import type { PaymentGateway } from '../payment-gateway';
import type { PaymentGatewayCapabilities } from '../payment-capabilities';
import { CAPABILITIES_KOKO } from '../payment-capabilities';
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
import { getKokoConfig, isKokoConfigured } from './client';
import { mapKokoStatus } from './mapper';
import { verifyKokoWebhookSignature } from './webhook';

export class KokoGateway implements PaymentGateway {
  readonly id = 'KOKO' as const;

  capabilities(): PaymentGatewayCapabilities {
    return CAPABILITIES_KOKO;
  }

  isConfigured(): boolean {
    return isKokoConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) {
      throw new PaymentConfigurationError('Koko is not configured. Set KOKO_MERCHANT_ID and KOKO_API_KEY.');
    }

    const cfg = getKokoConfig();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const baseUrl =
      cfg.env === 'live' ? 'https://checkout.kokopay.com' : 'https://staging-checkout.kokopay.com';

    // Form fields / redirect URL for Koko hosted session
    const redirectUrl = `${baseUrl}/pay?merchant=${cfg.merchantId}&order=${input.orderNumber}&amount=${input.amount.toFixed(2)}`;

    return {
      gatewayId: this.id,
      status: 'INITIATED',
      redirectUrl,
      providerReference: `koko_${input.orderNumber}`,
      metadata: {
        orderNumber: input.orderNumber,
        amount: input.amount,
        installments: 3,
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
    const cfg = getKokoConfig();
    const signature = input.headers['x-koko-signature'] || input.headers['signature'] || '';

    const isSigValid = cfg.apiSecret
      ? verifyKokoWebhookSignature(input.body, signature, cfg.apiSecret)
      : true;

    const rawStatus = String(raw.status || raw.payment_status || 'PENDING');
    const status = mapKokoStatus(rawStatus);
    const amount = Number(raw.amount || 0);
    const orderNumber = String(raw.order_id || raw.orderNumber || '');
    const providerReference = String(raw.transaction_id || raw.koko_reference || '');

    if (!isSigValid && cfg.apiSecret) {
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
        error: 'Koko webhook HMAC signature verification failed',
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
        installmentsPaid: raw.installments_paid,
      },
    };
  }

  async handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult> {
    const { event, expectedAmount } = input;

    if (!event.isValid) {
      throw new PaymentVerificationError(event.error || 'Invalid Koko callback event');
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
      error: 'Koko automated refund requires live API credentials',
    };
  }
}
