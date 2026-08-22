import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import Stripe from "stripe";

export type PaymentIntentResult = {
  provider: "mock" | "stripe";
  externalId: string;
  clientSecret: string;
};
export type VerifiedPaymentEvent = {
  id: string;
  type: "succeeded" | "failed" | "ignored";
  externalId?: string;
  failureCode?: string;
  failureMessage?: string;
};

@Injectable()
export class PaymentProviderGateway {
  get activeProvider(): "mock" | "stripe" {
    if (process.env.STRIPE_SECRET_KEY) return "stripe";
    if (process.env.NODE_ENV === "production")
      throw new ServiceUnavailableException(
        "Stripe is not configured for production checkout",
      );
    return "mock";
  }

  async createIntent(input: {
    paymentId: string;
    orderId: string;
    orderNumber: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
    email: string;
  }): Promise<PaymentIntentResult> {
    if (this.activeProvider === "mock")
      return {
        provider: "mock",
        externalId: `mock_pi_${input.paymentId}`,
        clientSecret: `mock_secret_${input.paymentId}`,
      };
    const intent = await this.stripe().paymentIntents.create(
      {
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        receipt_email: input.email,
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: input.paymentId,
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!intent.client_secret)
      throw new ServiceUnavailableException(
        "Stripe did not return a client secret",
      );
    return {
      provider: "stripe",
      externalId: intent.id,
      clientSecret: intent.client_secret,
    };
  }

  async resumeIntent(externalId: string): Promise<PaymentIntentResult> {
    if (externalId.startsWith("mock_pi_"))
      return {
        provider: "mock",
        externalId,
        clientSecret: `mock_secret_${externalId.replace("mock_pi_", "")}`,
      };
    const intent = await this.stripe().paymentIntents.retrieve(externalId);
    if (!intent.client_secret)
      throw new ServiceUnavailableException(
        "Stripe checkout session can no longer be resumed",
      );
    return {
      provider: "stripe",
      externalId,
      clientSecret: intent.client_secret,
    };
  }

  verifyStripeWebhook(
    payload: Buffer,
    signature?: string,
  ): VerifiedPaymentEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature)
      throw new ServiceUnavailableException(
        "Stripe webhook verification is not configured",
      );
    const event = this.stripe().webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
    if (event.type === "payment_intent.succeeded")
      return {
        id: event.id,
        type: "succeeded",
        externalId: event.data.object.id,
      };
    if (event.type === "payment_intent.payment_failed")
      return {
        id: event.id,
        type: "failed",
        externalId: event.data.object.id,
        failureCode:
          event.data.object.last_payment_error?.code ?? "PAYMENT_FAILED",
        failureMessage:
          event.data.object.last_payment_error?.message ??
          "The payment was declined",
      };
    return { id: event.id, type: "ignored" };
  }

  async refund(input: {
    paymentExternalId: string;
    amountMinor: number;
    idempotencyKey: string;
  }) {
    if (input.paymentExternalId.startsWith("mock_pi_"))
      return { externalId: `mock_refund_${input.idempotencyKey}` };
    const refund = await this.stripe().refunds.create(
      {
        payment_intent: input.paymentExternalId,
        amount: input.amountMinor,
        reason: "requested_by_customer",
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return { externalId: refund.id };
  }

  private stripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new ServiceUnavailableException("Stripe is not configured");
    return new Stripe(key);
  }
}
