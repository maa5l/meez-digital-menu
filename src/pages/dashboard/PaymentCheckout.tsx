import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CardPaymentForm } from "@/components/billing/CardPaymentForm";
import { MoyasarCheckoutForm } from "@/components/billing/MoyasarCheckoutForm";
import { Button } from "@/components/ui/button";
import { Riyal } from "@/components/Brand";
import { BILLING, cycleLabel, priceForScreens, type BillingCycle } from "@/config/billing";
import { ROUTES } from "@/config/app";
import {
  confirmMockCardPayment,
  confirmMoyasarReturn,
  prepareCheckout,
  type CheckoutSession,
} from "@/services/billing/checkout.service";
import type { CardPaymentInput } from "@/validations/payment.schema";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

function parseCycle(raw: string | null): BillingCycle {
  return raw === "yearly" ? "yearly" : "monthly";
}

const PaymentCheckout = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const screens = Math.min(
    BILLING.maxPaidScreens,
    Math.max(1, Number(params.get("screens")) || 1),
  );
  const [cycle, setCycle] = useState<BillingCycle>(() => parseCycle(params.get("cycle")));

  const setCycleAndSyncUrl = (next: BillingCycle) => {
    setCycle(next);
    setParams({ screens: String(screens), cycle: next }, { replace: true });
  };

  useEffect(() => {
    const fromUrl = parseCycle(params.get("cycle"));
    setCycle((current) => (current === fromUrl ? current : fromUrl));
  }, [params]);

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const amount = useMemo(() => priceForScreens(screens, cycle), [screens, cycle]);
  const yearlySave =
    cycle === "yearly" ? screens * BILLING.pricePerScreenMonthly * 12 - amount : 0;
  const perScreen =
    cycle === "yearly" ? BILLING.pricePerScreenYearly : BILLING.pricePerScreenMonthly;

  const loadCheckout = async () => {
    setLoadingSession(true);
    setLoadError(null);
    try {
      const prepared = await prepareCheckout(screens, cycle);
      if (!prepared.ok) {
        setLoadError(
          prepared.error === "payment_provider_not_configured"
            ? "بوابة الدفع غير مضبوطة على الخادم"
            : "تعذّر تحضير الدفع",
        );
        setSession(null);
        return;
      }
      setSession(prepared.session);
    } catch (err) {
      setLoadError(getErrorMessage(err));
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    void loadCheckout();
  }, [screens, cycle]);

  useEffect(() => {
    const paymentReturn = params.get("payment");
    const paymentId = params.get("id");
    if (paymentReturn !== "return" || !paymentId) return;

    let cancelled = false;
    setPaying(true);

    void confirmMoyasarReturn(paymentId, screens, cycle).then((result) => {
      if (cancelled) return;
      setPaying(false);
      if (result.ok) {
        toast.success("تم الدفع وتفعيل الاشتراك");
        navigate(ROUTES.dashboardSubscription, { replace: true });
      } else {
        toast.error("تعذّر تأكيد الدفع");
        setParams({ screens: String(screens), cycle }, { replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params, screens, cycle, navigate, setParams]);

  const onMockPay = async (card: CardPaymentInput) => {
    setPaying(true);
    try {
      const result = await confirmMockCardPayment(screens, cycle, card);
      if (!result.ok) {
        toast.error("فشل الدفع");
        return;
      }
      toast.success("تم الدفع وتفعيل الاشتراك");
      navigate(ROUTES.dashboardSubscription, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  if (!params.get("screens")) {
    return <Navigate to={ROUTES.dashboardSubscription} replace />;
  }

  return (
    <DashboardLayout
      title="الدفع الآمن"
      subtitle="أدخل بيانات البطاقة لإتمام الاشتراك"
      hideSubscriptionBanner
    >
      <div className="max-w-2xl mx-auto">
        <Link
          to={ROUTES.dashboardSubscription}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للاشتراك
        </Link>

        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-soft">
          <div className="bg-gradient-hero text-primary-foreground p-6 md:p-8">
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
              <ShieldCheck className="w-4 h-4" aria-hidden />
              دفع مشفّر
            </div>
            <h2 className="font-display font-black text-2xl mb-4">ملخص الطلب</h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <div className="text-primary-foreground/60">عدد الشاشات</div>
                <div className="font-display font-black text-2xl">{screens}</div>
              </div>
              <div>
                <div className="text-primary-foreground/60 mb-1">السعر لكل شاشة</div>
                <div className="font-display font-bold text-lg">
                  {perScreen} <Riyal />
                  <span className="text-sm font-normal opacity-70">
                    /{cycle === "yearly" ? "سنة" : "شهر"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-primary-foreground/60 text-sm mb-2">دورة الفوترة</div>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "yearly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={loadingSession || paying}
                    onClick={() => setCycleAndSyncUrl(c)}
                    className={`p-3 rounded-xl border-2 text-right transition-all ${
                      cycle === c
                        ? "border-accent bg-accent/25 text-primary-foreground"
                        : "border-primary-foreground/25 hover:border-accent/50 text-primary-foreground/90"
                    }`}
                  >
                    <div className="font-display font-bold">{cycleLabel(c)}</div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {c === "yearly"
                        ? `${BILLING.pricePerScreenYearly} ر.س / شاشة`
                        : `${BILLING.pricePerScreenMonthly} ر.س / شاشة`}
                    </div>
                  </button>
                ))}
              </div>
              {yearlySave > 0 && cycle === "yearly" && (
                <p className="text-xs text-accent mt-2 font-semibold">
                  وفّر {yearlySave} ر.س سنوياً مقارنة بالدفع الشهري
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-primary-foreground/20 flex justify-between items-end">
              <span className="text-primary-foreground/80">المبلغ الإجمالي</span>
              <span className="font-display font-black text-3xl text-gradient-gold">
                {amount} <Riyal />
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {loadingSession ? (
              <div className="py-16 flex justify-center" aria-busy="true">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : session?.mode === "moyasar" ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  أدخل بيانات البطاقة في النموذج الآمن أدناه (مدى / فيزا / ماستركارد).
                </p>
                <MoyasarCheckoutForm session={session} />
              </>
            ) : session?.mode === "mock" ? (
              <>
                {session.offline && (
                  <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-primary">
                    الخادم غير متصل — يمكنك إتمام الدفع عبر Supabase مباشرة. للتطوير الكامل شغّل{" "}
                    <code className="text-xs bg-secondary px-1 rounded">npm run dev</code> داخل مجلد{" "}
                    <code className="text-xs bg-secondary px-1 rounded">server</code> واضبط{" "}
                    <code className="text-xs bg-secondary px-1 rounded">VITE_API_BASE_URL=http://localhost:3001/api/v1</code>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-4">
                  أدخل بيانات البطاقة (وضع تجريبي — 16 رقم، مثال: 4111 1111 1111 1111).
                </p>
                <CardPaymentForm
                  amountLabel={`${amount} ر.س`}
                  loading={paying}
                  onSubmit={onMockPay}
                />
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  {loadError ?? "تعذّر تحميل نموذج الدفع"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="hero" onClick={() => void loadCheckout()}>
                    إعادة المحاولة
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={ROUTES.dashboardSubscription}>رجوع</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentCheckout;
