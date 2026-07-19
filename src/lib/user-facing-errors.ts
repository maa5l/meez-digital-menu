import { logger } from "@/lib/logger";

export type ErrorCategory =
  | "internet"
  | "connection_lost"
  | "server"
  | "timeout"
  | "rpc"
  | "session"
  | "menu_update"
  | "image"
  | "menu_data"
  | "branch_missing"
  | "branch_inactive"
  | "kiosk_inactive"
  | "invalid_link"
  | "empty_menu"
  | "empty_category"
  | "schema"
  | "storage"
  | "unexpected"
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
  online?: boolean;
  faultCode?: string;
  reason?: string;
};

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

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

const NETWORK_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /fetch failed/i,
  /internet/i,
  /offline/i,
  /etimedout/i,
  /econnrefused/i,
  /enotfound/i,
  /socket hang up/i,
];

const TIMEOUT_PATTERNS = [/timeout/i, /timed out/i, /aborted/i, /deadline/i, /ready_ack/i];

const SESSION_PATTERNS = [
  /jwt/i,
  /session/i,
  /unauthorized/i,
  /401/,
  /invalid.*token/i,
  /expired/i,
  /انتهت صلاحية/i,
];

const SERVER_PATTERNS = [
  /503/,
  /502/,
  /504/,
  /500/,
  /maintenance/i,
  /unavailable/i,
  /service unavailable/i,
  /under maintenance/i,
];

const RPC_PATTERNS = [
  /pgrst/i,
  /rpc/i,
  /postgres/i,
  /supabase/i,
  /could not find the function/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /check_failed/i,
  /invalid_response/i,
];

const SCHEMA_PATTERNS = [/schema/i, /pgrst202/i];

function base(partial: UserFacingError): UserFacingError {
  return partial;
}

export function menuUpdateNotice(): UserFacingError {
  return base({
    category: "menu_update",
    title: "تحديث المنيو",
    message: "تم توفر تحديث جديد للمنيو، جاري تحديث البيانات...",
    retryable: false,
    autoRetry: false,
    logLabel: "menu_update_in_progress",
  });
}

export function emptyMenuNotice(): UserFacingError {
  return base({
    category: "empty_menu",
    title: "المنيو فارغ",
    message: "لا توجد منتجات أو محاصيل لعرضها حاليًا.",
    hint: "أضف المحتوى من لوحة التحكم",
    retryable: true,
    autoRetry: false,
    logLabel: "empty_menu",
  });
}

export function emptyCategoryNotice(): UserFacingError {
  return base({
    category: "empty_category",
    title: "القسم فارغ",
    message: "لا توجد منتجات في هذا القسم حاليًا.",
    hint: "اختر قسمًا آخر أو أضف منتجات من لوحة التحكم",
    retryable: false,
    autoRetry: false,
    logLabel: "empty_category",
  });
}

export function branchMissingNotice(): UserFacingError {
  return base({
    category: "branch_missing",
    title: "الفرع غير موجود",
    message: "لا توجد بيانات متاحة لهذا الفرع.",
    hint: "تحقق من رمز الجهاز أو إعدادات الفرع في لوحة التحكم",
    retryable: true,
    autoRetry: false,
    logLabel: "branch_missing",
  });
}

export function branchInactiveNotice(): UserFacingError {
  return base({
    category: "branch_inactive",
    title: "الفرع غير مفعّل",
    message: "هذا الفرع غير مفعّل حاليًا.",
    hint: "فعّل الفرع من لوحة التحكم",
    retryable: false,
    autoRetry: false,
    logLabel: "branch_inactive",
  });
}

export function kioskInactiveNotice(): UserFacingError {
  return base({
    category: "kiosk_inactive",
    title: "الكشك غير مفعّل",
    message: "هذا الجهاز لم يُفعَّل بعد من لوحة التحكم.",
    hint: "لوحة التحكم → الأجهزة → أدخل الرمز الظاهر على الشاشة",
    retryable: true,
    autoRetry: true,
    logLabel: "kiosk_inactive",
  });
}

export function invalidLinkNotice(detail?: string): UserFacingError {
  return base({
    category: "invalid_link",
    title: "رابط غير صالح",
    message: detail?.trim() || "رمز QR أو الرابط غير صحيح. تحقق من الرمز وحاول مرة أخرى.",
    retryable: true,
    autoRetry: false,
    logLabel: "invalid_link",
  });
}

