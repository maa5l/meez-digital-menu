import { Clock, MonitorSmartphone } from "lucide-react";
import type { SubscriptionAccess } from "@/types/subscription";
import { SUBSCRIPTION } from "@/config/subscription";

type Props = {
  access: SubscriptionAccess;
};

/** إشعار التجربة — يُعرض في صفحة الاشتراك فقط */
export function TrialNoticeCard({ access }: Props) {
  if (access.status !== "trial") return null;

  const daysLeft =
    access.trial_ends_at != null
      ? Math.max(0, Math.ceil((Date.parse(access.trial_ends_at) - Date.now()) / 86400000))
      : SUBSCRIPTION.trialDays;

  return (
    <div
      className="rounded-2xl border border-accent/50 bg-gradient-to-l from-accent/15 to-accent/5 p-6 mb-8"
      role="status"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-accent/25 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-accent" aria-hidden />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-primary mb-1">
              فترة تجريبية مجانية
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {access.trial_ends_at ? (
                <>
                  تنتهي التجربة خلال{" "}
                  <span className="font-bold text-primary">{daysLeft} يوم</span>
                  {" "}(حتى{" "}
                  {new Date(access.trial_ends_at).toLocaleDateString("ar-SA")}).
                </>
              ) : (
                <>لديك {SUBSCRIPTION.trialDays} أيام لتجربة المنصة.</>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-accent shrink-0" aria-hidden />
              <span>
                التجربة تشمل <strong className="text-primary">شاشة واحدة فقط</strong>.
                بعد انتهائها تواصل معنا لتفعيل الاشتراك.
              </span>
            </p>
          </div>
        </div>
        <div className="text-center sm:text-left shrink-0 px-4 py-3 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-foreground mb-0.5">الشاشات في التجربة</div>
          <div className="font-display font-black text-3xl text-accent">1</div>
        </div>
      </div>
    </div>
  );
}
