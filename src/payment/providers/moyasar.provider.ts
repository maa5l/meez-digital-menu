import type { PaymentProvider } from "./base.provider";

export const moyasarProviderStub: PaymentProvider = {
  id: "moyasar",
  async createPaymentIntent() {
    throw new Error("Moyasar provider not configured.");
  },
};
