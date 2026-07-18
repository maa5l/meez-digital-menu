import type { Fault, FaultCode } from "@/kiosk/types";

const FAULT_MESSAGES: Record<FaultCode, string> = {
  MENU_EMPTY: "لا توجد منتجات مفعّلة في هذا المنيو حالياً.",
  SCHEMA: "خطأ برمجي في بنية بيانات المنتجات.",
  NETWORK: "فشل الاتصال بالخادم — الرجاء التحقق من الشبكة.",
  LOAD_BLANK: "لم يكتمل تحميل المنيو بشكل سليم — الرجاء إعادة المحاولة.",
  STORAGE: "تعذّر حفظ رمز الجهاز محلياً.",
  MEDIA_DEGRADED: "تعذّر تحميل بعض الصور — العرض مستمر بدونها.",
};

export function faultFromCode(code: FaultCode, detail?: string): Fault {
  return {
    code,
    message: FAULT_MESSAGES[code],
    detail,
  };
}
