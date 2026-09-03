/**
 * GRABBER BUSINESS OS — WEBXPAY GATEWAY ADAPTER
 * Implements PaymentGateway for WebXPay (Sri Lanka)
 */

import type { PaymentGateway } from '../payment-gateway';
import type { PaymentGatewayCapabilities } from '../payment-capabilities';
import { CAPABILITIES_WEBXPAY } from '../payment-capabilities';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  PaymentStatusResult,
  VerifyCallbackInput,
  VerifiedPaymentEvent,
  HandleCallbackInput,
  PaymentLifecycleResult,
} from '../payment-types';
import {
  PaymentConfigurationError,
  PaymentVerificationError,
  PaymentAmountMismatchError,
} from '../payment-errors';
import { generateWebXPayPayload, getWebXPayConfig, isWebXPayConfigured } from './client';
import { verifyWebXPayCallback } from './webhook';
import { mapWebXPayStatus } from './mapper';

export class WebXPayGateway implements PaymentGateway {
  readonly id = 'WEBXPAY' as const;

  capabilities(): PaymentGatewayCapabilities {
    return CAPABILITIES_WEBXPAY;
  }

  isConfigured(): boolean {
    return isWebXPayConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) {
      throw new PaymentConfigurationError('WebXPay is not configured. Set public and secret keys.');
    }

    const payload = generateWebXPayPayload({
      orderNumber: input.orderNumber,
      amount: input.amount,
      customerName: input.customer?.name,
      customerEmail: input.customer?.email,
      customerPhone: input.customer?.phone,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    });

    return {
      gatewayId: this.id,
      status: 'INITIATED',
      redirectUrl: payload.checkoutUrl,
      fields: payload.fields,
      metadata: {
        orderNumber: input.orderNumber,
        amount: input.amount,
        currency: input.currency,
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
    const config = getWebXPayConfig();

    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      stringParams[k] = String(v ?? '');
    }

    const isValidSig = verifyWebXPayCallback(stringParams, config.secretKey);
    const rawStatus = stringParams.status || stringParams.status_code || '';
    const status = mapWebXPayStatus(rawStatus);
    const amount = parseFloat(stringParams.amount || '0');
    const orderNumber = stringParams.order_id || '';
    const providerReference = stringParams.transaction_id || stringParams.payment_id || '';

    if (!isValidSig && config.secretKey) {
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
        error: 'WebXPay signature verification failed',
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
        paymentGateway: 'WEBXPAY',
      },
    };
  }

  async handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult> {
    const { event, expectedAmount } = input;

    if (!event.isValid) {
      throw new PaymentVerificationError(event.error || 'Invalid WebXPay callback');
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
}
