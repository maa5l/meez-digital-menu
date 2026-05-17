import type { PaymentIntent, PaymentProviderId } from "@/payment/types";

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPaymentIntent(input: {
    amount: number;
    currency: "SAR";
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent>;
  refund?(paymentId: string, amount?: number): Promise<PaymentIntent>;
}
