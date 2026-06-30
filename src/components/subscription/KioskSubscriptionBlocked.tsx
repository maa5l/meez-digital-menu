import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KioskAccessCheck } from "@/types/subscription";
import { SUPPORT } from "@/config/support";

type Props = {
  code: string;
  check: KioskAccessCheck;
  registrationStatus?: "checking" | "not_registered" | "registered";
};

function titleFor(check: KioskAccessCheck, checking: boolean): string {
  if (checking) return "جاري التحقق…";
  if (!check.registered) return "الجهاز غير مفعّل";
  switch (check.reason) {
    case "device_inactive":
      return "الجهاز معطّل";
    case "subscription_suspended":
    case "subscription_expired":
    case "subscription_canceled":
      return "انتهى الاشتراك";
    default:
      return "الاشتراك غير نشط";
  }
}

function bodyFor(check: KioskAccessCheck): string {
  if (!check.registered) {
    return "فعّل هذا الرمز من لوحة التحكم ثم أعد فتح الصفحة.";
  }
  if (check.access?.status === "suspended") {
    return "تم إيقاف عرض المنيو. تواصل مع إدارة المنشأة.";
  }
  return "انتهت فترة التجربة أو الاشتراك. تواصل مع فريق ميز لتفعيل الحساب.";
}

export function KioskSubscriptionBlocked({ code, check, registrationStatus }: Props) {
  const checking = registrationStatus === "checking";
  const showContact = check.registered && !check.allowed;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gradient-hero text-primary-foreground"
      dir="rtl"
    >
      {checking ? (
        <Loader2 className="w-12 h-12 animate-spin text-accent mb-6" aria-hidden />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-accent/25 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-accent" aria-hidden />
        </div>
      )}

      <h1 className="font-display font-black text-2xl md:text-3xl mb-3">
        {checking ? "جاري التحقق من الاشتراك" : titleFor(check, checking)}
      </h1>
      <p className="text-primary-foreground/80 max-w-md mb-6">
        {checking ? "يرجى الانتظار…" : bodyFor(check)}
      </p>

      {showContact && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button asChild variant="secondary">
            <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer">
              {SUPPORT.whatsappLabel}
            </a>
          </Button>
          <Button asChild variant="outline" className="border-primary-foreground/30">
            <a href={SUPPORT.emailHref}>{SUPPORT.contactLabel}</a>
          </Button>
        </div>
      )}

      <div className="font-mono text-sm tracking-widest opacity-70" dir="ltr">
        {code}
      </div>
    </div>
  );
}
