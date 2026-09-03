/**
 * GRABBER BUSINESS OS — PAYMENT GATEWAY CONTRACT
 * Common interface implemented by all payment adapters
 */

import type {
  PaymentGatewayId,
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
  CancelPaymentInput,
  CancelPaymentResult,
} from './payment-types';
import type { PaymentGatewayCapabilities } from './payment-capabilities';

export interface PaymentGateway {
  readonly id: PaymentGatewayId;

  /**
   * Returns capabilities supported by this adapter.
   */
  capabilities(): PaymentGatewayCapabilities;

  /**
   * Checks whether the gateway is configured and ready for transactions.
   */
  isConfigured(): boolean;

  /**
   * Initiates payment with the provider or prepares native transaction.
   * NOTE: Amount passed MUST be server-authoritative.
   */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Queries the provider for the authoritative status of a transaction.
   */
  getPaymentStatus(input: GetPaymentStatusInput): Promise<PaymentStatusResult>;

  /**
   * Verifies raw webhook/callback payload and signature.
   * Untrusted input is normalized into a VerifiedPaymentEvent.
   */
  verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPaymentEvent>;

  /**
   * Processes verified callback and maps to canonical payment lifecycle.
   */
  handleCallback(input: HandleCallbackInput): Promise<PaymentLifecycleResult>;

  /**
   * Issues refund via provider if supported.
   */
  refund?(input: RefundPaymentInput): Promise<RefundResult>;

  /**
   * Cancels payment with provider if supported.
   */
  cancel?(input: CancelPaymentInput): Promise<CancelPaymentResult>;
}
