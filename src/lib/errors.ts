export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message = "غير مصرح") {
    super(message, "AUTH_REQUIRED", 401);
    this.name = "AuthError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs: number) {
    super(`محاولات كثيرة. أعد المحاولة بعد ${Math.ceil(retryAfterMs / 1000)} ثانية`, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }

  readonly retryAfterMs: number;
}

/** حد Supabase لإرسال البريد — لا يُرسل بريد فعلياً عند 429 */
export class EmailRateLimitError extends AppError {
  readonly retryAfterMs: number;
  readonly supabaseErrorCode?: string;

  constructor(options: {
    retryAfterSeconds?: number;
    message?: string;
    supabaseErrorCode?: string;
  } = {}) {
    const retryAfterSeconds = options.retryAfterSeconds ?? 60;
    const message =
      options.message ??
      `تم طلب رموز كثيرة. انتظر ${retryAfterSeconds} ثانية — أو استخدم آخر رمز وصل إلى بريدك.`;
    super(message, "EMAIL_RATE_LIMIT", 429);
    this.name = "EmailRateLimitError";
    this.retryAfterMs = retryAfterSeconds * 1000;
    this.supabaseErrorCode = options.supabaseErrorCode;
  }
}

function parseApiDetail(raw: string): string | null {
  try {
    const json = JSON.parse(raw) as { detail?: string };
    if (typeof json.detail === "string") {
      if (json.detail === "Not Found") {
        return "الصفحة أو المسار غير موجود. للتطبيق استخدم http://localhost:8080 وليس منفذ API (8000).";
      }
      return json.detail;
    }
  } catch {
    /* ليس JSON */
  }
  return null;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  const direct = extractMessage(error);
  if (direct) {
    const parsed = parseApiDetail(direct);
    return parsed ?? direct;
  }
  return "حدث خطأ غير متوقع";
}
