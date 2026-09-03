/**
 * GRABBER BUSINESS OS — CANONICAL PAYMENT SERVICE
 * Central Orchestrator for all Payment Gateway Adapters
 */

import type { PaymentGateway } from './payment-gateway';
import type {
  PaymentGatewayId,
  PaymentChannel,
  CreatePaymentInput,
  CreatePaymentResult,
  GetPaymentStatusInput,
  PaymentStatusResult,
  VerifyCallbackInput,
  PaymentLifecycleResult,
  RefundPaymentInput,
  RefundResult,
  CancelPaymentInput,
  CancelPaymentResult,
} from './payment-types';
import {
  PaymentError,
  PaymentConfigurationError,
  PaymentUnsupportedOperationError,
} from './payment-errors';
import { CodGateway } from './cod';
import { PayHereGateway } from './payhere';
import { WebXPayGateway } from './webxpay';
import { KokoGateway } from './koko';
import { MintpayGateway } from './mintpay';
import { PayzyGateway } from './payzy';

export class PaymentService {
  private gateways: Map<PaymentGatewayId, PaymentGateway> = new Map();

  constructor() {
    this.registerDefaultGateways();
  }

  private registerDefaultGateways() {
    this.registerGateway(new CodGateway());
    this.registerGateway(new PayHereGateway());
    this.registerGateway(new WebXPayGateway());
    this.registerGateway(new KokoGateway());
    this.registerGateway(new MintpayGateway());
    this.registerGateway(new PayzyGateway());
  }

  public registerGateway(gateway: PaymentGateway): void {
    this.gateways.set(gateway.id, gateway);
  }

  public getGateway(id: PaymentGatewayId): PaymentGateway {
    const gateway = this.gateways.get(id);
    if (!gateway) {
      throw new PaymentConfigurationError(`Payment gateway "${id}" is not registered.`);
    }
    return gateway;
  }

  public getAvailableGateways(options?: {
    channel?: PaymentChannel;
    currency?: string;
    amount?: number;
  }): Array<{ id: PaymentGatewayId; name: string; isConfigured: boolean; isAvailable: boolean }> {
    const list: Array<{ id: PaymentGatewayId; name: string; isConfigured: boolean; isAvailable: boolean }> = [];

    const names: Record<PaymentGatewayId, string> = {
      COD: 'Cash on Delivery / Counter Cash',
      PAYHERE: 'PayHere (Cards / Wallets / Genie)',
      WEBXPAY: 'WebXPay (Visa / Mastercard / LankaQR)',
      KOKO: 'Koko (Buy Now Pay Later in 3)',
      MINTPAY: 'Mintpay (Shop Now Pay Later)',
      PAYZY: 'Payzy (Installments & Direct Pay)',
    };

    for (const [id, gateway] of this.gateways.entries()) {
      const caps = gateway.capabilities();
      const isConfigured = gateway.isConfigured();

      let isAvailable = isConfigured;

      if (options?.channel === 'POS' && !caps.supportsPOS) {
        isAvailable = false;
      }
      if (options?.channel === 'STOREFRONT' && !caps.supportsStorefront) {
        isAvailable = false;
      }
      if (options?.currency && !caps.supportedCurrencies.includes(options.currency)) {
        isAvailable = false;
      }

      list.push({
        id,
        name: names[id] || id,
        isConfigured,
        isAvailable,
      });
    }

    return list;
  }

  public async createPayment(
    gatewayId: PaymentGatewayId,
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const gateway = this.getGateway(gatewayId);

    // Assert authoritative amount
    if (input.amount <= 0 || !Number.isFinite(input.amount)) {
      throw new PaymentError(`Authoritative amount must be positive. Received: ${input.amount}`);
    }

    // Channel check
    const caps = gateway.capabilities();
    if (input.channel === 'POS' && !caps.supportsPOS) {
      throw new PaymentUnsupportedOperationError(gatewayId, 'POS_PAYMENT');
    }
    if (input.channel === 'STOREFRONT' && !caps.supportsStorefront) {
      throw new PaymentUnsupportedOperationError(gatewayId, 'STOREFRONT_PAYMENT');
    }

    return gateway.createPayment(input);
  }

  public async getPaymentStatus(
    gatewayId: PaymentGatewayId,
    input: GetPaymentStatusInput,
  ): Promise<PaymentStatusResult> {
    const gateway = this.getGateway(gatewayId);
    return gateway.getPaymentStatus(input);
  }

  public async processCallback(
    gatewayId: PaymentGatewayId,
    input: {
      callbackData: VerifyCallbackInput;
      expectedAmount: number;
      orderId: string;
      idempotencyKey?: string;
    },
  ): Promise<PaymentLifecycleResult> {
    const gateway = this.getGateway(gatewayId);

    // 1. Verify callback signature and extract normalized event
    const event = await gateway.verifyCallback(input.callbackData);

    // 2. Pass to adapter's handleCallback
    return gateway.handleCallback({
      event,
      expectedAmount: input.expectedAmount,
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  public async refundPayment(
    gatewayId: PaymentGatewayId,
    input: RefundPaymentInput,
  ): Promise<RefundResult> {
    const gateway = this.getGateway(gatewayId);
    const caps = gateway.capabilities();
    if (!caps.supportsRefund || !gateway.refund) {
      throw new PaymentUnsupportedOperationError(gatewayId, 'REFUND');
    }
    return gateway.refund(input);
  }

  public async cancelPayment(
    gatewayId: PaymentGatewayId,
    input: CancelPaymentInput,
  ): Promise<CancelPaymentResult> {
    const gateway = this.getGateway(gatewayId);
    const caps = gateway.capabilities();
    if (!caps.supportsCancel || !gateway.cancel) {
      throw new PaymentUnsupportedOperationError(gatewayId, 'CANCEL');
    }
    return gateway.cancel(input);
  }
}

export const defaultPaymentService = new PaymentService();
