/**
 * GRABBER BUSINESS OS — PAYMENT ERRORS
 * Normalized Error Classes for Payment Operations
 */

export class PaymentError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, code = 'PAYMENT_ERROR', status = 400, details?: unknown) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class PaymentConfigurationError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, 'PAYMENT_CONFIGURATION_ERROR', 503, details);
    this.name = 'PaymentConfigurationError';
  }
}

export class PaymentProviderUnavailableError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, 'PAYMENT_PROVIDER_UNAVAILABLE', 502, details);
    this.name = 'PaymentProviderUnavailableError';
  }
}

export class PaymentVerificationError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, 'PAYMENT_VERIFICATION_FAILED', 400, details);
    this.name = 'PaymentVerificationError';
  }
}

export class PaymentAmountMismatchError extends PaymentError {
  constructor(expected: number, received: number) {
    super(
      `Payment amount mismatch: Expected LKR ${expected.toFixed(2)}, received LKR ${received.toFixed(2)}`,
      'PAYMENT_AMOUNT_MISMATCH',
      400,
      { expected, received },
    );
    this.name = 'PaymentAmountMismatchError';
  }
}

export class PaymentDuplicateError extends PaymentError {
  constructor(providerReference: string) {
    super(
      `Duplicate payment event: ${providerReference} has already been processed`,
      'PAYMENT_DUPLICATE',
      409,
      { providerReference },
    );
    this.name = 'PaymentDuplicateError';
  }
}

export class PaymentUnsupportedOperationError extends PaymentError {
  constructor(gatewayId: string, operation: string) {
    super(
      `Operation "${operation}" is not supported by gateway "${gatewayId}"`,
      'PAYMENT_UNSUPPORTED_OPERATION',
      405,
      { gatewayId, operation },
    );
    this.name = 'PaymentUnsupportedOperationError';
  }
}
