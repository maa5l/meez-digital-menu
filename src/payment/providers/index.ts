import { stripeProviderStub } from "./stripe.provider";
import { moyasarProviderStub } from "./moyasar.provider";
import type { PaymentProvider } from "./base.provider";
import type { PaymentProviderId } from "@/payment/types";

const providers: Partial<Record<PaymentProviderId, PaymentProvider>> = {
  stripe: stripeProviderStub,
  moyasar: moyasarProviderStub,
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Payment provider "${id}" is not registered`);
  }
  return provider;
}
