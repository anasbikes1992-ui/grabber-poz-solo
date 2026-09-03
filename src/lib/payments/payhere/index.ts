/**
 * GRABBER BUSINESS OS — PAYHERE GATEWAY ADAPTER
 * Implements PaymentGateway for PayHere Payment Aggregator (Sri Lanka)
 */

import type { PaymentGateway } from '../payment-gateway';
import type { PaymentGatewayCapabilities } from '../payment-capabilities';
import { CAPABILITIES_PAYHERE } from '../payment-capabilities';
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
  PaymentUnsupportedOperationError,
} from '../payment-errors';
import {
  generatePayHereCheckoutPayload,
  getPayHereConfig,
  isPayHereConfigured,
  executePayHereRefund,
} from './client';
import { verifyPayHereCallbackSignature } from './webhook';
import { mapPayHereStatusCode } from './mapper';

export class PayHereGateway implements PaymentGateway {
  readonly id = 'PAYHERE' as const;

  capabilities(): PaymentGatewayCapabilities {
    return CAPABILITIES_PAYHERE;
  }

  isConfigured(): boolean {
    return isPayHereConfigured();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) {
      throw new PaymentConfigurationError('PayHere is not configured. Set merchant ID and secret.');
    }

    const payload = generatePayHereCheckoutPayload({
      orderNumber: input.orderNumber,
      amount: input.amount,
      itemsDescription: input.itemsDescription,
      customerName: input.customer?.name,
      customerPhone: input.customer?.phone,
      customerEmail: input.customer?.email,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      notifyUrl: input.notifyUrl,
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
    // PayHere does not provide an open public read endpoint without merchant API credentials.
    return {
      gatewayId: this.id,
      status: 'PENDING',
      providerReference: input.providerReference,
    };
  }

  async verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPaymentEvent> {
    const raw = typeof input.body === 'object' && input.body !== null ? (input.body as Record<string, any>) : {};
    const config = getPayHereConfig();

    const stringParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      stringParams[k] = String(v ?? '');
    }

    const signatureVerified = verifyPayHereCallbackSignature(stringParams, config.secret);

    const rawStatusCode = stringParams.status_code || '';
    const status = mapPayHereStatusCode(rawStatusCode);
    const amount = parseFloat(stringParams.payhere_amount || '0');
    const currency = stringParams.payhere_currency || 'LKR';
    const orderNumber = stringParams.order_id || '';
    const providerReference = stringParams.payment_id || '';

    if (!signatureVerified && config.secret) {
      return {
        isValid: false,
        gatewayId: this.id,
        orderNumber,
        providerReference,
        amount,
        currency,
        status: 'FAILED',
        rawStatus: rawStatusCode,
        signatureVerified: false,
        error: 'PayHere MD5 signature verification failed',
      };
    }

    return {
      isValid: true,
      gatewayId: this.id,
      orderNumber,
      providerReference,
      amount,
      currency,
      status,
      rawStatus: rawStatusCode,
      signatureVerified: true,
      metadata: {
        method: stringParams.method,
        statusMessage: stringParams.status_message,
        cardHolderName: stringParams.card_holder_name,
      },
    };
  }

  async handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult> {
    const { event, expectedAmount, orderId } = input;

    if (!event.isValid) {
      throw new PaymentVerificationError(event.error || 'Invalid PayHere callback event');
    }

    // Amount authority assertion: provider amount must match authoritative expected amount
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
    const res = await executePayHereRefund({
      paymentId: input.providerReference,
      description: input.reason || 'Customer refund',
    });

    if (res.success) {
      return {
        success: true,
        gatewayId: this.id,
        refundReference: res.refundId,
        refundAmount: input.refundAmount,
        status: 'REFUNDED',
        rawResponse: res.data,
      };
    }

    return {
      success: false,
      gatewayId: this.id,
      refundAmount: input.refundAmount,
      status: 'FAILED',
      error: res.error || 'PayHere automated refund failed',
      rawResponse: res.data,
    };
  }
}
