import { useEffect, useState } from "react";
import { Logo } from "@/components/Brand";
import { getPublicSiteHref, getPublicSiteLabel } from "@/config/env";

type Props = {
  code: string;
};

/**
 * شاشة تطبيق ميز: انترو → رمز التفعيل فقط (التحديث صامت في الخلفية).
 */
export function PairScreen({ code }: Props) {
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
        className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-center p-8 text-primary-foreground safe-top safe-bottom"
        dir="rtl"
      >
        <Logo className="h-24 md:h-32 w-auto aspect-[1031/736] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-center p-6 md:p-10 text-primary-foreground safe-top safe-bottom"
      dir="rtl"
    >
      <div className="w-full max-w-lg text-center">
        <Logo className="h-14 md:h-16 w-auto aspect-[1031/736] mx-auto mb-8" />

        <p className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-3">رمز التفعيل</p>
        <div className="font-mono font-black text-5xl md:text-7xl tracking-[0.25em] mb-8" dir="ltr">
          {code}
        </div>

        <p className="text-sm opacity-70 max-w-sm mx-auto mb-8">
          فعّل هذا الرمز من لوحة التحكم → تطبيق الآيباد
        </p>

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
