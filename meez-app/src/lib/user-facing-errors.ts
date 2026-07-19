import { logger } from "@/lib/logger";

export type ErrorCategory =
  | "internet"
  | "connection_lost"
  | "server"
  | "session"
  | "menu_update"
  | "image"
  | "menu_data"
  | "branch_empty"
  | "timeout"
  | "schema"
  | "storage"
  | "unknown";

export type UserFacingError = {
  category: ErrorCategory;
  title: string;
  message: string;
  hint?: string;
  retryable: boolean;
  autoRetry: boolean;
  logLabel: string;
};

type ClassifyContext = {
  code?: string;
  faultCode?: string;
};

function extractRawMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg.trim();
  }
  return "";
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

const TIMEOUT_PATTERNS = [/timeout/i, /timed out/i, /aborted/i, /deadline/i];
const RPC_PATTERNS = [/pgrst/i, /rpc/i, /postgres/i, /check_failed/i];

const SERVER_PATTERNS = [/503/, /502/, /504/, /500/, /unavailable/i, /maintenance/i];
const SESSION_PATTERNS = [/jwt/i, /session/i, /401/, /expired/i, /unauthorized/i];
const NETWORK_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /internet/i,
  /offline/i,
  /etimedout/i,
];

function base(partial: UserFacingError): UserFacingError {
  return partial;
}

export function classifyUserFacingError(error: unknown, context: ClassifyContext = {}): UserFacingError {
  const raw = extractRawMessage(error);
  const haystack = `${raw} ${context.code ?? context.faultCode ?? ""}`.trim();

  if (context.faultCode === "MENU_EMPTY") {
    return base({
      category: "branch_empty",
      title: "لا توجد بيانات",
      message: "لا توجد بيانات متاحة لهذا الفرع.",
      retryable: true,
      autoRetry: false,
      logLabel: "branch_empty",
    });
  }
  if (context.faultCode === "MEDIA_DEGRADED") {
    return base({
      category: "image",
      title: "تحميل الصور",
      message: "تعذر تحميل الصور، سيتم إعادة المحاولة تلقائيًا.",
      retryable: true,
      autoRetry: true,
      logLabel: "image_load_failed",
    });
  }
  if (context.faultCode === "LOAD_BLANK") {
    return base({
      category: "menu_data",
      title: "تحميل المنيو",
      message: "تعذر تحميل بيانات المنيو، يرجى المحاولة مرة أخرى.",
      retryable: true,
      autoRetry: true,
      logLabel: "menu_load_blank",
    });
  }
  if (context.faultCode === "STORAGE") {
    return base({
      category: "storage",
      title: "تخزين الجهاز",
      message: "تعذّر حفظ بيانات الجهاز محلياً.",
      retryable: true,
      autoRetry: false,
      logLabel: "storage_fault",
    });
  }
  if (context.faultCode === "SCHEMA") {
    return base({
      category: "schema",
      title: "خطأ في البيانات",
      message: "تعذّر عرض المنيو بسبب خطأ في بنية البيانات.",
      hint: raw || undefined,
      retryable: true,
      autoRetry: false,
      logLabel: "schema_fault",
    });
  }
  if (/offline|no internet|internet connection|لا يوجد اتصال/i.test(haystack)) {
    return base({
      category: "internet",
      title: "لا يوجد اتصال",
      message: "لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة ثم إعادة المحاولة.",
      retryable: true,
      autoRetry: true,
      logLabel: "internet_offline",
    });
  }
  if (context.faultCode === "NETWORK" || matchesAny(haystack, NETWORK_PATTERNS)) {
    return base({
      category: "connection_lost",
      title: "انقطاع الاتصال",
      message: "تم فقد الاتصال بالخادم، جاري إعادة المحاولة...",
      retryable: true,
      autoRetry: true,
      logLabel: "connection_lost",
    });
  }
  if (matchesAny(haystack, TIMEOUT_PATTERNS)) {
    return base({
      category: "timeout",
      title: "انتهت مهلة الاتصال",
      message: "تم فقد الاتصال بالخادم، جاري إعادة المحاولة...",
      retryable: true,
      autoRetry: true,
      logLabel: "request_timeout",
    });
  }
  if (matchesAny(haystack, RPC_PATTERNS)) {
    return base({
      category: "menu_data",
      title: "خطأ في الاتصال بقاعدة البيانات",
      message: "تعذّر جلب البيانات من الخادم. يرجى المحاولة مرة أخرى.",
      retryable: true,
      autoRetry: true,
      logLabel: "rpc_failure",
    });
  }
  if (matchesAny(haystack, SERVER_PATTERNS)) {
    return base({
      category: "server",
      title: "الخدمة غير متاحة",
      message: "الخدمة غير متاحة حاليًا، يرجى المحاولة لاحقًا.",
      retryable: true,
      autoRetry: true,
      logLabel: "server_unavailable",
    });
  }
  if (matchesAny(haystack, SESSION_PATTERNS)) {
    return base({
      category: "session",
      title: "انتهت الجلسة",
      message: "انتهت صلاحية الجلسة، يرجى إعادة تحميل المنيو.",
      retryable: true,
      autoRetry: false,
      logLabel: "session_expired",
    });
  }

  if (raw) {
    logger.warn("user_error.unclassified", { message: raw, code: context.faultCode });
    return base({
      category: "unknown",
      title: "تعذّر إكمال العملية",
      message: raw,
      retryable: true,
      autoRetry: false,
      logLabel: "unknown_error",
    });
  }

  return base({
    category: "unknown",
    title: "خطأ غير متوقع",
    message: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    retryable: true,
    autoRetry: false,
    logLabel: "unexpected_error_empty",
  });
}

export function faultFromUserError(code: string, detail?: string) {
  const classified = classifyUserFacingError(detail ?? "", { faultCode: code });
  return {
    code,
    title: classified.title,
    message: classified.message,
    hint: classified.hint,
    autoRetry: classified.autoRetry,
    detail,
  };
}
