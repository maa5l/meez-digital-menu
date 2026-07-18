import type { RegistrationPeek } from "@/services/kiosk-check";

export type StatusDetail = {
  title: string;
  message: string;
  hint?: string;
};

function isNetworkMessage(message: string): boolean {
  return /failed to fetch|network|timeout|internet|اتصال|شبكة/i.test(message);
}

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
    if (peek.reason === "rate_limited") {
      const sec = peek.retry_after_seconds;
      return {
        title: "محاولات كثيرة",
        message: sec
          ? `تم إيقاف الطلبات مؤقتاً. انتظر ${sec} ثانية ثم سيستمر التطبيق تلقائياً.`
          : "تم إيقاف الطلبات مؤقتاً. انتظر قليلاً ثم سيستمر التطبيق تلقائياً.",
        hint: "لا حاجة لإغلاق التطبيق — سيُعاد المحاولة تلقائياً",
      };
    }

    const message = peek.message ?? "تعذّر الاتصال بالخادم";
    return {
      title: isNetworkMessage(message) ? "مشكلة في الاتصال" : "خطأ في التفعيل",
      message,
      hint: isNetworkMessage(message)
        ? "تحقق من الإنترنت على التابلت ثم انتظر — سيُعاد الإعلان عن الرمز تلقائياً"
        : "إذا استمر الخطأ، أعد تشغيل التطبيق أو تواصل مع الدعم",
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
  return {
    title: "تعذّر تشغيل التطبيق",
    message,
    hint: "أعد تشغيل التطبيق. إذا تكرر الخطأ، أعد تثبيت آخر نسخة من APK",
  };
}

export function describeConfigError(): StatusDetail {
  return {
    title: "إعدادات غير مكتملة",
    message: "متغيرات Supabase غير مضبوطة في build التطبيق.",
    hint: "EXPO_PUBLIC_SUPABASE_URL و EXPO_PUBLIC_SUPABASE_ANON_KEY مطلوبان في EAS",
  };
}
