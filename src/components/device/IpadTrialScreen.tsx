import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Brand";
import { getPublicSiteHref, getPublicSiteLabel } from "@/config/ipad-trial";
import { ROUTES } from "@/config/app";

type Props = {
  code: string;
  subtitle?: string;
  preview?: boolean;
};

/**
 * شاشة الآيباد: شعار → رمز التفعيل (التحديث صامت في الخلفية).
 */
export function IpadTrialScreen({ code, subtitle, preview = false }: Props) {
  const [showCode, setShowCode] = useState(false);
  const siteLabel = getPublicSiteLabel();
  const siteHref = getPublicSiteHref();

  useEffect(() => {
    const t = setTimeout(() => setShowCode(true), 900);
    return () => clearTimeout(t);
  }, []);

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
            معاينة شاشة التفعيل
          </p>
        )}

        <Logo className="h-14 md:h-16 w-auto aspect-[1031/736] mx-auto mb-8" />

        <p className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-3">رمز التفعيل</p>
        <div className="font-mono font-black text-5xl md:text-7xl tracking-[0.25em] mb-8" dir="ltr">
          {code}
        </div>

        {subtitle && (
          <p className="text-sm opacity-75 mb-4 max-w-sm mx-auto">{subtitle}</p>
        )}

        {!preview ? (
          <p className="text-xs opacity-50 max-w-sm mx-auto mb-8">
            لوحة التحكم → تطبيق الآيباد → تفعيل الجهاز → أدخل الرمز أعلاه
          </p>
        ) : (
          <Link
            to={`${ROUTES.menu}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-8 text-sm font-bold text-accent hover:underline underline-offset-4"
          >
            معاينة المنيو ←
          </Link>
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
