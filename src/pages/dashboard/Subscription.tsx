import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialNoticeCard } from "@/components/subscription/TrialNoticeCard";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, MessageCircle, MonitorSmartphone } from "lucide-react";
import { SUPPORT } from "@/config/support";
import { SUBSCRIPTION } from "@/config/subscription";

const Subscription = () => {
  const { subscription, access, loading } = useSubscription();

  const isTrial = access.status === "trial";
  const isActive = access.status === "active";

  const planLabel = isTrial
    ? "تجربة مجانية"
    : isActive
      ? "اشتراك نشط"
      : "غير نشط";

  const endDate = isTrial
    ? access.trial_ends_at
    : access.subscription_ends_at ?? subscription?.subscription_ends_at;

  return (
    <DashboardLayout
      title="الاشتراك"
      subtitle="حالة حسابك ومدة الاشتراك"
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
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-hero rounded-3xl p-8 text-primary-foreground">
              <div className="text-primary-foreground/70 text-sm mb-1">باقتك الحالية</div>
              <h2 className="font-display font-black text-3xl mb-6">{planLabel}</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isTrial ? "نهاية التجربة" : "نهاية الاشتراك"}
                  </div>
                  <div className="font-display font-bold text-xl">
                    {endDate ? new Date(endDate).toLocaleDateString("ar-SA") : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1">
                    <MonitorSmartphone className="w-3 h-3" />
                    الشاشات المسموحة
                  </div>
                  <div className="font-display font-bold text-xl">
                    {access.active_device_count} / {access.screen_count}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8">
              <h3 className="font-display font-bold text-xl mb-3">تفعيل الاشتراك</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                بعد انتهاء التجربة ({SUBSCRIPTION.trialDays} أيام)، تواصل مع فريق ميز لإتمام
                الدفع وتفعيل حسابك يدوياً من قبل الإدارة.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 ml-2" />
                    {SUPPORT.whatsappLabel}
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={SUPPORT.emailHref}>
                    <Mail className="w-4 h-4 ml-2" />
                    {SUPPORT.contactLabel}
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {subscription?.manual_activation && (
            <p className="text-sm text-muted-foreground text-center">
              تم تفعيل اشتراكك يدوياً من قبل إدارة ميز.
            </p>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Subscription;
