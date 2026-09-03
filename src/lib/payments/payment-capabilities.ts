/**
 * GRABBER BUSINESS OS — PAYMENT CAPABILITIES
 * Explicit capability contracts for payment providers
 */

export interface PaymentGatewayCapabilities {
  supportsOnlinePayment: boolean;
  supportsRedirect: boolean;
  supportsCallback: boolean;
  supportsRefund: boolean;
  supportsCancel: boolean;
  supportsPartialRefund: boolean;
  supportsCOD: boolean;
  supportsPOS: boolean;
  supportsStorefront: boolean;
  supportedCurrencies: string[];
}

export const CAPABILITIES_COD: PaymentGatewayCapabilities = {
  supportsOnlinePayment: false,
  supportsRedirect: false,
  supportsCallback: false,
  supportsRefund: false,
  supportsCancel: true,
  supportsPartialRefund: false,
  supportsCOD: true,
  supportsPOS: true,
  supportsStorefront: true,
  supportedCurrencies: ['LKR'],
};

export const CAPABILITIES_PAYHERE: PaymentGatewayCapabilities = {
  supportsOnlinePayment: true,
  supportsRedirect: true,
  supportsCallback: true,
  supportsRefund: true,
  supportsCancel: false,
  supportsPartialRefund: true,
  supportsCOD: false,
  supportsPOS: false,
  supportsStorefront: true,
  supportedCurrencies: ['LKR', 'USD'],
};

export const CAPABILITIES_WEBXPAY: PaymentGatewayCapabilities = {
  supportsOnlinePayment: true,
  supportsRedirect: true,
  supportsCallback: true,
  supportsRefund: true,
  supportsCancel: false,
  supportsPartialRefund: false,
  supportsCOD: false,
  supportsPOS: false,
  supportsStorefront: true,
  supportedCurrencies: ['LKR', 'USD'],
};

export const CAPABILITIES_KOKO: PaymentGatewayCapabilities = {
  supportsOnlinePayment: true,
  supportsRedirect: true,
  supportsCallback: true,
  supportsRefund: true,
  supportsCancel: false,
  supportsPartialRefund: true,
  supportsCOD: false,
  supportsPOS: true, // Koko supports in-store / POS BNPL in Sri Lanka
  supportsStorefront: true,
  supportedCurrencies: ['LKR'],
};

export const CAPABILITIES_MINTPAY: PaymentGatewayCapabilities = {
  supportsOnlinePayment: true,
  supportsRedirect: true,
  supportsCallback: true,
  supportsRefund: true,
  supportsCancel: false,
  supportsPartialRefund: true,
  supportsCOD: false,
  supportsPOS: true, // Mintpay supports both online and in-store merchant payments
  supportsStorefront: true,
  supportedCurrencies: ['LKR'],
};

export const CAPABILITIES_PAYZY: PaymentGatewayCapabilities = {
  supportsOnlinePayment: true,
  supportsRedirect: true,
  supportsCallback: true,
  supportsRefund: true,
  supportsCancel: false,
  supportsPartialRefund: false,
  supportsCOD: false,
  supportsPOS: false,
  supportsStorefront: true,
  supportedCurrencies: ['LKR'],
};
