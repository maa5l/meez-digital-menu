/** مفاتيح Idempotency لمنع تكرار المعاملات */

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export type IdempotencyRecord = {
  key: string;
  status: "pending" | "completed" | "failed";
  responseHash?: string;
  createdAt: string;
};
