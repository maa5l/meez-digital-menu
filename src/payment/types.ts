/** أنواع الدفع — جاهزة لربط مزودي الدفع لاحقاً */

export type PaymentProviderId = "stripe" | "moyasar" | "stc_pay" | "apple_pay" | "mada";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: "SAR";
  provider: PaymentProviderId;
  status: PaymentStatus;
  idempotencyKey: string;
  metadata?: Record<string, string>;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  provider: PaymentProviderId;
  type: string;
  payload: unknown;
  receivedAt: string;
  verified: boolean;
};
