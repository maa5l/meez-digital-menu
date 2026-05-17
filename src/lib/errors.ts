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

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    const parsed = parseApiDetail(error.message);
    return parsed ?? error.message;
  }
  if (typeof error === "string") {
    const parsed = parseApiDetail(error);
    return parsed ?? error;
  }
  return "حدث خطأ غير متوقع";
}
