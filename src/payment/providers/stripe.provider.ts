import type { PaymentProvider } from "./base.provider";

/** Stripe — تُفعَّل عبر مفاتيح الخادم STRIPE_SECRET_KEY */
export const stripeProviderStub: PaymentProvider = {
  id: "stripe",
  async createPaymentIntent() {
    throw new Error("Stripe provider not configured. Set up server-side integration.");
  },
};
