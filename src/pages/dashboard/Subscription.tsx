import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialNoticeCard } from "@/components/subscription/TrialNoticeCard";
import { UpgradeCheckoutPanel } from "@/components/subscription/UpgradeCheckoutPanel";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Calendar, Receipt, MonitorSmartphone } from "lucide-react";
import { Riyal } from "@/components/Brand";
import { BILLING, cycleLabel } from "@/config/billing";
import { billingPayUrl } from "@/services/billing/checkout.service";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Subscription = () => {
  const [params, setParams] = useSearchParams();
  const { subscription, access, loading, refresh } = useSubscription();

  useEffect(() => {
    if (params.get("payment") === "return") {
      toast.success("شكراً — جاري تحديث حالة الاشتراك");
      void refresh();
      setParams({}, { replace: true });
    }
  }, [params, refresh, setParams]);

  const isTrial = access.status === "trial";
  const isActive = access.status === "active";
  const perScreen =
    subscription?.billing_cycle === "yearly"
      ? BILLING.pricePerScreenYearly
      : BILLING.pricePerScreenMonthly;
  const total = access.screen_count * perScreen;
  const invoices: { id: string; date: string; amount: number; status: string }[] = [];

  const planLabel = isTrial
    ? "تجربة مجانية"
    : isActive
      ? `باقة ${cycleLabel(subscription?.billing_cycle ?? "monthly")}`
      : access.status === "grace_period"
        ? "فترة سماح"
        : access.status === "past_due"
          ? "دفع متأخر"
          : "غير نشط";

  return (
    <DashboardLayout
      title="الاشتراك"
      subtitle="إدارة باقتك، الترقية والفواتير"
      hideSubscriptionBanner
    >
      <TrialNoticeCard access={access} />

      {!isTrial && access.banner && <SubscriptionBanner access={access} />}

      {loading ? (
        <div className="py-16 flex justify-center" aria-busy="true">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gradient-hero rounded-3xl p-8 text-primary-foreground relative overflow-hidden">
              <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <div className="text-primary-foreground/70 text-sm mb-1">باقتك الحالية</div>
                <h2 className="font-display font-black text-3xl mb-6">{planLabel}</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                  <div>
                    <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />{" "}
                      {isTrial ? "بعد التفعيل" : "الإجمالي"}
                    </div>
                    <div className="font-display font-black text-3xl text-gradient-gold">
                      {isTrial ? (
                        <>
                          {BILLING.pricePerScreenMonthly}{" "}
                          <span className="text-base text-primary-foreground/60">
                            <Riyal /> / شاشة
                          </span>
                        </>
                      ) : (
                        <>
                          {total}{" "}
                          <span className="text-base text-primary-foreground/60">
                            <Riyal />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1">
                      <MonitorSmartphone className="w-3 h-3" /> الشاشات المرخصة
                    </div>
                    <div className="font-display font-black text-3xl">
                      {access.active_device_count}/{access.screen_count}
                    </div>
                    {isTrial && (
                      <div className="text-xs text-primary-foreground/60 mt-1">حد التجربة: شاشة واحدة</div>
                    )}
                  </div>
                  <div>
                    <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {isTrial ? "نهاية التجربة" : "التجديد القادم"}
                    </div>
                    <div className="font-display font-bold text-lg">
                      {isTrial && access.trial_ends_at
                        ? new Date(access.trial_ends_at).toLocaleDateString("ar-SA")
                        : subscription?.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString("ar-SA")
                          : "—"}
                    </div>
                  </div>
                </div>

                {(isActive || access.status === "past_due" || access.status === "grace_period") && (
                  <div className="flex gap-3 flex-wrap">
                    <Button variant="heroOutline" className="text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10" asChild>
                      <Link
                        to={billingPayUrl(
                          Math.max(access.screen_count, access.active_device_count, 1),
                          subscription?.billing_cycle ?? "monthly",
                        )}
                      >
                        إدارة بطاقة الدفع
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-3xl p-6 border border-border">
              <h3 className="font-display font-bold text-lg text-primary mb-4">ما تحصل عليه</h3>
              <ul className="space-y-3">
                {[
                  "منتجات وتصنيفات لا محدودة",
                  "تحديث فوري على كل الشاشات",
                  "منيو منتجات ومحاصيل",
                  "دعم فني عربي",
                  isTrial ? "شاشة واحدة في التجربة" : "شاشات حسب اشتراكك",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-accent" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <UpgradeCheckoutPanel access={access} />
          </div>

          <div className="bg-card rounded-3xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-center gap-2">
              <Receipt className="w-5 h-5 text-accent" />
              <h3 className="font-display font-bold text-lg text-primary">الفواتير السابقة</h3>
            </div>
            <div className="divide-y divide-border">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {isTrial
                    ? "لا توجد فواتير — أنت في فترة التجربة (شاشة واحدة)."
                    : "لا توجد فواتير بعد."}
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 px-6 flex items-center justify-between hover:bg-secondary/40 transition-colors"
                  >
                    <div>
                      <div className="font-display font-bold text-primary">{inv.id}</div>
                      <div className="text-xs text-muted-foreground">{inv.date}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-display font-black text-primary">
                        {inv.amount} <Riyal />
                      </span>
                      <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-700 text-xs font-bold">
                        {inv.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        تنزيل
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Subscription;
