import { CreditCard, Loader2 } from "lucide-react";
import type { KioskAccessCheck } from "@/types/subscription";

type Props = {
  code: string;
  check: KioskAccessCheck;
  registrationStatus?: "checking" | "not_registered" | "registered";
};

function titleFor(check: KioskAccessCheck, checking: boolean): string {
  if (checking) {
    return "جاري التحقق…";
  }
  if (!check.registered) {
    return "الجهاز غير مفعّل";
  }
  switch (check.reason) {
    case "device_inactive":
      return "الجهاز معطّل";
    case "subscription_suspended":
    case "subscription_expired":
    case "subscription_canceled":
      return "الاشتراك غير نشط";
    case "subscription_past_due":
      return "في انتظار الدفع";
    default:
      return "الاشتراك مطلوب";
  }
}

function bodyFor(check: KioskAccessCheck): string {
  if (!check.registered) {
    return "فعّل هذا الرمز من لوحة التحكم ثم أعد فتح الصفحة.";
  }
  if (check.access?.status === "grace_period" && check.access.grace_ends_at) {
    return `فترة سماح حتى ${new Date(check.access.grace_ends_at).toLocaleDateString("ar-SA")} — أكمل الدفع من لوحة التحكم.`;
  }
  if (check.access?.status === "suspended") {
    return "تم إيقاف عرض المنيو. جدّد الاشتراك من حساب المالك.";
  }
  return "يتطلب اشتراكاً نشطاً لعرض المنيو على هذه الشاشة. تواصل مع إدارة المنشأة لإتمام الدفع.";
}

export function KioskSubscriptionBlocked({ code, check, registrationStatus }: Props) {
  const checking = registrationStatus === "checking";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gradient-hero text-primary-foreground"
      dir="rtl"
    >
      {checking ? (
        <Loader2 className="w-12 h-12 animate-spin text-accent mb-6" aria-hidden />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-accent/25 flex items-center justify-center mb-6">
          <CreditCard className="w-8 h-8 text-accent" aria-hidden />
        </div>
      )}

      <h1 className="font-display font-black text-2xl md:text-3xl mb-3">
        {checking ? "جاري التحقق من الاشتراك" : titleFor(check, checking)}
      </h1>
      <p className="text-primary-foreground/80 max-w-md mb-6">{checking ? "يرجى الانتظار…" : bodyFor(check)}</p>

      <div className="font-mono text-sm tracking-widest opacity-70" dir="ltr">
        {code}
      </div>
    </div>
  );
}
