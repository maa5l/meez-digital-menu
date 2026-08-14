import type { RegistrationPeek } from "@/services/kiosk-check";
import { classifyUserFacingError } from "@/lib/user-facing-errors";

export type StatusDetail = {
  title: string;
  message: string;
  hint?: string;
};

export function describeRegistrationStatus(
  peek: RegistrationPeek | null | undefined,
  openingMenu: boolean,
): StatusDetail {
  if (openingMenu) {
    return {
      title: "جاري فتح المنيو",
      message: "يتم التحقق من التفعيل وتحميل المنيو داخل التطبيق.",
    };
  }

  if (!peek || peek.status === "checking") {
    return {
      title: "بانتظار التفعيل",
      message: "جاري التحقق من حالة الجهاز مع الخادم.",
      hint: "انسخ الرمز إلى لوحة التحكم → الأجهزة → تفعيل جهاز",
    };
  }

  if (peek.status === "registered") {
    return {
      title: "تم التفعيل",
      message: "جاري التحويل إلى المنيو…",
    };
  }

  if (peek.status === "error") {
    if (peek.reason === "rate_limited" || peek.rateLimited) {
      return {
        title: "تحديث مؤجل",
        message: "تعذّر تحديث حالة الجهاز الآن، سنحاول مرة أخرى تلقائيًا.",
        hint: "يمكنك متابعة استخدام التطبيق — لا حاجة للانتظار",
      };
    }

    const classified = classifyUserFacingError(peek.message ?? "network", {
      faultCode: peek.reason === "network" ? "NETWORK" : undefined,
    });
    return {
      title: classified.title,
      message: classified.message,
      hint: classified.autoRetry
        ? "سيتم إعادة المحاولة تلقائيًا..."
        : classified.hint,
    };
  }

  if (peek.reason === "device_not_registered") {
    return {
      title: "بانتظار التفعيل",
      message: "الجهاز لم يُفعَّل بعد من لوحة التحكم.",
      hint: "لوحة التحكم → الأجهزة → أدخل الرمز الظاهر على الشاشة",
    };
  }

  if (peek.reason) {
    return {
      title: "الجهاز غير مسموح",
      message: `السبب: ${peek.reason}`,
      hint: "تحقق من الاشتراك وحالة الجهاز في لوحة التحكم",
    };
  }

  return {
    title: "بانتظار التفعيل",
    message: "انسخ الرمز إلى لوحة التحكم لتفعيل هذا الجهاز.",
    hint: "لوحة التحكم → الأجهزة → تفعيل جهاز",
  };
}

export function describeBootError(message: string): StatusDetail {
  const classified = classifyUserFacingError(message);
  return {
    title: classified.title,
    message: classified.message,
    hint: classified.hint ?? "أعد تشغيل التطبيق. إذا تكرر الخطأ، أعد تثبيت آخر نسخة من APK",
  };
}

export function describeConfigError(): StatusDetail {
  return {
    title: "إعدادات غير مكتملة",
    message: "متغيرات Supabase غير مضبوطة في build التطبيق.",
    hint: "EXPO_PUBLIC_SUPABASE_URL و EXPO_PUBLIC_SUPABASE_ANON_KEY مطلوبان في EAS",
  };
}
