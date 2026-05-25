import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Riyal } from "@/components/Brand";
import { BILLING, cycleLabel, priceForScreens, type BillingCycle } from "@/config/billing";
import type { SubscriptionAccess } from "@/types/subscription";
import { billingPayUrl } from "@/services/billing/checkout.service";

type Props = {
  access: SubscriptionAccess;
};

export function UpgradeCheckoutPanel({ access }: Props) {
  const navigate = useNavigate();
  const isTrial = access.status === "trial";
  const minScreens = isTrial ? 1 : Math.max(1, access.active_device_count);
  const initialScreens = isTrial ? 1 : Math.max(access.screen_count, access.active_device_count, 1);

  const [screens, setScreens] = useState(initialScreens);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const total = useMemo(() => priceForScreens(screens, cycle), [screens, cycle]);
  const perScreen = cycle === "yearly" ? BILLING.pricePerScreenYearly : BILLING.pricePerScreenMonthly;
  const yearlySave =
    cycle === "yearly" ? screens * BILLING.pricePerScreenMonthly * 12 - total : 0;

  const bump = (delta: number) => {
    setScreens((s) =>
      Math.min(BILLING.maxPaidScreens, Math.max(minScreens, s + delta)),
    );
  };

  const goToPayment = () => {
    navigate(billingPayUrl(screens, cycle));
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-accent" aria-hidden />
        <h3 className="font-display font-bold text-xl text-primary">
          {isTrial ? "فعّل الاشتراك" : "ترقية الباقة"}
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="text-sm font-semibold text-primary mb-3">عدد الشاشات</div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => bump(-1)}
              disabled={screens <= minScreens}
              aria-label="تقليل الشاشات"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center font-display font-black text-4xl text-primary">
              {screens}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => bump(1)}
              disabled={screens >= BILLING.maxPaidScreens}
              aria-label="زيادة الشاشات"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {perScreen} <Riyal /> / شاشة / {cycle === "yearly" ? "سنة" : "شهر"}
            {access.active_device_count > 0 && !isTrial && (
              <> — لديك {access.active_device_count} جهازاً مفعّلاً</>
            )}
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold text-primary mb-3">دورة الفوترة</div>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  cycle === c
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <div className="font-bold text-primary">{cycleLabel(c)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c === "yearly" ? `${BILLING.pricePerScreenYearly} ر.س / شاشة` : `${BILLING.pricePerScreenMonthly} ر.س / شاشة`}
                </div>
              </button>
            ))}
          </div>
          {yearlySave > 0 && (
            <p className="text-xs text-accent font-semibold mt-2">
              وفّر {yearlySave} ر.س سنوياً مقارنة بالدفع الشهري
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border">
        <div>
          <div className="text-sm text-muted-foreground">الإجمالي</div>
          <div className="font-display font-black text-3xl text-primary">
            {total} <Riyal />
          </div>
        </div>
        <Button variant="hero" size="lg" onClick={goToPayment}>
          {isTrial ? "متابعة للدفع" : "متابعة للدفع والترقية"}
        </Button>
      </div>
    </div>
  );
}
