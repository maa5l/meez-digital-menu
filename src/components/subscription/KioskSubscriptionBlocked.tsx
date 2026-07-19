import { useEffect } from "react";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import { postKioskReady } from "@/lib/kiosk-bridge";
import { errorFromKioskReason } from "@/lib/user-facing-errors";
import type { KioskAccessCheck } from "@/types/subscription";
import { SUPPORT } from "@/config/support";
import { Button } from "@/components/ui/button";

type Props = {
  code: string;
  check: KioskAccessCheck;
  registrationStatus?: "checking" | "not_registered" | "registered";
  kioskMode?: boolean;
};

export function KioskSubscriptionBlocked({
  code,
  check,
  registrationStatus,
  kioskMode = false,
}: Props) {
  const checking = registrationStatus === "checking";
  const showContact = check.registered && !check.allowed && !kioskMode;
  const error = checking
    ? errorFromKioskReason("checking", "جاري التحقق من حالة الجهاز...")
    : errorFromKioskReason(check.reason, check.access?.message);

  useEffect(() => {
    if (!kioskMode) return;
    const id = requestAnimationFrame(() => postKioskReady({ empty: false }));
    return () => cancelAnimationFrame(id);
  }, [kioskMode, checking, check.registered, check.allowed]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gradient-hero text-primary-foreground"
      dir="rtl"
    >
      <UserErrorPanel
        error={{
          ...error,
          title: checking ? "جاري التحقق من الاشتراك" : error.title,
          message: checking ? "يرجى الانتظار…" : error.message,
          autoRetry: checking || error.autoRetry,
        }}
        loading={checking}
        className="text-primary-foreground"
      />

      {showContact && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
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

      <div className="mt-6 font-mono text-sm tracking-widest opacity-70" dir="ltr">
        {code}
      </div>
    </div>
  );
}
