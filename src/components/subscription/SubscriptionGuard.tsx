import type { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";

type Props = {
  children: ReactNode;
  requireEdit?: boolean;
  requireAddDevices?: boolean;
};

/**
 * حماية واجهة لوحة التحكم — القرار الحقيقي على الخادم (RPC/RLS).
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

  if (requireEdit && !access.dashboard_edit_allowed) {
    return (
      <div>
        <SubscriptionBanner access={access} />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">
            التعديل غير متاح في حالة «{access.status}». تواصل مع فريق ميز لتفعيل الاشتراك.
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
