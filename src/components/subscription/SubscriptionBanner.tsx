import { Link } from "react-router-dom";
import { AlertTriangle, Clock, CreditCard, Ban } from "lucide-react";
import type { SubscriptionAccess } from "@/types/subscription";
import { ROUTES } from "@/config/app";
import { Button } from "@/components/ui/button";

type Props = {
  access: SubscriptionAccess;
};

function messageFor(access: SubscriptionAccess): { title: string; body: string; icon: typeof AlertTriangle } {
  switch (access.banner) {
    case "trial":
      return {
        icon: Clock,
        title: "فترة تجريبية",
        body: access.trial_ends_at
          ? `تنتهي التجربة في ${new Date(access.trial_ends_at).toLocaleDateString("ar-SA")}. فعّل الاشتراك للاستمرار.`
          : "أنت على الباقة التجريبية.",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        title: "دفع متأخر",
        body: "يرجى تحديث طريقة الدفع. بعض الصلاحيات محدودة حتى السداد.",
      };
    case "grace":
      return {
        icon: Clock,
        title: "فترة سماح",
        body: access.grace_ends_at
          ? `المنيو يعمل حتى ${new Date(access.grace_ends_at).toLocaleDateString("ar-SA")}. التعديلات والأجهزة الجديدة موقوفة.`
          : "فترة سماح — أكمل الدفع لتجنب إيقاف الشاشات.",
      };
    case "suspended":
      return {
        icon: Ban,
        title: "الاشتراك موقوف",
        body: "شاشات المنيو متوقفة. جدّد الاشتراك لإعادة التفعيل.",
      };
    case "expired":
    case "canceled":
      return {
        icon: Ban,
        title: access.status === "canceled" ? "اشتراك ملغى" : "انتهى الاشتراك",
        body: "الوصول محدود. جدّد الاشتراك لمتابعة استخدام المنصة.",
      };
    default:
      return { icon: CreditCard, title: "", body: "" };
  }
}

export function SubscriptionBanner({ access }: Props) {
  if (!access.banner || access.banner === "trial") return null;

  const { title, body, icon: Icon } = messageFor(access);
  const isError = ["suspended", "expired", "canceled"].includes(access.status);

  return (
    <div
      className={`rounded-2xl border p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
        isError
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-accent/40 bg-accent/10 text-primary"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3 flex-1">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
        <div>
          <div className="font-display font-bold">{title}</div>
          <p className="text-sm opacity-90 mt-0.5">{body}</p>
        </div>
      </div>
      <Link to={ROUTES.dashboardSubscription} className="shrink-0">
        <Button variant={isError ? "destructive" : "default"} size="sm">
          إدارة الاشتراك
        </Button>
      </Link>
    </div>
  );
}
