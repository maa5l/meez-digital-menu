import { useEffect, useState } from "react";
import { Logo } from "@/components/Brand";
import { getPublicSiteHref, getPublicSiteLabel } from "@/config/ipad-trial";
import type { DeviceRegistrationStatus } from "@/services/device/activation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type Props = {
  code: string;
  registrationStatus?: DeviceRegistrationStatus;
  subtitle?: string;
  preview?: boolean;
};

/**
 * شاشة تجريبية لتطبيق الآيباد: شعار → رمز التفعيل → حالة التسجيل → رابط الموقع.
 */
export function IpadTrialScreen({
  code,
  registrationStatus = "checking",
  subtitle,
  preview = false,
}: Props) {
  const [showCode, setShowCode] = useState(false);
  const siteLabel = getPublicSiteLabel();
  const siteHref = getPublicSiteHref();

  useEffect(() => {
    const t = setTimeout(() => setShowCode(true), 900);
    return () => clearTimeout(t);
  }, []);

  const statusLabel =
    registrationStatus === "checking"
      ? "جاري التحقق من تسجيل الجهاز…"
      : registrationStatus === "registered"
        ? "الجهاز مسجّل — سيفتح المنيو قريباً"
        : "الجهاز غير مسجّل — فعّله من لوحة التحكم";

  const StatusIcon =
    registrationStatus === "checking"
      ? Loader2
      : registrationStatus === "registered"
        ? CheckCircle2
        : XCircle;

  if (!showCode) {
    return (
      <div
        className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-8 text-primary-foreground"
        dir="rtl"
      >
        <Logo className="h-24 md:h-32 w-auto aspect-[1031/736] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6 md:p-10 text-primary-foreground"
      dir="rtl"
    >
      <div className="w-full max-w-lg text-center">
        {preview && (
          <p className="text-xs font-bold mb-4 px-3 py-1.5 rounded-full bg-accent/25 text-accent inline-block">
            معاينة — لن يُفتح المنيو من هذه النافذة
          </p>
        )}

        <Logo className="h-14 md:h-16 w-auto aspect-[1031/736] mx-auto mb-8" />

        <p className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-3">
          رمز التفعيل
        </p>
        <div
          className="font-mono font-black text-5xl md:text-7xl tracking-[0.25em] mb-6"
          dir="ltr"
        >
          {code}
        </div>

        <div
          className={`inline-flex items-center gap-2 text-sm font-semibold mb-4 px-4 py-2 rounded-full ${
            registrationStatus === "registered"
              ? "bg-green-500/20 text-green-100"
              : registrationStatus === "not_registered"
                ? "bg-red-500/15 text-red-100"
                : "bg-white/10"
          }`}
        >
          <StatusIcon
            className={`w-4 h-4 shrink-0 ${
              registrationStatus === "checking" ? "animate-spin" : ""
            }`}
          />
          {statusLabel}
        </div>

        {subtitle && (
          <p className="text-sm opacity-75 mb-6 max-w-sm mx-auto">{subtitle}</p>
        )}

        {registrationStatus === "not_registered" && !preview && (
          <p className="text-xs opacity-50 mb-8">
            لوحة التحكم → تطبيق الآيباد → تفعيل الجهاز → أدخل الرمز أعلاه
          </p>
        )}

        <a
          href={siteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-lg md:text-xl font-semibold text-accent hover:underline underline-offset-4"
          dir="ltr"
        >
          {siteLabel}
        </a>
      </div>
    </div>
  );
}