export function rpcFailureNotice(detail?: string): UserFacingError {
  return base({
    category: "rpc",
    title: "خطأ في الاتصال بقاعدة البيانات",
    message: "تعذّر جلب البيانات من الخادم. يرجى المحاولة مرة أخرى.",
    hint: detail || undefined,
    retryable: true,
    autoRetry: true,
    logLabel: "rpc_failure",
  });
}

export function unexpectedErrorNotice(detail?: string): UserFacingError {
  logger.error("user_error.unexpected", { detail });
  return base({
    category: "unexpected",
    title: "خطأ غير متوقع",
    message: detail?.trim() || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    retryable: true,
    autoRetry: false,
    logLabel: "unexpected_error",
  });
}

/** @deprecated use emptyMenuNotice or branchMissingNotice */
export function branchEmptyNotice(): UserFacingError {
  return emptyMenuNotice();
}

export function errorFromKioskReason(reason?: string, detail?: string): UserFacingError {
  switch (reason) {
    case "checking":
      return base({
        category: "menu_update",
        title: "جاري التحقق",
        message: detail?.trim() || "جاري التحقق من حالة الجهاز...",
        retryable: false,
        autoRetry: true,
        logLabel: "kiosk_checking",
      });
    case "invalid_code":
      return invalidLinkNotice(detail);
    case "device_not_registered":
    case "device_inactive":
      return kioskInactiveNotice();
    case "check_failed":
    case "invalid_response":
      return rpcFailureNotice(detail);
    case "subscription_suspended":
    case "subscription_expired":
    case "subscription_canceled":
      return base({
        category: "branch_inactive",
        title: "الاشتراك غير نشط",
        message: "انتهى الاشتراك أو تم إيقاف الخدمة. تواصل مع إدارة المنشأة.",
        retryable: false,
        autoRetry: false,
        logLabel: "subscription_blocked",
      });
    default:
      return classifyUserFacingError(detail ?? reason ?? "", { reason });
  }
}

export function classifyUserFacingError(error: unknown, context: ClassifyContext = {}): UserFacingError {
  const raw = extractRawMessage(error);
  const code = context.code ?? context.faultCode ?? context.reason ?? "";
  const haystack = `${raw} ${code}`.trim();
  const online = context.online ?? isBrowserOnline();

  if (context.faultCode === "MENU_EMPTY") return emptyMenuNotice();
  if (context.faultCode === "LOAD_BLANK") {
    return base({
      category: "menu_data",
      title: "تعذّر تحميل المنيو",
      message: "تعذر تحميل بيانات المنيو، يرجى المحاولة مرة أخرى.",
      retryable: true,
      autoRetry: true,
      logLabel: "menu_load_blank",
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
  if (context.faultCode === "STORAGE") {
    return base({
      category: "storage",
      title: "تخزين الجهاز",
      message: "تعذّر حفظ بيانات الجهاز محلياً.",
      hint: "أعد تشغيل التطبيق أو ألغِ ربط الجهاز ثم فعّله من جديد",
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

  if (context.reason === "invalid_code") return invalidLinkNotice(raw);
  if (context.reason === "device_not_registered" || context.reason === "device_inactive") {
    return kioskInactiveNotice();
  }
  if (context.reason === "check_failed" || context.reason === "invalid_response") {
    return rpcFailureNotice(raw);
  }

  if (!online) {
    return base({
      category: "internet",
      title: "لا يوجد اتصال",
      message: "لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة ثم إعادة المحاولة.",
      retryable: true,
      autoRetry: true,
      logLabel: "internet_offline",
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

  if (matchesAny(haystack, NETWORK_PATTERNS)) {
    return base({
      category: "connection_lost",
      title: "انقطاع الاتصال",
      message: "تم فقد الاتصال بالخادم، جاري إعادة المحاولة...",
      retryable: true,
      autoRetry: true,
      logLabel: "connection_lost",
    });
  }

  if (matchesAny(haystack, RPC_PATTERNS)) {
    return rpcFailureNotice(raw || undefined);
  }

  if (matchesAny(haystack, SCHEMA_PATTERNS)) {
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

  if (raw) {
    logger.warn("user_error.unclassified", { message: raw, code });
    return base({
      category: "unknown",
      title: "تعذّر إكمال العملية",
      message: raw,
      retryable: true,
      autoRetry: false,
      logLabel: "unknown_error",
    });
  }

  return unexpectedErrorNotice();
}

export function getClassifiedErrorMessage(error: unknown): string {
  return classifyUserFacingError(error).message;
}

export function faultCodeToUserError(code: string, detail?: string): UserFacingError {
  return classifyUserFacingError(detail ?? "", { faultCode: code });
}
