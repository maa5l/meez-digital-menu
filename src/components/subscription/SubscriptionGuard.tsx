import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { ROUTES } from "@/config/app";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";

type Props = {
  children: ReactNode;
  /** يتطلب صلاحية تعديل (منتجات، أجهزة، ثيم…) */
  requireEdit?: boolean;
  /** يتطلب إمكانية إضافة أجهزة */
  requireAddDevices?: boolean;
};

/**
 * حماية واجهة لوحة التحكم — القرار الحقيقي على الخادم (RPC/RLS).
 * هذا المكوّن للـ UX فقط.
 */
export function SubscriptionGuard({
  children,
  requireEdit = false,
  requireAddDevices = false,
}: Props) {
  const { access, loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!access.allowed && !["trial", "past_due", "grace_period"].includes(access.status)) {
    return <Navigate to={ROUTES.dashboardSubscription} replace />;
  }

  if (requireEdit && !access.dashboard_edit_allowed) {
    return (
      <div>
        <SubscriptionBanner access={access} />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">
            التعديل غير متاح في حالة «{access.status}». جدّد الاشتراك من صفحة الاشتراك.
          </p>
        </div>
      </div>
    );
  }

  if (requireAddDevices && !access.can_add_devices) {
    return (
      <div>
        <SubscriptionBanner access={access} />
        {children}
      </div>
    );
  }

  return (
    <>
      <SubscriptionBanner access={access} />
      {children}
    </>
  );
}
