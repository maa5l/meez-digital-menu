/**
 * التحقق من توقيع Webhook — يُنفَّذ على الخادم فقط.
 * لا تضع مفاتيح التوقيع في Frontend.
 */

export type SignatureVerifyInput = {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
};

export function verifyWebhookSignature(_input: SignatureVerifyInput): boolean {
  throw new Error(
    "verifyWebhookSignature must run on the server. Implement with crypto.timingSafeEqual.",
  );
}
